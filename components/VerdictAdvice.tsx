"use client";

import type { AnalysisResponse } from "@/lib/schema";
import type { Verdict } from "@/lib/scoring";
import type { Language } from "./LanguageSwitcher";
import { ChecklistSection } from "./ChecklistSection";
import { ResponseDraft } from "./ResponseDraft";
import { SummarySection } from "./SummarySection";
import { getSafeVerdictGuidance } from "@/lib/verdict-guidance";

interface VerdictAdviceProps {
  analysisResponse: AnalysisResponse & { source: "model" | "rules_only" };
  verdict: Verdict;
  currentLang: Language;
  tokenMap: Record<string, string>;
}

export function VerdictAdvice({
  analysisResponse,
  verdict,
  currentLang,
  tokenMap,
}: VerdictAdviceProps) {
  const guidance = getSafeVerdictGuidance(verdict);
  const modelDisagrees = analysisResponse.verdict !== verdict;

  if (verdict === "likely_scam") {
    const title = {
      en: "Safety guidance for a likely scam",
      ta: "மோசடியாக இருக்கக்கூடிய செய்திக்கான பாதுகாப்பு வழிகாட்டல்",
      hi: "संभावित धोखाधड़ी के लिए सुरक्षा सलाह",
    };
    const description = {
      en: "Do not pay, reply, open links, or install files from this message. Verify independently; if you already sent money or shared credentials, contact your bank promptly.",
      ta: "இந்தச் செய்தியிலிருந்து பணம் செலுத்தவோ, பதிலளிக்கவோ, இணைப்புகளைத் திறக்கவோ அல்லது கோப்புகளை நிறுவவோ வேண்டாம். தனியாகச் சரிபார்க்கவும்; ஏற்கனவே பணம் அனுப்பியிருந்தாலோ விவரங்களைப் பகிர்ந்திருந்தாலோ உடனே வங்கியைத் தொடர்புகொள்ளவும்.",
      hi: "इस संदेश से भुगतान न करें, जवाब न दें, लिंक न खोलें और फ़ाइलें इंस्टॉल न करें। स्वतंत्र रूप से पुष्टि करें; यदि पैसे भेजे हैं या जानकारी साझा की है, तो तुरंत अपने बैंक से संपर्क करें।",
    };

    return (
      <>
        <SummarySection summary={guidance.summary} currentLang={currentLang} />
        <section
          className="rounded-lg border border-scam-border bg-scam-bg p-5 text-scam-text"
          aria-labelledby="scam-safety-title"
        >
          <h2 id="scam-safety-title" className="font-serif text-lg font-semibold">
            {title[currentLang]}
          </h2>
          <p className="mt-2 text-sm leading-relaxed">{description[currentLang]}</p>
          <p className="mt-2 text-sm leading-relaxed">
            {guidance.summary.consequenceIfIgnored[currentLang]}
          </p>
        </section>
        <ChecklistSection items={guidance.checklist} currentLang={currentLang} />
      </>
    );
  }

  if (verdict === "suspicious") {
    return (
      <>
        <SummarySection summary={guidance.summary} currentLang={currentLang} />
        <ChecklistSection items={guidance.checklist} currentLang={currentLang} />
        <ResponseDraft
          draftReply={guidance.neutralReply}
          tokenMap={tokenMap}
          currentLang={currentLang}
        />
      </>
    );
  }

  if (modelDisagrees || analysisResponse.source === "rules_only") {
    return (
      <>
        <SummarySection summary={guidance.summary} currentLang={currentLang} />
        <ChecklistSection items={guidance.checklist} currentLang={currentLang} />
        {modelDisagrees && (
          <ResponseDraft
            draftReply={guidance.neutralReply}
            tokenMap={tokenMap}
            currentLang={currentLang}
          />
        )}
      </>
    );
  }

  return (
    <>
      <SummarySection summary={analysisResponse.summary} currentLang={currentLang} />
      <ChecklistSection items={analysisResponse.checklist} currentLang={currentLang} />
      <ResponseDraft
        draftReply={analysisResponse.draftReply}
        tokenMap={tokenMap}
        currentLang={currentLang}
      />
    </>
  );
}
