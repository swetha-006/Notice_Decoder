"use client";

import React from "react";
import { HelpCircle, AlertTriangle, ShieldCheck } from "lucide-react";
import { Language } from "./LanguageSwitcher";

interface SummarySectionProps {
  summary: {
    whatThisIs: { en: string; ta: string; hi: string };
    whatItDemands: { en: string; ta: string; hi: string };
    consequenceIfIgnored: { en: string; ta: string; hi: string };
  };
  currentLang: Language;
}

export function SummarySection({ summary, currentLang }: SummarySectionProps) {
  const titles = {
    en: {
      heading: "Plain-Language Notice Breakdown",
      whatThisIs: "What this document is",
      whatItDemands: "What it asks from you",
      consequence: "What happens if ignored",
    },
    ta: {
      heading: "கடிதத்தின் எளிய விளக்கம்",
      whatThisIs: "இந்த ஆவணம் என்ன?",
      whatItDemands: "இது உங்களிடம் என்ன கோருகிறது?",
      consequence: "இதை புறக்கணித்தால் என்ன நடக்கும்?",
    },
    hi: {
      heading: "सरल भाषा में नोटिस का विवरण",
      whatThisIs: "यह दस्तावेज़ क्या है?",
      whatItDemands: "यह आपसे क्या मांग करता है?",
      consequence: "यदि अनदेखा किया जाए तो क्या होगा?",
    },
  }[currentLang];

  return (
    <div className="rounded-lg border border-border bg-canvas-card p-5 shadow-sm">
      <h3 className="font-serif text-lg font-bold text-ink">
        {titles.heading}
      </h3>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* What this is */}
        <div className="rounded-md border border-border-subtle bg-canvas-subtle p-3.5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
            <HelpCircle className="h-4 w-4 text-accent" />
            <span>{titles.whatThisIs}</span>
          </div>
          <p className="mt-2 text-xs text-ink leading-relaxed font-medium">
            {summary.whatThisIs[currentLang] || summary.whatThisIs.en}
          </p>
        </div>

        {/* What it demands */}
        <div className="rounded-md border border-border-subtle bg-canvas-subtle p-3.5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
            <AlertTriangle className="h-4 w-4 text-suspicious" />
            <span>{titles.whatItDemands}</span>
          </div>
          <p className="mt-2 text-xs text-ink leading-relaxed font-medium">
            {summary.whatItDemands[currentLang] || summary.whatItDemands.en}
          </p>
        </div>

        {/* Consequence if ignored */}
        <div className="rounded-md border border-border-subtle bg-canvas-subtle p-3.5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
            <ShieldCheck className="h-4 w-4 text-genuine" />
            <span>{titles.consequence}</span>
          </div>
          <p className="mt-2 text-xs text-ink leading-relaxed font-medium">
            {summary.consequenceIfIgnored[currentLang] || summary.consequenceIfIgnored.en}
          </p>
        </div>
      </div>
    </div>
  );
}
