"use client";

import React, { useState } from "react";
import { ShieldCheck, Eye, EyeOff, Lock, Plus, ArrowRight, ArrowLeft } from "lucide-react";
import { RedactionResult } from "@/lib/redact";

interface RedactionPreviewProps {
  originalText: string;
  redactionResult: RedactionResult;
  onConfirm: () => void;
  onBack: () => void;
  onManualMask: (textToMask: string) => void;
  isAnalyzing?: boolean;
}

export function RedactionPreview({
  originalText,
  redactionResult,
  onConfirm,
  onBack,
  onManualMask,
  isAnalyzing = false,
}: RedactionPreviewProps) {
  const [activeTab, setActiveTab] = useState<"sideBySide" | "maskedOnly">("sideBySide");
  const [customWord, setCustomWord] = useState("");

  const handleAddManualMask = (e: React.FormEvent) => {
    e.preventDefault();
    if (customWord.trim()) {
      onManualMask(customWord.trim());
      setCustomWord("");
    }
  };

  const entityCount = Object.keys(redactionResult.tokenMap).length;

  return (
    <div className="rounded-lg border border-border bg-canvas-card p-6 shadow-sm">
      {/* Header & Privacy Guarantee */}
      <div className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-genuine-bg px-3 py-1 text-xs font-semibold text-genuine-text border border-genuine-border">
            <Lock className="h-3.5 w-3.5 text-genuine" />
            <span>Privacy Gate — On-Device Redaction Complete</span>
          </div>
          <h2 className="mt-2 font-serif text-xl font-bold text-ink sm:text-2xl">
            This is exactly what will be sent
          </h2>
          <p className="mt-1 text-xs text-ink-secondary">
            Your personal identifiers have been replaced with anonymous tokens inside your browser. Original values never leave your device.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center rounded-md border border-border bg-canvas p-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("sideBySide")}
            className={`flex items-center gap-1.5 rounded px-3 py-1.5 font-medium transition ${
              activeTab === "sideBySide"
                ? "bg-canvas-card text-ink shadow-sm"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            Side-by-Side
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("maskedOnly")}
            className={`flex items-center gap-1.5 rounded px-3 py-1.5 font-medium transition ${
              activeTab === "maskedOnly"
                ? "bg-canvas-card text-ink shadow-sm"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            <EyeOff className="h-3.5 w-3.5" />
            Masked View Only
          </button>
        </div>
      </div>

      {/* Identified Entities Tokens List */}
      <div className="mt-5 rounded-md border border-border-subtle bg-canvas-subtle p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            {entityCount > 0
              ? `${entityCount} Personal Identifier${entityCount > 1 ? "s" : ""} Masked Locally`
              : "No standard personal identifiers detected"}
          </span>
          <span className="text-xs text-ink-muted italic">
            Automatic masking is best-effort. Verify below or mask extra terms manually.
          </span>
        </div>

        {entityCount > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(redactionResult.tokenMap).map(([token, original]) => (
              <span
                key={token}
                className="inline-flex items-center gap-1.5 rounded border border-border bg-canvas-card px-2.5 py-1 text-xs text-ink"
              >
                <code className="font-mono font-bold text-ink-secondary">{token}</code>
                <span className="text-ink-muted">→</span>
                <span className="font-medium text-ink">{original}</span>
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs text-ink-secondary">
            No names, phone numbers, emails, PANs, or account numbers were recognized automatically. You can manually mask any sensitive text below.
          </p>
        )}

        {/* Manual Masking Form */}
        <form onSubmit={handleAddManualMask} className="mt-4 flex items-center gap-2 pt-3 border-t border-border">
          <input
            type="text"
            value={customWord}
            onChange={(e) => setCustomWord(e.target.value)}
            placeholder="Type any word or number to mask manually..."
            className="flex-1 rounded border border-border bg-canvas-card px-3 py-1.5 text-xs text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            disabled={!customWord.trim()}
            className="inline-flex items-center gap-1 rounded bg-canvas-muted px-3 py-1.5 text-xs font-medium text-ink hover:bg-border transition disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" />
            Mask This Term
          </button>
        </form>
      </div>

      {/* Comparison View */}
      <div className="mt-5">
        {activeTab === "sideBySide" ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Original Notice */}
            <div className="flex flex-col rounded-md border border-border bg-canvas p-4">
              <span className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Original Text (Kept In Your Browser)
              </span>
              <pre className="max-h-80 overflow-y-auto whitespace-pre-wrap font-sans text-xs text-ink leading-relaxed">
                {originalText}
              </pre>
            </div>

            {/* Redacted Text */}
            <div className="flex flex-col rounded-md border border-border bg-canvas-card p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-accent">
                  Masked Text (Transmitted for Analysis)
                </span>
                <span className="font-mono text-xs text-genuine font-medium">Safe to Transmit</span>
              </div>
              <pre className="max-h-80 overflow-y-auto whitespace-pre-wrap font-sans text-xs text-ink leading-relaxed">
                {redactionResult.redactedText}
              </pre>
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-accent bg-canvas-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-accent">
                Masked Text (Transmitted for Analysis)
              </span>
              <span className="font-mono text-xs text-genuine font-medium">Safe to Transmit</span>
            </div>
            <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap font-sans text-sm text-ink leading-relaxed">
              {redactionResult.redactedText}
            </pre>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onBack}
          disabled={isAnalyzing}
          className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-canvas-card px-4 py-2 text-xs font-medium text-ink hover:bg-canvas-subtle transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Edit Notice Text
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            id="confirm-analyze-btn"
            onClick={onConfirm}
            disabled={isAnalyzing}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-hover disabled:opacity-50"
          >
            {isAnalyzing ? (
              <span>Analyzing Notice...</span>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Confirm & Analyze Masked Notice</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
