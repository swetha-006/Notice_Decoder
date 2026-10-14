import { describe, it, expect } from "vitest";
import { checkRateLimit } from "@/lib/rate-limit";
import { AnalyzeRequestSchema, AnalysisResponseSchema } from "@/lib/schema";

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
});
