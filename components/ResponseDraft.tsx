"use client";

import React, { useState } from "react";
import { Check, Copy, FileSignature, Sparkles } from "lucide-react";
import { Language } from "./LanguageSwitcher";
import { rehydrate } from "@/lib/redact";

interface ResponseDraftProps {
  draftReply: { en: string; ta: string; hi: string };
  tokenMap: Record<string, string>;
  currentLang: Language;
}

export function ResponseDraft({
  draftReply,
  tokenMap,
  currentLang,
}: ResponseDraftProps) {
  const [copied, setCopied] = useState(false);

  // Take the draft in the active language and rehydrate any tokens locally
  const rawDraft = draftReply[currentLang] || draftReply.en;
  const rehydratedText = rehydrate(rawDraft, tokenMap);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rehydratedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const titles = {
    en: {
      heading: "Drafted Formal Response Letter",
      subtitle: "Personal tokens have been restored locally with your real details. Ready to copy.",
      copy: "Copy Response Letter",
      copied: "Copied to Clipboard!",
    },
    ta: {
      heading: "பதிலளிப்பு கடித வரைவு",
      subtitle: "உங்களது சுயவிவரங்கள் உள்ளூர் கணினியிலேயே மீண்டும் நிரப்பப்பட்டுள்ளன. நகலெடுக்க தயார்.",
      copy: "கடிதத்தை நகலெடு",
      copied: "நகலெடுக்கப்பட்டது!",
    },
    hi: {
      heading: "प्रारूपित औपचारिक उत्तर पत्र",
      subtitle: "आपके वास्तविक विवरण स्थानीय रूप से पुनर्स्थापित कर दिए गए हैं। कॉपी करने के लिए तैयार।",
      copy: "पत्र कॉपी करें",
      copied: "कॉपी हो गया!",
    },
  }[currentLang];

  return (
    <div className="rounded-lg border border-border bg-canvas-card p-5 shadow-sm">
      <div className="flex flex-col gap-2 border-b border-border pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FileSignature className="h-4 w-4 text-accent" />
            <h3 className="font-serif text-lg font-bold text-ink">
              {titles.heading}
            </h3>
          </div>
          <p className="mt-0.5 text-xs text-ink-secondary">{titles.subtitle}</p>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 self-start rounded-md bg-accent px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-accent-hover transition sm:self-auto"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-300" />
              <span>{titles.copied}</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>{titles.copy}</span>
            </>
          )}
        </button>
      </div>

      <div className="mt-4 rounded-md border border-border bg-canvas p-4">
        <pre className="whitespace-pre-wrap break-words font-sans text-xs sm:text-sm text-ink leading-relaxed font-normal">
          {rehydratedText}
        </pre>
      </div>
    </div>
  );
}
