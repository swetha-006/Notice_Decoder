"use client";

import React, { useState } from "react";
import { CheckSquare, Square, ShieldCheck, ExternalLink } from "lucide-react";
import { Language } from "./LanguageSwitcher";

interface ChecklistItem {
  step: number;
  action: { en: string; ta: string; hi: string };
  isOfficialChannel: boolean;
}

interface ChecklistSectionProps {
  items: ChecklistItem[];
  currentLang: Language;
}

export function ChecklistSection({ items, currentLang }: ChecklistSectionProps) {
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({});

  const toggleCheck = (step: number) => {
    setCheckedSteps((prev) => ({ ...prev, [step]: !prev[step] }));
  };

  const titles = {
    en: {
      heading: "What To Do Next — Action Checklist",
      subtitle: "Follow these steps in order to protect yourself and verify authenticity.",
      officialBadge: "Official Channel",
    },
    ta: {
      heading: "அடுத்து என்ன செய்ய வேண்டும் — சரிபார்ப்பு பட்டியல்",
      subtitle: "உங்களை பாதுகாத்து கொள்ள இந்த படிகளை வரிசையாக பின்பற்றவும்.",
      officialBadge: "அதிகாரப்பூர்வ வழி",
    },
    hi: {
      heading: "आगे क्या करें — कार्य सूची",
      subtitle: "सुरक्षित रहने और प्रामाणिकता सत्यापित करने के लिए इन चरणों का पालन करें।",
      officialBadge: "आधिकारिक माध्यम",
    },
  }[currentLang];

  return (
    <div className="rounded-lg border border-border bg-canvas-card p-5 shadow-sm">
      <div className="border-b border-border pb-3">
        <h3 className="font-serif text-lg font-bold text-ink">
          {titles.heading}
        </h3>
        <p className="mt-1 text-xs text-ink-secondary">{titles.subtitle}</p>
      </div>

      <div className="mt-4 space-y-3">
        {items.map((item) => {
          const isDone = !!checkedSteps[item.step];
          const text = item.action[currentLang] || item.action.en;

          return (
            <div
              key={item.step}
              onClick={() => toggleCheck(item.step)}
              className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer transition select-none ${
                isDone
                  ? "border-genuine-border bg-genuine-bg/40 text-ink-muted"
                  : "border-border bg-canvas hover:border-border-strong hover:bg-canvas-card"
              }`}
            >
              <button
                type="button"
                className="mt-0.5 flex-shrink-0 text-ink focus:outline-none"
                aria-label={`Step ${item.step}`}
              >
                {isDone ? (
                  <CheckSquare className="h-4 w-4 text-genuine" />
                ) : (
                  <Square className="h-4 w-4 text-ink-muted" />
                )}
              </button>

              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-xs font-semibold ${
                      isDone ? "text-ink-muted line-through" : "text-ink"
                    }`}
                  >
                    Step {item.step}:
                  </span>
                  {item.isOfficialChannel && (
                    <span className="inline-flex items-center gap-1 rounded bg-canvas-muted px-2 py-0.5 text-[10px] font-semibold text-ink border border-border">
                      <ShieldCheck className="h-3 w-3 text-genuine" />
                      <span>{titles.officialBadge}</span>
                    </span>
                  )}
                </div>
                <p
                  className={`mt-1 text-xs leading-relaxed ${
                    isDone ? "text-ink-muted line-through" : "text-ink"
                  }`}
                >
                  {text}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
