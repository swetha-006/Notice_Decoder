import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";

  return NextResponse.json(
    {
      status: "healthy",
      service: "Notice Check Verification Engine",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      aiEngine: {
        configured: hasGeminiKey,
        model,
        mode: hasGeminiKey ? "hybrid-model-rules" : "offline-rule-based-fallback",
      },
      privacyRedactor: "active-on-device",
    },
    { status: 200 }
  );
}
