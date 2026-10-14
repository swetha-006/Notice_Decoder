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

  it("masks names following formal salutations", () => {
    const notice = "Dear Vikramaditya Rao,\nThis is an urgent notice regarding your account.";
    const result = redactNotice(notice);

    expect(result.redactedText).toContain("Dear [PERSON_1]");
    expect(result.redactedText).not.toContain("Vikramaditya Rao");
    expect(result.tokenMap["[PERSON_1]"]).toBe("Vikramaditya Rao");
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
});
