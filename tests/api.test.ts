import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { checkRateLimit } from "@/lib/rate-limit";
import { AnalyzeRequestSchema, AnalysisResponseSchema } from "@/lib/schema";
import { NextRequest } from "next/server";

const geminiMocks = vi.hoisted(() => ({
  generateContent: vi.fn(),
  getGenerativeModel: vi.fn(),
}));

vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: geminiMocks.getGenerativeModel,
  })),
  SchemaType: {
    OBJECT: "OBJECT",
    STRING: "STRING",
    NUMBER: "NUMBER",
    ARRAY: "ARRAY",
    BOOLEAN: "BOOLEAN",
  },
}));

let requestNumber = 0;

function validModelResponse() {
  return JSON.stringify({
    noticeType: "Tax notice",
    issuingAuthorityClaimed: "Income Tax Department",
    verdict: "suspicious",
    confidenceScore: 75,
    oneSentenceReason: { en: "Verify first.", ta: "முதலில் சரிபார்க்கவும்.", hi: "पहले पुष्टि करें।" },
    urgencyLevel: "medium",
    summary: {
      whatThisIs: { en: "A notice.", ta: "ஒரு அறிவிப்பு.", hi: "एक नोटिस।" },
      whatItDemands: { en: "Review.", ta: "பரிசீலனை.", hi: "समीक्षा।" },
      consequenceIfIgnored: { en: "Unknown.", ta: "தெரியாது.", hi: "अज्ञात।" },
    },
    flags: [],
    checklist: [],
    draftReply: { en: "Please verify.", ta: "சரிபார்க்கவும்.", hi: "कृपया पुष्टि करें।" },
  });
}

