"use client";

import React from "react";
import { AlertCircle, ArrowRight, X } from "lucide-react";

interface NoticeInputProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  isLoading?: boolean;
}

const MAX_CHARS = 10000;

export function NoticeInput({
  value,
  onChange,
  onSubmit,
  onClear,
  isLoading = false,
}: NoticeInputProps) {
  const charCount = value.length;
  const isOverLimit = charCount > MAX_CHARS;
  const isEmpty = value.trim().length === 0;

  return (
    <div className="rounded-lg border border-border bg-canvas-card p-5 shadow-sm">
      <div className="flex items-center justify-between pb-3">
        <div>
          <h2 className="font-serif text-lg font-semibold text-ink">
            Paste Notice Text
          </h2>
          <p className="text-xs text-ink-muted">
            Paste the text of the letter, SMS, email, or demand notice you received.
          </p>
        </div>
        {value && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-xs text-ink-secondary hover:bg-canvas-subtle"
            title="Clear text"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        )}
      </div>

      <div className="relative">
        <textarea
          id="notice-text-input"
          rows={11}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste notice text here... (e.g. 'Dear Rajesh Kumar, this is an urgent demand from Income Tax Department regarding notice DIN 2024/IT/102...')"
          className="w-full resize-y rounded-md border border-border bg-canvas p-3.5 font-sans text-sm text-ink leading-relaxed placeholder:text-ink-muted focus:border-accent focus:bg-canvas-card focus:outline-none"
          disabled={isLoading}
        />
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-xs">
          <span
            className={`font-mono font-medium ${
              isOverLimit ? "text-scam font-bold" : "text-ink-muted"
            }`}
          >
            {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()} characters
          </span>
          {isOverLimit && (
            <span className="inline-flex items-center gap-1 text-scam">
              <AlertCircle className="h-3.5 w-3.5" />
              Notice text exceeds 10,000 characters limit.
            </span>
          )}
        </div>

        <button
          type="button"
          id="inspect-privacy-btn"
          onClick={onSubmit}
          disabled={isEmpty || isOverLimit || isLoading}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isLoading ? (
            <span>Processing...</span>
          ) : (
            <>
              <span>Mask Personal Data & Review</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
