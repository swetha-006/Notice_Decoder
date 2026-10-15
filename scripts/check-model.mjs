import { readFileSync } from "node:fs";
import nextEnv from "@next/env";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const exampleEnv = readFileSync(new URL("../.env.example", import.meta.url), "utf8");
const groqModel = process.env.GROQ_MODEL?.trim() || readEnvValue(exampleEnv, "GROQ_MODEL");
const geminiModel =
  process.env.GEMINI_MODEL?.trim() || readEnvValue(exampleEnv, "GEMINI_MODEL");
const candidates = [];

if (process.env.GROQ_API_KEY?.trim() && groqModel) {
  candidates.push({
    provider: "groq",
    apiKey: process.env.GROQ_API_KEY.trim(),
    model: groqModel,
  });
}
if (process.env.GEMINI_API_KEY?.trim() && geminiModel) {
  candidates.push({
    provider: "gemini",
    apiKey: process.env.GEMINI_API_KEY.trim(),
    model: geminiModel,
  });
}

if (candidates.length === 0) {
  fail(
    process.env.GROQ_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim()
      ? "unknown"
      : "missing_key"
  );
} else {
  let lastFailure = "unknown";

  for (const candidate of candidates) {
    try {
      const result =
        candidate.provider === "groq"
          ? await requestGroq(candidate)
          : await requestGemini(candidate);
      if (result.ok !== true) throw new InvalidOutputError();
      console.log(`OK: ${candidate.provider}/${candidate.model} returned schema-valid JSON.`);
      process.exitCode = 0;
      break;
    } catch (error) {
      lastFailure = classifyFailure(error);
      if (candidate === candidates.at(-1)) fail(lastFailure);
    }
  }
}

async function requestGroq(candidate) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${candidate.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: candidate.model,
        messages: [
          { role: "system", content: 'Return only the JSON object {"ok":true}.' },
          { role: "user", content: 'Return exactly {"ok":true}.' },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "health_check",
            strict: true,
            schema: {
              type: "object",
              properties: { ok: { type: "boolean" } },
              required: ["ok"],
              additionalProperties: false,
            },
          },
        },
        temperature: 0,
      }),
      signal: controller.signal,
    });

    if (!response.ok) throw new ProviderRequestError(response.status);
    const payload = await response.json();
    return JSON.parse(payload?.choices?.[0]?.message?.content ?? "");
  } finally {
    clearTimeout(timeout);
  }
}

async function requestGemini(candidate) {
  const schema = {
    type: SchemaType.OBJECT,
    properties: { ok: { type: SchemaType.BOOLEAN } },
    required: ["ok"],
  };
  const model = new GoogleGenerativeAI(candidate.apiKey).getGenerativeModel({
    model: candidate.model,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema,
      temperature: 0,
    },
  });
  const result = await model.generateContent('Return exactly {"ok":true}.', {
    timeout: 20_000,
  });
  return JSON.parse(result.response.text());
}

function readEnvValue(contents, name) {
  return new RegExp(`^${name}=(.+)$`, "m").exec(contents)?.[1].trim();
}

function fail(reason) {
  console.error(`FAIL: ${reason}`);
  process.exitCode = 1;
}

function classifyFailure(error) {
  const status =
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
      ? error.status
      : undefined;
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  const name = error instanceof Error ? error.name.toLowerCase() : "";

  if (error instanceof InvalidOutputError || error instanceof SyntaxError) return "invalid_output";
  if (status === 401 || status === 403 || /invalid api key|unauthorized|permission denied/.test(message)) return "auth";
  if (status === 429 || /quota|resource exhausted|rate limit/.test(message)) return "quota";
  if (
    status === 404 ||
    /model.{0,40}(not found|unavailable|not supported)/.test(message)
  ) {
    return "model_unavailable";
  }
  if (status === 408 || status === 504 || name.includes("abort") || /timed? ?out|timeout|aborted/.test(message)) return "timeout";
  return "unknown";
}

class ProviderRequestError extends Error {
  constructor(status) {
    super("AI provider request failed.");
    this.status = status;
  }
}

class InvalidOutputError extends Error {}
