import { readFileSync } from "node:fs";
import nextEnv from "@next/env";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const apiKey = process.env.GEMINI_API_KEY;
const exampleEnv = readFileSync(new URL("../.env.example", import.meta.url), "utf8");
const exampleModel = /^GEMINI_MODEL=(.+)$/m.exec(exampleEnv)?.[1].trim();
const modelName = process.env.GEMINI_MODEL?.trim() || exampleModel;

if (!apiKey) {
  fail("missing_key");
} else if (!modelName) {
  fail("unknown");
} else {
  const schema = {
    type: SchemaType.OBJECT,
    properties: { ok: { type: SchemaType.BOOLEAN } },
    required: ["ok"],
  };

  try {
    const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0,
      },
    });
    const result = await model.generateContent('Return exactly {"ok":true}.', {
      timeout: 20_000,
    });
    const response = JSON.parse(result.response.text());

    if (response.ok !== true) throw new InvalidOutputError();
    console.log(`OK: ${modelName} returned schema-valid JSON.`);
  } catch (error) {
    fail(classifyFailure(error));
  }
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

  if (error instanceof InvalidOutputError) return "invalid_output";
  if (status === 401 || status === 403 || /invalid api key|unauthorized|permission denied/.test(message)) return "auth";
  if (status === 429 || /quota|resource exhausted|rate limit/.test(message)) return "quota";
  if (status === 404 || /model.{0,40}(not found|unavailable|not supported)/.test(message)) return "model_unavailable";
  if (status === 408 || status === 504 || name.includes("abort") || /timed? ?out|timeout|aborted/.test(message)) return "timeout";
  return "unknown";
}

class InvalidOutputError extends Error {}