async function postAnalyze(
  text = "Please verify this notice.",
  ip = `192.0.2.${++requestNumber}`
) {
  const { POST } = await import("@/app/api/analyze/route");
  const request = new NextRequest("http://localhost/api/analyze", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify({ maskedText: text }),
  });
  return POST(request);
}

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("GEMINI_API_KEY", "test-key");
  vi.stubEnv("GEMINI_MODEL", "gemini-test-primary");
  vi.stubEnv("GEMINI_MODEL_FALLBACKS", "");
  geminiMocks.generateContent.mockReset();
  geminiMocks.getGenerativeModel.mockReset();
  geminiMocks.getGenerativeModel.mockImplementation(() => ({
    generateContent: geminiMocks.generateContent,
  }));
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("API Route Validation & Rate Limiting (lib/rate-limit.ts & lib/schema.ts)", () => {
  it("enforces rate limits per IP address and denies after threshold", () => {
    const testIp = "192.168.1.50";
    const limit = 5;

    // Make 5 permitted requests
    for (let i = 0; i < limit; i++) {
      const res = checkRateLimit(testIp, limit, 1000);
      expect(res.allowed).toBe(true);
      expect(res.remaining).toBe(limit - (i + 1));
    }

    // 6th request should be denied
    const denied = checkRateLimit(testIp, limit, 1000);
    expect(denied.allowed).toBe(false);
    expect(denied.remaining).toBe(0);
    expect(denied.resetInSeconds).toBeGreaterThan(0);
  });

  it("validates request length with AnalyzeRequestSchema", () => {
    // Too short (< 10 chars)
    const shortRes = AnalyzeRequestSchema.safeParse({ maskedText: "Short" });
    expect(shortRes.success).toBe(false);

    // Valid length
    const validRes = AnalyzeRequestSchema.safeParse({
      maskedText: "Dear [PERSON_1], your tax return requires verification.",
    });
    expect(validRes.success).toBe(true);

    // Too long (> 10,000 chars)
    const hugeText = "a".repeat(10001);
    const longRes = AnalyzeRequestSchema.safeParse({ maskedText: hugeText });
    expect(longRes.success).toBe(false);
  });

  it("validates complete AnalysisResponseSchema structure", () => {
    const validSample = {
      noticeType: "Income Tax Demand",
      issuingAuthorityClaimed: "Income Tax Department",
      verdict: "likely_scam",
      confidenceScore: 95,
      oneSentenceReason: {
        en: "Notice asks for UPI payment.",
        ta: "யுபிஐ பணம் கோருகிறது.",
        hi: "यूपीआई भुगतान मांगता है।",
      },
      urgencyLevel: "high",
      summary: {
        whatThisIs: { en: "A fake tax notice", ta: "போலி அறிவிப்பு", hi: "फर्जी नोटिस" },
        whatItDemands: { en: "Immediate payment", ta: "பணம்", hi: "भुगतान" },
        consequenceIfIgnored: { en: "None", ta: "இல்லை", hi: "कुछ नहीं" },
      },
      flags: [
        {
          quote: "pay to UPI ID: test@okaxis",
          category: "suspicious_demand",
          severity: "critical",
          explanation: { en: "Fake UPI", ta: "போலி யுபிஐ", hi: "फर्जी यूपीआई" },
        },
      ],
      checklist: [
        {
          step: 1,
          action: { en: "Check DIN online", ta: "டிஐஎன் சரிபார்க்கவும்", hi: "डीआईएन जांचें" },
          isOfficialChannel: true,
        },
      ],
      draftReply: {
        en: "To Officer, I am [PERSON_1]...",
        ta: "அதிகாரி அவர்களுக்கு, நான் [PERSON_1]...",
        hi: "सेवा में, मैं [PERSON_1]...",
      },
    };

    const res = AnalysisResponseSchema.safeParse(validSample);
    expect(res.success).toBe(true);
  });

  it("returns structured model output with source=model", async () => {
    geminiMocks.generateContent.mockResolvedValue({
      response: { text: () => validModelResponse() },
    });

    const response = await postAnalyze();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.source).toBe("model");
    expect(data.fallbackReason).toBeUndefined();
    expect(geminiMocks.getGenerativeModel).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gemini-test-primary",
        generationConfig: expect.objectContaining({
          responseMimeType: "application/json",
          responseSchema: expect.any(Object),
        }),
      })
    );
  });

  it("retries invalid JSON once and succeeds on the retry", async () => {
    geminiMocks.generateContent
      .mockResolvedValueOnce({ response: { text: () => "not json" } })
      .mockResolvedValueOnce({ response: { text: validModelResponse } });

    const response = await postAnalyze();
    const data = await response.json();

    expect(data.source).toBe("model");
    expect(geminiMocks.generateContent).toHaveBeenCalledTimes(2);
  });

  it("returns invalid_output after two invalid responses", async () => {
    geminiMocks.generateContent
      .mockResolvedValueOnce({ response: { text: () => "not json" } })
      .mockResolvedValueOnce({ response: { text: () => JSON.stringify({ verdict: "unknown" }) } });

    const response = await postAnalyze();
    const data = await response.json();

    expect(data.source).toBe("rules_only");
    expect(data.fallbackReason).toBe("invalid_output");
    expect(JSON.stringify(data)).not.toContain("not json");
  });

  it("tries configured fallback models only after a model-unavailable error", async () => {
    vi.stubEnv("GEMINI_MODEL_FALLBACKS", "gemini-test-fallback");
    geminiMocks.generateContent
      .mockRejectedValueOnce(Object.assign(new Error("model not found"), { status: 404 }))
      .mockResolvedValueOnce({ response: { text: validModelResponse } });

    const response = await postAnalyze();
    const data = await response.json();

    expect(data.source).toBe("model");
    expect(geminiMocks.getGenerativeModel.mock.calls.map(([options]) => options.model)).toEqual([
      "gemini-test-primary",
      "gemini-test-fallback",
    ]);
    expect(geminiMocks.generateContent).toHaveBeenCalledTimes(2);
  });

  it("classifies quota failures without returning provider error text", async () => {
    vi.stubEnv("GEMINI_MODEL_FALLBACKS", "gemini-should-not-run");
    geminiMocks.generateContent.mockRejectedValue(
      Object.assign(new Error("private quota diagnostic"), { status: 429 })
    );

    const response = await postAnalyze();
    const data = await response.json();

    expect(data.source).toBe("rules_only");
    expect(data.fallbackReason).toBe("quota");
    expect(JSON.stringify(data)).not.toContain("private quota diagnostic");
    expect(geminiMocks.getGenerativeModel).toHaveBeenCalledTimes(1);
  });

  it("classifies authentication failures without exposing provider details", async () => {
    geminiMocks.generateContent.mockRejectedValue(
      Object.assign(new Error("private API key diagnostic"), { status: 403 })
    );

    const response = await postAnalyze();
    const data = await response.json();

    expect(data.source).toBe("rules_only");
    expect(data.fallbackReason).toBe("auth");
    expect(JSON.stringify(data)).not.toContain("private API key diagnostic");
  });

  it("classifies request timeouts", async () => {
    geminiMocks.generateContent.mockRejectedValue(
      Object.assign(new Error("request timed out"), { name: "GoogleGenerativeAIAbortError" })
    );

    const response = await postAnalyze();
    const data = await response.json();

    expect(data.source).toBe("rules_only");
    expect(data.fallbackReason).toBe("timeout");
  });

  it("returns missing_key when no API key is configured", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");

    const response = await postAnalyze();
    const data = await response.json();

    expect(data.source).toBe("rules_only");
    expect(data.fallbackReason).toBe("missing_key");
    expect(geminiMocks.generateContent).not.toHaveBeenCalled();
  });

  it("reports only the health status, AI configuration, and configured model", async () => {
    const { GET } = await import("@/app/api/health/route");
    const response = await GET();

    expect(await response.json()).toEqual({
      status: "healthy",
      aiConfigured: true,
      model: "gemini-test-primary",
    });
  });

  it("rejects oversized input before calling Gemini", async () => {
    const response = await postAnalyze("x".repeat(10001));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/10,000/);
    expect(geminiMocks.generateContent).not.toHaveBeenCalled();
  });

  it("returns 429 for a rate-limited request without calling Gemini", async () => {
    const ip = "198.51.100.91";
    const { checkRateLimit: routeRateLimit } = await import("@/lib/rate-limit");
    for (let attempt = 0; attempt < 10; attempt += 1) {
      routeRateLimit(ip, 10, 60 * 1000);
    }

    const response = await postAnalyze("Please verify this notice.", ip);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toMatch(/Too many requests/);
    expect(geminiMocks.generateContent).not.toHaveBeenCalled();
  });
});
