"use client";

import React from "react";
import { Languages } from "lucide-react";

export type Language = "en" | "ta" | "hi";

interface LanguageSwitcherProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
}

const LANGUAGES: Array<{ code: Language; label: string; script: string }> = [
  { code: "en", label: "English", script: "English" },
  { code: "ta", label: "Tamil", script: "தமிழ்" },
  { code: "hi", label: "Hindi", script: "हिन्दी" },
];

export function LanguageSwitcher({
  currentLang,
  onLanguageChange,
}: LanguageSwitcherProps) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-canvas-card p-1 shadow-sm">
      <span className="flex items-center gap-1.5 pl-2 text-xs font-medium text-ink-muted">
        <Languages className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Language:</span>
      </span>
      <div className="flex items-center gap-1">
        {LANGUAGES.map((lang) => {
          const isActive = currentLang === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => onLanguageChange(lang.code)}
              className={`rounded px-2.5 py-1 text-xs font-medium transition ${
                isActive
                  ? "bg-accent text-white shadow-xs font-semibold"
                  : "text-ink-secondary hover:bg-canvas-subtle hover:text-ink"
              }`}
            >
              <span>{lang.script}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
