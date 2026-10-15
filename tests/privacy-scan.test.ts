import { describe, expect, it } from "vitest";
import { scanResidualSensitiveData } from "@/lib/privacy-scan";

describe("outgoing-text privacy scan", () => {
  it("reports common identifiers by category without returning matched values", () => {
    const findings = scanResidualSensitiveData(
      "Email test.person@example.com, PAN ABCDE1234F, IFSC SBIN0001234, phone 9876543210, Aadhaar 4521 8963 1245, Aadhaar: 123456789012, Account No: 1234567890, PIN Code: 600001."
    );

    expect(findings).toEqual([
      { category: "Email address", count: 1 },
      { category: "PAN-like identifier", count: 1 },
      { category: "IFSC code", count: 1 },
      { category: "Phone number", count: 1 },
      { category: "Aadhaar-style identifier", count: 2 },
      { category: "Account number near account label", count: 1 },
      { category: "Postal PIN near postal label", count: 1 },
    ]);
    expect(JSON.stringify(findings)).not.toContain("test.person@example.com");
    expect(JSON.stringify(findings)).not.toContain("ABCDE1234F");
    expect(JSON.stringify(findings)).not.toContain("SBIN0001234");
    expect(JSON.stringify(findings)).not.toContain("9876543210");
    expect(JSON.stringify(findings)).not.toContain("4521 8963 1245");
    expect(JSON.stringify(findings)).not.toContain("123456789012");
    expect(JSON.stringify(findings)).not.toContain("1234567890");
    expect(JSON.stringify(findings)).not.toContain("600001");
  });

  it("counts repeated findings and can be called repeatedly without stale regex state", () => {
    const text = "Call 9876543210 or 9876543211.";
    const expected = [{ category: "Phone number", count: 2 }];

    expect(scanResidualSensitiveData(text)).toEqual(expected);
    expect(scanResidualSensitiveData(text)).toEqual(expected);
  });

  it("detects grouped mobile and landline formats plus labeled residual names", () => {
    const findings = scanResidualSensitiveData(
      "Call +91 98765 43210 or 011-2345 6789. Dear Rajesh Kumar, please respond."
    );
    expect(findings).toEqual([
      { category: "Phone number", count: 2 },
      { category: "Name following a name label", count: 1 },
    ]);
    expect(JSON.stringify(findings)).not.toContain("Rajesh");
    expect(JSON.stringify(findings)).not.toContain("98765");
  });

  it("detects a capitalized name left after an address label", () => {
    expect(scanResidualSensitiveData("Address: Rajesh Kumar")).toEqual([
      { category: "Name following a name label", count: 1 },
    ]);
  });

  it("detects grouped account numbers and Aadhaar only with sufficient context", () => {
    const findings = scanResidualSensitiveData(
      "Account No: 1234 5678 9012; Aadhaar: 987654321098."
    );
    expect(findings).toEqual([
      { category: "Aadhaar-style identifier", count: 1 },
      { category: "Account number near account label", count: 1 },
    ]);
  });

  it("detects account numbers only when an account label provides context", () => {
    const findings = scanResidualSensitiveData(
      "Account No: 123456789012. Reference: 123456789012."
    );

    expect(findings).toContainEqual({
      category: "Account number near account label",
      count: 1,
    });
  });

  it("returns no findings for redacted identifiers and ordinary notice text", () => {
    expect(
      scanResidualSensitiveData(
        "Dear [PERSON_1], PAN [PAN_1], phone [PHONE_1], account [ACCOUNT_1]. Please verify notice DIN 2026/IT/123."
      )
    ).toEqual([]);
  });

  it("does not treat bare reference numbers, DINs, sections, amounts, or dates as Aadhaar", () => {
    expect(
      scanResidualSensitiveData(
        "Reference: 123456789012; Reference No: 1234 5678 9012; DIN 2026/IT/123; Section 143(1); Rs 45,000; issued 12/02/2026."
      )
    ).toEqual([]);
  });

  it("returns an empty list for empty input", () => {
    expect(scanResidualSensitiveData("")).toEqual([]);
  });
});
