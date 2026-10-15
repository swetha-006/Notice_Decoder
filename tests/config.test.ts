import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("AI model configuration", () => {
  it("uses current default model names and no default Gemini fallbacks", async () => {
    vi.stubEnv("GEMINI_MODEL", "");
    vi.stubEnv("GEMINI_MODEL_FALLBACKS", "");
    vi.stubEnv("GROQ_MODEL", "");
    vi.resetModules();

    const { GEMINI_MODEL, GEMINI_MODEL_FALLBACKS, GROQ_MODEL } = await import(
      "@/lib/config"
    );

    expect(GEMINI_MODEL).toBe("gemini-3.8-flash");
    expect(GEMINI_MODEL_FALLBACKS).toEqual([]);
    expect(GROQ_MODEL).toBe("openai/gpt-oss-20b");
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

  it("uses the configured Groq model name", async () => {
    vi.stubEnv("GROQ_MODEL", "groq-test-model");
    vi.resetModules();

    const { GROQ_MODEL } = await import("@/lib/config");
    expect(GROQ_MODEL).toBe("groq-test-model");
  });
});
