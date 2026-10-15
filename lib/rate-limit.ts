/**
 * Simple in-memory token bucket rate limiter for API routes.
 * Requires zero external dependencies or cloud accounts.
 *
 * Defaults: 10 requests per 60 seconds per client identifier.
 */

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const ipStore = new Map<string, RateLimitRecord>();

export const DEFAULT_RATE_LIMIT = 10;
export const DEFAULT_RATE_LIMIT_WINDOW_MS = 60 * 1000;

type RateLimitEnv = {
  RATE_LIMIT_MAX_REQUESTS?: string;
  RATE_LIMIT_WINDOW_MS?: string;
};

export function rateLimitSettingsFromEnv(
  env: RateLimitEnv = {
    RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS,
    RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS,
  }
): { limit: number; windowMs: number } {
  return {
    limit: parsePositiveInteger(env.RATE_LIMIT_MAX_REQUESTS, DEFAULT_RATE_LIMIT),
    windowMs: parsePositiveInteger(
      env.RATE_LIMIT_WINDOW_MS,
      DEFAULT_RATE_LIMIT_WINDOW_MS
    ),
  };
}

export function getRateLimitIdentifier(headers: Pick<Headers, "get">): string {
  for (const headerName of [
    "x-vercel-forwarded-for",
    "x-real-ip",
    "x-forwarded-for",
  ]) {
    const firstAddress = headers
      .get(headerName)
      ?.split(",")
      .map((value) => value.trim())
      .find(Boolean);
    if (firstAddress) return `ip:${firstAddress}`;
  }

  const userAgent = headers.get("user-agent")?.trim();
  return userAgent ? `user-agent:${userAgent}` : `anonymous:${crypto.randomUUID()}`;
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!value || !/^\d+$/.test(value)) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

// Periodic cleanup of expired records every 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupExpired() {
  const now = Date.now();
  if (now - lastCleanup > CLEANUP_INTERVAL_MS) {
    for (const [ip, record] of ipStore.entries()) {
      if (now > record.resetTime) {
        ipStore.delete(ip);
      }
    }
    lastCleanup = now;
  }
}

export function checkRateLimit(
  identifier: string,
  limit: number = 10,
  windowMs: number = 60 * 1000
): { allowed: boolean; remaining: number; resetInSeconds: number } {
  cleanupExpired();

  const now = Date.now();
  const record = ipStore.get(identifier);

  if (!record || now > record.resetTime) {
    ipStore.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return {
      allowed: true,
      remaining: limit - 1,
      resetInSeconds: Math.ceil(windowMs / 1000),
    };
  }

  if (record.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetInSeconds: Math.max(1, Math.ceil((record.resetTime - now) / 1000)),
    };
  }

  record.count += 1;
  return {
    allowed: true,
    remaining: limit - record.count,
    resetInSeconds: Math.max(1, Math.ceil((record.resetTime - now) / 1000)),
  };
}
