import { describe, expect, it } from "vitest";
import { scanResidualSensitiveData } from "@/lib/privacy-scan";

describe("outgoing-text privacy scan", () => {
  it("reports common identifiers by category without returning matched values", () => {
    const findings = scanResidualSensitiveData(
      "Email me at test.person@example.com, PAN ABCDE1234F, or call 9876543210."
    );

    expect(findings).toEqual([
      { category: "Email address", count: 1 },
      { category: "PAN-like identifier", count: 1 },
      { category: "Phone number", count: 1 },
    ]);
    expect(JSON.stringify(findings)).not.toContain("test.person@example.com");
    expect(JSON.stringify(findings)).not.toContain("ABCDE1234F");
    expect(JSON.stringify(findings)).not.toContain("9876543210");
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

  it("returns an empty list for empty input", () => {
    expect(scanResidualSensitiveData("")).toEqual([]);
  });
});
