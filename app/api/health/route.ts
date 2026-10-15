import { NextResponse } from "next/server";
import { GEMINI_MODEL } from "@/lib/config";

export const runtime = "nodejs";

export async function GET() {
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);

  return NextResponse.json({
    status: "healthy",
    aiConfigured: hasGeminiKey,
    model: GEMINI_MODEL,
  });
}
