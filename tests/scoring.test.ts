import { describe, it, expect } from "vitest";
import { calculateVerdict } from "@/lib/scoring";
import { SignalEngineResult } from "@/lib/signals";
import { GroundedFlag } from "@/lib/grounding";

describe("Deterministic Composite Scoring Function (lib/scoring.ts)", () => {
  it("forces 'likely_scam' verdict and high urgency on UPI payment presence", () => {
    const mockSignals: SignalEngineResult = {
      findings: [],
      hasUpiOrCrypto: true,
      hasLookalikeDomain: false,
      hasUrgencyThreat: false,
      hasSenderMismatch: false,
      hasValidGovDomain: false,
      isGovNoticeClaim: true,
    };

    const result = calculateVerdict({
      ruleSignals: mockSignals,
      groundedFlags: [],
      modelVerdict: "likely_scam",
      modelConfidence: 85,
    });

    expect(result.verdict).toBe("likely_scam");
    expect(result.urgencyLevel).toBe("high");
    expect(result.score).toBeGreaterThanOrEqual(95);
    expect(result.breakdown.some((b) => b.factor.includes("UPI"))).toBe(true);
  });

  it("forces 'likely_scam' verdict on lookalike domain detection", () => {
    const mockSignals: SignalEngineResult = {
      findings: [],
      hasUpiOrCrypto: false,
      hasLookalikeDomain: true,
      hasUrgencyThreat: false,
      hasSenderMismatch: false,
      hasValidGovDomain: false,
      isGovNoticeClaim: true,
    };

    const result = calculateVerdict({
      ruleSignals: mockSignals,
      groundedFlags: [],
    });

    expect(result.verdict).toBe("likely_scam");
    expect(result.score).toBeGreaterThanOrEqual(95);
    expect(result.breakdown.some((b) => b.factor.includes("lookalike"))).toBe(true);
  });

  it("scores a notice with moderate anomalies as 'suspicious'", () => {
    const mockSignals: SignalEngineResult = {
      findings: [],
      hasUpiOrCrypto: false,
      hasLookalikeDomain: false,
      hasUrgencyThreat: false,
      hasSenderMismatch: false,
      hasValidGovDomain: false,
      isGovNoticeClaim: false,
    };

    const groundedFlags: GroundedFlag[] = [
      {
        id: "1",
        quote: "bit.ly/pay-tax",
        startIndex: 0,
        endIndex: 14,
        category: "domain",
        severity: "warning",
        source: "rule",
        explanation: { en: "URL shortener", ta: "சுருக்கி", hi: "शॉर्टनर" },
      },
      {
        id: "2",
        quote: "within 24 hours",
        startIndex: 20,
        endIndex: 35,
        category: "threat",
        severity: "warning",
        source: "rule",
        explanation: { en: "Urgency deadline", ta: "அவசரம்", hi: "जल्दबाजी" },
      },
    ];

    const result = calculateVerdict({
      ruleSignals: mockSignals,
      groundedFlags,
      modelVerdict: "suspicious",
      modelConfidence: 65,
    });

    expect(result.verdict).toBe("suspicious");
    expect(result.urgencyLevel).toBe("medium");
    expect(result.score).toBeGreaterThanOrEqual(30);
    expect(result.score).toBeLessThan(65);
  });

  it("awards low score and 'likely_genuine' verdict when notice matches official .gov.in domain", () => {
    const mockSignals: SignalEngineResult = {
      findings: [],
      hasUpiOrCrypto: false,
      hasLookalikeDomain: false,
      hasUrgencyThreat: false,
      hasSenderMismatch: false,
      hasValidGovDomain: true,
      isGovNoticeClaim: true,
    };

    const groundedFlags: GroundedFlag[] = [
      {
        id: "1",
        quote: "https://eportal.incometax.gov.in",
        startIndex: 0,
        endIndex: 32,
        category: "domain",
        severity: "positive",
        source: "rule",
        explanation: { en: "Official portal", ta: "அரசு தளம்", hi: "सरकारी पोर्टल" },
      },
    ];

    const result = calculateVerdict({
      ruleSignals: mockSignals,
      groundedFlags,
      modelVerdict: "likely_genuine",
      modelConfidence: 90,
    });

    expect(result.verdict).toBe("likely_genuine");
    expect(result.urgencyLevel).toBe("low");
    expect(result.score).toBeLessThan(30);
  });

  it("requires verification when rules-only analysis has no positive official evidence", () => {
    const result = calculateVerdict({
      ruleSignals: {
        findings: [],
        hasUpiOrCrypto: false,
        hasLookalikeDomain: false,
        hasUrgencyThreat: false,
        hasSenderMismatch: false,
        hasValidGovDomain: false,
        isGovNoticeClaim: false,
      },
      groundedFlags: [],
    });

    expect(result.verdict).toBe("suspicious");
    expect(result.urgencyLevel).toBe("medium");
    expect(result.verifyBeforeActing).toBe(true);
    expect(result.oneSentenceReason.en).toMatch(/cannot confirm this notice/i);
    expect(result.breakdown).toContainEqual(
      expect.objectContaining({
        factor: expect.stringContaining("No AI assessment"),
      })
    );
  });

  it("allows a rules-only genuine verdict when a verified official domain is present", () => {
    const result = calculateVerdict({
      ruleSignals: {
        findings: [],
        hasUpiOrCrypto: false,
        hasLookalikeDomain: false,
        hasUrgencyThreat: false,
        hasSenderMismatch: false,
        hasValidGovDomain: true,
        isGovNoticeClaim: true,
      },
      groundedFlags: [],
    });

    expect(result.verdict).toBe("likely_genuine");
    expect(result.verifyBeforeActing).toBe(true);
    expect(result.score).toBeLessThan(30);
  });
});
