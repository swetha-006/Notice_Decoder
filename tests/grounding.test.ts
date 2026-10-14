import { describe, it, expect } from "vitest";
import {
  findVerbatimQuote,
  groundModelFlags,
  mergeAndDeDuplicateFlags,
  computeTextSegments,
} from "@/lib/grounding";
import { SignalFinding } from "@/lib/signals";

describe("Evidence Grounding Module (lib/grounding.ts)", () => {
  const sampleNotice = `GOVERNMENT OF INDIA - INCOME TAX DEPARTMENT
Notice Ref: ITD/DEL/2026/894201

To, Shri Rajesh Kumar,
Outstanding arrears of Rs. 48,500/- are pending.
You are hereby commanded to settle this immediately within 24 hours.
Failure to comply will result in an immediate warrant of arrest.
Deposit to UPI ID: incometax-refund@okaxis immediately.`;

  it("finds exact verbatim quotes with exact indices", () => {
    const match = findVerbatimQuote(sampleNotice, "warrant of arrest");
    expect(match.found).toBe(true);
    expect(sampleNotice.slice(match.startIndex, match.endIndex)).toBe("warrant of arrest");
  });

  it("finds quotes even with normalized whitespace differences", () => {
    const quoteWithExtraSpaces = "settle   this   immediately\nwithin 24 hours";
    const match = findVerbatimQuote(sampleNotice, quoteWithExtraSpaces);

    expect(match.found).toBe(true);
    expect(match.exactMatch).toContain("settle this immediately within 24 hours");
  });

  it("DROPS hallucinated model flags that do not exist in the text", () => {
    const modelFlags = [
      {
        quote: "warrant of arrest",
        category: "threat",
        severity: "critical" as const,
        explanation: { en: "Threat of arrest", ta: "கைது", hi: "गिरफ्तारी" },
      },
      {
        quote: "your property will be auctioned at 10 AM tomorrow", // Hallucinated by model!
        category: "threat",
        severity: "critical" as const,
        explanation: { en: "Auction threat", ta: "ஏலம்", hi: "नीलामी" },
      },
    ];

    const grounded = groundModelFlags(modelFlags, sampleNotice);

    // Only 1 flag should survive; the hallucinated auction quote MUST be dropped
    expect(grounded.length).toBe(1);
    expect(grounded[0].quote).toBe("warrant of arrest");
    expect(grounded.some((f) => f.quote.includes("auctioned"))).toBe(false);
  });

  it("merges rule findings and model flags without overlapping duplicates", () => {
    const modelFlags = [
      {
        quote: "incometax-refund@okaxis",
        category: "payment",
        severity: "critical" as const,
        explanation: { en: "Model flag: Fake UPI", ta: "யுபிஐ", hi: "यूपीआई" },
      },
    ];

    const groundedModel = groundModelFlags(modelFlags, sampleNotice);

    const ruleFindings: SignalFinding[] = [
      {
        id: "rf-1",
        category: "payment",
        severity: "critical",
        quote: "incometax-refund@okaxis",
        explanation: { en: "Rule flag: Fake UPI", ta: "யுபிஐ", hi: "यूपीआई" },
      },
      {
        id: "rf-2",
        category: "threat",
        severity: "warning",
        quote: "within 24 hours",
        explanation: { en: "Extreme deadline", ta: "அவசரம்", hi: "जल्दबाजी" },
      },
    ];

    const merged = mergeAndDeDuplicateFlags(groundedModel, ruleFindings, sampleNotice);

    // Should contain 2 flags total (the duplicate UPI flag merged)
    expect(merged.length).toBe(2);
    expect(merged.some((f) => f.quote === "incometax-refund@okaxis")).toBe(true);
    expect(merged.some((f) => f.quote === "within 24 hours")).toBe(true);
  });

  it("computes clean text segments covering the entire document", () => {
    const modelFlags = [
      {
        quote: "warrant of arrest",
        category: "threat",
        severity: "critical" as const,
        explanation: { en: "Arrest warrant", ta: "கைது", hi: "गिरफ्तारी" },
      },
    ];
    const grounded = groundModelFlags(modelFlags, sampleNotice);
    const segments = computeTextSegments(sampleNotice, grounded);

    // Segments concatenated should reconstruct full original text exactly
    const reconstructed = segments.map((s) => s.text).join("");
    expect(reconstructed).toBe(sampleNotice);

    // The highlighted segment has flag attached
    const highlightedSegment = segments.find((s) => s.flag !== undefined);
    expect(highlightedSegment?.text).toBe("warrant of arrest");
  });
});
