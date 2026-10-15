import { describe, expect, it } from "vitest";
import { scanResidualSensitiveData } from "@/lib/privacy-scan";

describe("outgoing-text privacy scan", () => {
  it("reports common identifiers by category without returning matched values", () => {
    const findings = scanResidualSensitiveData(
      "Email test.person@example.com, PAN ABCDE1234F, IFSC SBIN0001234, phone 9876543210, Aadhaar 4521 8963 1245, ID 123456789012, Account No: 1234567890, PIN Code: 600001."
    );

    expect(findings).toEqual([
      { category: "Email address", count: 1 },
      { category: "PAN-like identifier", count: 1 },
      { category: "IFSC code", count: 1 },
      { category: "Phone number", count: 1 },
      { category: "Spaced 12-digit identifier", count: 1 },
      { category: "12-digit identifier", count: 1 },
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
