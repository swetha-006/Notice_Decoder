import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Gemini model configuration", () => {
  it("uses the current default primary model and no default fallbacks", async () => {
    vi.stubEnv("GEMINI_MODEL", "");
    vi.stubEnv("GEMINI_MODEL_FALLBACKS", "");
    vi.resetModules();

    const { GEMINI_MODEL, GEMINI_MODEL_FALLBACKS } = await import("@/lib/config");

    expect(GEMINI_MODEL).toBe("gemini-3.8-flash");
    expect(GEMINI_MODEL_FALLBACKS).toEqual([]);
  });

  it("trims, deduplicates, and excludes the primary from configured fallbacks", async () => {
    vi.stubEnv("GEMINI_MODEL", "primary-model");
    vi.stubEnv(
      "GEMINI_MODEL_FALLBACKS",
      " fallback-one , primary-model, fallback-one, fallback-two "
    );
    vi.resetModules();

    const { GEMINI_MODEL, GEMINI_MODEL_FALLBACKS } = await import("@/lib/config");

    expect(GEMINI_MODEL).toBe("primary-model");
    expect(GEMINI_MODEL_FALLBACKS).toEqual(["fallback-one", "fallback-two"]);
  });
});
