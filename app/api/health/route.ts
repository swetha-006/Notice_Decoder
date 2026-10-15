import { NextResponse } from "next/server";
import { GEMINI_MODEL, GROQ_MODEL } from "@/lib/config";

export const runtime = "nodejs";

export async function GET() {
  const hasGroqKey = Boolean(process.env.GROQ_API_KEY?.trim());
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY?.trim());
  const provider = hasGroqKey ? "groq" : hasGeminiKey ? "gemini" : "rules_only";

  return NextResponse.json({
    status: "healthy",
    aiConfigured: hasGroqKey || hasGeminiKey,
    provider,
    model:
      provider === "groq"
        ? GROQ_MODEL
        : provider === "gemini"
        ? GEMINI_MODEL
        : null,
  });
}
