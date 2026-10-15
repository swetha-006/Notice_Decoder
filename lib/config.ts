const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";
const DEFAULT_GROQ_MODEL = "openai/gpt-oss-20b";

export const GEMINI_MODEL =
  process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;

export const GEMINI_MODEL_FALLBACKS = [
  ...new Set(
    (process.env.GEMINI_MODEL_FALLBACKS ?? "")
      .split(",")
      .map((model) => model.trim())
      .filter((model) => model.length > 0 && model !== GEMINI_MODEL)
  ),
];

export const GROQ_MODEL =
  process.env.GROQ_MODEL?.trim() || DEFAULT_GROQ_MODEL;
