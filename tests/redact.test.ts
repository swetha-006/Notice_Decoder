import { describe, it, expect } from "vitest";
import { redactNotice, rehydrate, manualMask } from "@/lib/redact";

describe("In-Browser Redaction Module (lib/redact.ts)", () => {
  it("masks Indian PAN card numbers correctly", () => {
    const notice = "Your PAN card ABCDE1234F has a tax demand of Rs 45,000.";
    const result = redactNotice(notice);

    expect(result.redactedText).toContain("[PAN_1]");
    expect(result.redactedText).not.toContain("ABCDE1234F");
    expect(result.tokenMap["[PAN_1]"]).toBe("ABCDE1234F");
    expect(result.counts.PAN).toBe(1);
  });

  it("masks Aadhaar-style 12-digit numbers with and without spaces", () => {
    const notice = "Aadhaar number: 4521 8963 1245 registered under your account.";
    const result = redactNotice(notice);

    expect(result.redactedText).toContain("[AADHAAR_1]");
    expect(result.redactedText).not.toContain("4521 8963 1245");
    expect(result.tokenMap["[AADHAAR_1]"]).toBe("4521 8963 1245");
  });

  it("masks email addresses and phone numbers", () => {
    const notice =
      "Contact the officer at rajesh.officer@gmail.com or call +91 9876543210 immediately.";
    const result = redactNotice(notice);

    expect(result.redactedText).toContain("[EMAIL_1]");
    expect(result.redactedText).toContain("[PHONE_1]");
    expect(result.redactedText).not.toContain("rajesh.officer@gmail.com");
    expect(result.redactedText).not.toContain("9876543210");
    expect(result.tokenMap["[EMAIL_1]"]).toBe("rajesh.officer@gmail.com");
  });

  it("masks grouped mobile and STD landline numbers", () => {
    const result = redactNotice(
      "Call +91 98765 43210 or the Delhi office at 011-2345 6789."
    );

    expect(result.redactedText).not.toContain("98765 43210");
    expect(result.redactedText).not.toContain("011-2345 6789");
    expect(result.counts.PHONE).toBe(2);
    expect(Object.values(result.tokenMap)).toContain("+91 98765 43210");
    expect(Object.values(result.tokenMap)).toContain("011-2345 6789");
  });

  it("masks names following formal salutations", () => {
    const notice = "Dear Vikramaditya Rao,\nThis is an urgent notice regarding your account.";
    const result = redactNotice(notice);

    expect(result.redactedText).toContain("Dear [PERSON_1]");
    expect(result.redactedText).not.toContain("Vikramaditya Rao");
    expect(result.tokenMap["[PERSON_1]"]).toBe("Vikramaditya Rao");
  });

  it("masks one-word and Tamil/Devanagari names after salutations and labels", () => {
    const result = redactNotice(
      "Dear Ravi,\nName of Assessee: ரமேஷ் குமார்\nश्रीमान अमित शर्मा\nName: Alice"
    );

    expect(result.redactedText).not.toContain("Ravi");
    expect(result.redactedText).not.toContain("ரமேஷ் குமார்");
    expect(result.redactedText).not.toContain("अमित शर्मा");
    expect(result.redactedText).not.toContain("Alice");
    expect(result.counts.PERSON).toBe(4);
  });

  it("does not mistake generic salutations for personal names", () => {
    expect(redactNotice("Dear Sir,\nPlease review the notice.").redactedText).toBe(
      "Dear Sir,\nPlease review the notice."
    );
  });

  it("masks a single-line address even when it has no comma-separated parts", () => {
    const result = redactNotice("Residential Address: 42 Lake Road");
    expect(result.redactedText).toBe("Residential Address: [ADDRESS_1]");
    expect(result.tokenMap["[ADDRESS_1]"]).toBe("42 Lake Road");
  });

  it("masks bank account numbers and IFSC codes", () => {
    const notice =
      "Transfer funds to Bank Account: 987654321098 with IFSC: SBIN0001234.";
    const result = redactNotice(notice);

    expect(result.redactedText).toContain("[ACCOUNT_1]");
    expect(result.redactedText).toContain("[IFSC_1]");
    expect(result.tokenMap["[ACCOUNT_1]"]).toBe("987654321098");
    expect(result.tokenMap["[IFSC_1]"]).toBe("SBIN0001234");
  });

  it("replaces only the matched account number while preserving surrounding text", () => {
    const result = redactNotice("Account No: 987654321098; reference 2026/123.");

    expect(result.redactedText).toBe(
      "Account No: [ACCOUNT_1]; reference 2026/123."
    );
  });

  it("masks grouped account numbers only when an account label supplies context", () => {
    const result = redactNotice(
      "Account No: 1234 5678 9012; reference 1234 5678 9012."
    );
    expect(result.redactedText).toBe(
      "Account No: [ACCOUNT_1]; reference 1234 5678 9012."
    );
  });

  it("requires context for ungrouped Aadhaar values and preserves unrelated identifiers", () => {
    const notice =
      "DIN: 202600123456; Reference No: 123456789012; Reference: 1234 5678 9012; Section 143(1); Amount Rs 45,000; Issued on 12/02/2026; Aadhaar: 987654321098.";
    const result = redactNotice(notice);

    expect(result.redactedText).toContain("DIN: 202600123456");
    expect(result.redactedText).toContain("Reference No: 123456789012");
    expect(result.redactedText).toContain("Reference: 1234 5678 9012");
    expect(result.redactedText).toContain("Section 143(1)");
    expect(result.redactedText).toContain("Amount Rs 45,000");
    expect(result.redactedText).toContain("Issued on 12/02/2026");
    expect(result.redactedText).toContain("Aadhaar: [AADHAAR_1]");
    expect(result.tokenMap["[AADHAAR_1]"]).toBe("987654321098");
  });

  it("masks Indian postal PIN codes following keyword", () => {
    const notice = "Registered address in Chennai, PIN Code: 600001.";
    const result = redactNotice(notice);

    expect(result.redactedText).toContain("[PIN_1]");
    expect(result.tokenMap["[PIN_1]"]).toBe("600001");
  });

  it("maintains stable tokens for repeated occurrences", () => {
    const notice =
      "Dear Ramesh Kumar. We remind you, Ramesh Kumar, that PAN ABCDE1234F is flagged.";
    const result = redactNotice(notice);

    // Both occurrences of Ramesh Kumar should map to [PERSON_1]
    expect(result.redactedText).toBe(
      "Dear [PERSON_1]. We remind you, [PERSON_1], that PAN [PAN_1] is flagged."
    );
    const matches = result.redactedText.match(/\[PERSON_1\]/g);
    expect(matches?.length).toBe(2);
    expect(result.counts.PERSON).toBe(1);
  });

  it("allows manual word masking by user", () => {
    const notice = "Notice from Department regarding SecretProject alpha.";
    const initial = redactNotice(notice);

    const manual = manualMask(initial.redactedText, "SecretProject", initial.tokenMap);
    expect(manual.redactedText).toContain("[CUSTOM_1]");
    expect(manual.redactedText).not.toContain("SecretProject");
    expect(manual.tokenMap["[CUSTOM_1]"]).toBe("SecretProject");
  });

  it("chooses an unused custom token when existing token numbers are sparse", () => {
    const manual = manualMask("first second", "second", {
      "[CUSTOM_1]": "older value",
      "[CUSTOM_3]": "another value",
    });

    expect(manual.token).toBe("[CUSTOM_2]");
    expect(manual.tokenMap["[CUSTOM_1]"]).toBe("older value");
    expect(manual.tokenMap["[CUSTOM_3]"]).toBe("another value");
    expect(manual.redactedText).toBe("first [CUSTOM_2]");
  });

  it("does not reuse a custom token already present in the notice text", () => {
    const manual = manualMask("[CUSTOM_1] and private", "private", {});

    expect(manual.token).toBe("[CUSTOM_2]");
    expect(manual.redactedText).toBe("[CUSTOM_1] and [CUSTOM_2]");
  });

  it("rehydrates draft text locally with 100% fidelity", () => {
    const notice = "Dear Sunita Patel, your PAN ABCDE1234F has an issue.";
    const { redactedText, tokenMap } = redactNotice(notice);

    const draftReply =
      "To Income Tax Officer, I am [PERSON_1], holder of PAN [PAN_1]. I request clarification.";

    const rehydrated = rehydrate(draftReply, tokenMap);
    expect(rehydrated).toBe(
      "To Income Tax Officer, I am Sunita Patel, holder of PAN ABCDE1234F. I request clarification."
    );
  });

  it("rehydrates tokens in one pass without expanding tokens inside restored values", () => {
    expect(
      rehydrate("[CUSTOM_1] and [PERSON_1]", {
        "[CUSTOM_1]": "[PERSON_1]",
        "[PERSON_1]": "Alice Rao",
      })
    ).toBe("[PERSON_1] and Alice Rao");
  });
});
