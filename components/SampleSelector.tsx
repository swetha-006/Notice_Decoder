"use client";

import React from "react";
import { SAMPLES, SampleNotice } from "@/samples";
import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";

interface SampleSelectorProps {
  onSelectSample: (sample: SampleNotice) => void;
  selectedSampleId?: string;
}

export function SampleSelector({
  onSelectSample,
  selectedSampleId,
}: SampleSelectorProps) {
  return (
    <div className="rounded-lg border border-border bg-canvas-card p-5 shadow-sm">
      <div className="flex flex-col gap-1 border-b border-border pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-lg font-semibold text-ink">
            Test With Fictional Sample Letters
          </h2>
          <p className="text-xs text-ink-secondary">
            Select any sample below to test how personal data is masked and analyzed.
          </p>
        </div>
        <span className="self-start rounded bg-canvas-muted px-2.5 py-1 text-[11px] font-mono text-ink-muted sm:self-auto">
          Sample letter — fictional
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SAMPLES.map((sample) => {
          const isSelected = selectedSampleId === sample.id;
          const isScam = sample.type === "scam";

          return (
            <button
              key={sample.id}
              type="button"
              onClick={() => onSelectSample(sample)}
              className={`flex flex-col items-start rounded-md border p-3.5 text-left transition ${
                isSelected
                  ? "border-accent bg-canvas-subtle ring-1 ring-accent"
                  : "border-border bg-canvas hover:border-border-strong hover:bg-canvas-card"
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <span
                  className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium ${
                    isScam
                      ? "bg-scam-bg text-scam-text border border-scam-border"
                      : "bg-genuine-bg text-genuine-text border border-genuine-border"
                  }`}
                >
                  {isScam ? (
                    <AlertTriangle className="h-3 w-3 text-scam" />
                  ) : (
                    <CheckCircle2 className="h-3 w-3 text-genuine" />
                  )}
                  <span>{isScam ? "Scam Notice" : "Genuine Notice"}</span>
                </span>
                <span className="text-[10px] uppercase font-mono tracking-wider text-ink-muted">
                  {sample.category}
                </span>
              </div>

              <h3 className="mt-2 font-serif text-sm font-bold text-ink">
                {sample.title}
              </h3>
              <p className="mt-1 line-clamp-2 text-xs text-ink-secondary">
                {sample.subtitle}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
