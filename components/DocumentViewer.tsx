"use client";

import React, { useState } from "react";
import { GroundedFlag, computeTextSegments } from "@/lib/grounding";
import { Language } from "./LanguageSwitcher";
import { AlertCircle, FileText, Info } from "lucide-react";

interface DocumentViewerProps {
  originalText: string;
  flags: GroundedFlag[];
  currentLang: Language;
}

export function DocumentViewer({
  originalText,
  flags,
  currentLang,
}: DocumentViewerProps) {
  const [selectedFlag, setSelectedFlag] = useState<GroundedFlag | null>(null);
  const segments = computeTextSegments(originalText, flags);

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-canvas-card shadow-sm">
      {/* Document Header */}
      <div className="flex items-center justify-between border-b border-border bg-canvas-subtle px-5 py-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-ink-muted" />
          <span className="font-serif text-sm font-semibold text-ink">
            Original Notice Document
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded bg-scam-highlight px-2 py-0.5 text-[11px] font-medium text-scam-text">
            {flags.length} Evidence Highlight{flags.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {/* Main Document Body */}
      <div className="relative flex-1 p-5 overflow-y-auto max-h-[650px]">
        <div className="whitespace-pre-wrap break-words font-sans text-xs sm:text-sm text-ink leading-relaxed">
          {segments.map((segment, index) => {
            if (!segment.flag) {
              return <span key={index}>{segment.text}</span>;
            }

            const flag = segment.flag;
            const isScam = flag.severity === "critical";
            const isWarning = flag.severity === "warning";
            const isPositive = flag.severity === "positive";

            const highlightClass = isScam
              ? "highlight-scam"
              : isWarning
              ? "highlight-suspicious"
              : isPositive
              ? "highlight-genuine"
              : "highlight-token";

            const isSelected = selectedFlag?.id === flag.id;

            return (
              <mark
                key={index}
                onClick={() => setSelectedFlag(flag)}
                className={`${highlightClass} ${
                  isSelected ? "ring-2 ring-accent" : ""
                } cursor-pointer transition select-text`}
                title="Click to view evidence explanation"
              >
                {segment.text}
              </mark>
            );
          })}
        </div>
      </div>

      {/* Selected Flag Detail Tray / Tooltip Drawer */}
      <div className="border-t border-border bg-canvas-subtle p-4">
        {selectedFlag ? (
          <div className="flex min-w-0 flex-col gap-2 rounded-md border border-border bg-canvas-card p-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="inline-flex min-w-0 flex-wrap items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink">
                <AlertCircle className="h-3.5 w-3.5 text-scam" />
                <span>Flagged Evidence:</span>
                <code className="max-w-full break-all rounded bg-canvas-muted px-1.5 py-0.5 font-mono text-[11px] text-ink">
                  &ldquo;{selectedFlag.quote}&rdquo;
                </code>
              </span>
              <button
                type="button"
                onClick={() => setSelectedFlag(null)}
                className="text-xs text-ink-muted hover:text-ink font-medium"
              >
                Dismiss
              </button>
            </div>
            <p className="text-xs text-ink leading-relaxed">
              {selectedFlag.explanation[currentLang] || selectedFlag.explanation.en}
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-ink-muted">
            <Info className="h-4 w-4" />
            <span>
              Click on any highlighted phrase in the letter above to inspect the specific fraud or procedural flag.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
