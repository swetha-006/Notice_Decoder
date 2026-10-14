"use client";

import React from "react";
import { AlertOctagon, AlertTriangle, CheckCircle2, Clock, ShieldCheck } from "lucide-react";
import { Verdict, Urgency } from "@/lib/scoring";
import { Language } from "./LanguageSwitcher";

interface VerdictCardProps {
  verdict: Verdict;
  confidenceScore: number;
  urgencyLevel: Urgency;
  oneSentenceReason: { en: string; ta: string; hi: string };
  daysRemaining?: number;
  isExpired?: boolean;
  currentLang: Language;
}

export function VerdictCard({
  verdict,
  confidenceScore,
  urgencyLevel,
  oneSentenceReason,
  daysRemaining,
  isExpired,
  currentLang,
}: VerdictCardProps) {
  const isScam = verdict === "likely_scam";
  const isSuspicious = verdict === "suspicious";
  const isGenuine = verdict === "likely_genuine";

  const verdictStyles = isScam
    ? {
        border: "border-scam-border",
        bg: "bg-scam-bg",
        text: "text-scam-text",
        badge: "bg-scam text-white",
        title: "Likely Scam",
        titleTa: "போலி மோசடி கடிதம்",
        titleHi: "संभावित फर्जी नोटिस",
      }
    : isSuspicious
    ? {
        border: "border-suspicious-border",
        bg: "bg-suspicious-bg",
        text: "text-suspicious-text",
        badge: "bg-suspicious text-white",
        title: "Suspicious",
        titleTa: "சந்தேகத்திற்குரியது",
        titleHi: "संदिग्ध नोटिस",
      }
    : {
        border: "border-genuine-border",
        bg: "bg-genuine-bg",
        text: "text-genuine-text",
        badge: "bg-genuine text-white",
        title: "Likely Genuine",
        titleTa: "முறையான அரசு கடிதம்",
        titleHi: "संभावित वास्तविक नोटिस",
      };

  const localizedTitle =
    currentLang === "ta"
      ? verdictStyles.titleTa
      : currentLang === "hi"
      ? verdictStyles.titleHi
      : verdictStyles.title;

  const urgencyStyles = {
    high: {
      color: "text-scam",
      bg: "bg-scam-bg border-scam-border",
      label: "High Urgency",
      labelTa: "அவசரம்: அதிகம்",
      labelHi: "अति आवश्यक",
    },
    medium: {
      color: "text-suspicious",
      bg: "bg-suspicious-bg border-suspicious-border",
      label: "Medium Urgency",
      labelTa: "அவசரம்: நடுத்தரம்",
      labelHi: "मध्यम तात्कालिकता",
    },
    low: {
      color: "text-genuine",
      bg: "bg-genuine-bg border-genuine-border",
      label: "Standard / Low Urgency",
      labelTa: "அவசரம்: குறைவு",
      labelHi: "सामान्य समय",
    },
  }[urgencyLevel];

  const localizedUrgency =
    currentLang === "ta"
      ? urgencyStyles.labelTa
      : currentLang === "hi"
      ? urgencyStyles.labelHi
      : urgencyStyles.label;

  return (
    <div
      className={`rounded-lg border-2 p-6 shadow-sm ${verdictStyles.border} ${verdictStyles.bg}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-12 w-12 items-center justify-center rounded-lg shadow-sm ${verdictStyles.badge}`}
          >
            {isScam ? (
              <AlertOctagon className="h-7 w-7" />
            ) : isSuspicious ? (
              <AlertTriangle className="h-7 w-7" />
            ) : (
              <CheckCircle2 className="h-7 w-7" />
            )}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                {localizedTitle}
              </h2>
              <span className="rounded bg-canvas-card px-2 py-0.5 text-xs font-mono font-semibold text-ink border border-border">
                {confidenceScore}% Confidence
              </span>
            </div>
            <p className="mt-0.5 text-xs uppercase tracking-wider font-semibold text-ink-muted">
              Security Verdict
            </p>
          </div>
        </div>

        {/* Urgency & Deadline Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold ${urgencyStyles.bg} ${urgencyStyles.color}`}
          >
            <span className="h-2 w-2 rounded-full bg-current" />
            <span>{localizedUrgency}</span>
          </span>

          {daysRemaining !== undefined && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold ${
                isExpired
                  ? "border-scam-border bg-scam-bg text-scam-text"
                  : "border-border bg-canvas-card text-ink"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>
                {isExpired
                  ? "Deadline Expired"
                  : `${daysRemaining} Day${daysRemaining === 1 ? "" : "s"} Remaining`}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* One-Sentence Reason */}
      <div className="mt-4 rounded-md border border-border-subtle bg-canvas-card p-4">
        <p className="font-sans text-sm font-medium leading-relaxed text-ink">
          {oneSentenceReason[currentLang] || oneSentenceReason.en}
        </p>
      </div>
    </div>
  );
}
