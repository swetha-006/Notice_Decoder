import { describe, expect, it } from "vitest";
import { getSafeVerdictGuidance } from "@/lib/verdict-guidance";

describe("verdict-specific safe guidance", () => {
  it("provides multilingual scam advice and suppresses any reply draft", () => {
    const guidance = getSafeVerdictGuidance("likely_scam");

    for (const language of ["en", "ta", "hi"] as const) {
      expect(guidance.summary.whatThisIs[language]).toBeTruthy();
      expect(guidance.checklist.every((item) => item.action[language].length > 0)).toBe(
        true
      );
    }
    expect(guidance.checklist[0].action.en).toMatch(/Do not pay/);
    expect(guidance.neutralReply.en).toBe("");
  });

  it("uses a neutral verification request for suspicious verdicts", () => {
    const guidance = getSafeVerdictGuidance("suspicious");

    expect(guidance.neutralReply.en).toMatch(/confirm through an official channel/);
    expect(guidance.neutralReply.en).not.toMatch(/I have paid|I dispute|I complied/i);
    expect(guidance.neutralReply.ta).toBeTruthy();
    expect(guidance.neutralReply.hi).toBeTruthy();
  });
});
