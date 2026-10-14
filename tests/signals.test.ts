import { describe, it, expect } from "vitest";
import { evaluateSignals } from "@/lib/signals";
import { checkDomainAuthenticity, levenshteinDistance } from "@/lib/official-domains";

describe("Rule-Based Fraud Signal Engine (lib/signals.ts)", () => {
  it("flags personal UPI IDs as critical payment fraud", () => {
    const text =
      "Government of India Income Tax Dept. Pay outstanding penalty to UPI ID: incometax-refund@okaxis immediately.";
    const result = evaluateSignals(text);

    expect(result.hasUpiOrCrypto).toBe(true);
    const upiFinding = result.findings.find((f) => f.category === "payment");
    expect(upiFinding).toBeDefined();
    expect(upiFinding?.severity).toBe("critical");
    expect(upiFinding?.quote).toContain("incometax-refund@okaxis");
  });

  it("flags cryptocurrency addresses as critical fraud", () => {
    const text =
      "To cancel the warrant, send 0.05 BTC to 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa within 24 hours.";
    const result = evaluateSignals(text);

    expect(result.hasUpiOrCrypto).toBe(true);
    const cryptoFinding = result.findings.find((f) => f.category === "payment");
    expect(cryptoFinding).toBeDefined();
    expect(cryptoFinding?.severity).toBe("critical");
    expect(cryptoFinding?.quote).toBe("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa");
  });

  it("detects coercive threat phrases like arrest warrant and account freeze", () => {
    const text =
      "Notice: Immediate warrant of arrest issued. Your bank account will be frozen.";
    const result = evaluateSignals(text);

    expect(result.hasUrgencyThreat).toBe(true);
    const threatFindings = result.findings.filter((f) => f.category === "threat");
    expect(threatFindings.length).toBeGreaterThanOrEqual(2);
    expect(threatFindings.some((f) => f.quote.toLowerCase().includes("arrest"))).toBe(true);
    expect(threatFindings.some((f) => f.quote.toLowerCase().includes("frozen"))).toBe(true);
  });

  it("identifies lookalike phishing domains via Levenshtein distance and hyphen checks", () => {
    const check1 = checkDomainAuthenticity("incometax-gov.in");
    expect(check1.isLookalike).toBe(true);
    expect(check1.matchedOfficial?.domain).toBe("incometax.gov.in");

    const text =
      "Visit the Income Tax Department portal at http://incometax-gov.in/pay to settle.";
    const result = evaluateSignals(text);
    expect(result.hasLookalikeDomain).toBe(true);
    const domainFinding = result.findings.find((f) => f.category === "domain" && f.severity === "critical");
    expect(domainFinding).toBeDefined();
    expect(domainFinding?.quote).toContain("incometax-gov.in");
  });

  it("flags URL shorteners used to mask destinations", () => {
    const text = "Parivahan E-Challan: Check fine details at https://bit.ly/echallan-pay";
    const result = evaluateSignals(text);

    const shortener = result.findings.find((f) => f.explanation.en.includes("shortener"));
    expect(shortener).toBeDefined();
    expect(shortener?.severity).toBe("warning");
  });

  it("recognizes legitimate official government portals with positive markers", () => {
    const text =
      "Login securely to the official e-filing portal at https://eportal.incometax.gov.in to view details.";
    const result = evaluateSignals(text);

    expect(result.hasValidGovDomain).toBe(true);
    const positiveFinding = result.findings.find((f) => f.severity === "positive");
    expect(positiveFinding).toBeDefined();
    expect(positiveFinding?.quote).toContain("eportal.incometax.gov.in");
  });

  it("flags sender mismatch when an official notice uses free consumer webmail", () => {
    const text =
      "Government of India, Department of Revenue. For queries email us at taxofficer.delhi@gmail.com.";
    const result = evaluateSignals(text);

    expect(result.hasSenderMismatch).toBe(true);
    const senderFinding = result.findings.find((f) => f.category === "sender");
    expect(senderFinding).toBeDefined();
    expect(senderFinding?.severity).toBe("critical");
    expect(senderFinding?.quote).toBe("taxofficer.delhi@gmail.com");
  });

  it("calculates Levenshtein distance accurately", () => {
    expect(levenshteinDistance("incometax", "incometax")).toBe(0);
    expect(levenshteinDistance("incometax", "incomtax")).toBe(1);
    expect(levenshteinDistance("parivahan", "parivahn")).toBe(1);
  });
});
