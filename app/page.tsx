"use client";

import React, { useState } from "react";
import { Header } from "@/components/Header";
import { NoticeInput } from "@/components/NoticeInput";
import { RedactionPreview } from "@/components/RedactionPreview";
import { redactNotice, manualMask, RedactionResult } from "@/lib/redact";
import { FileText, ShieldAlert } from "lucide-react";

const SAMPLE_DEMO_TEXT = `GOVERNMENT OF INDIA - INCOME TAX DEPARTMENT
NOTICE UNDER SECTION 143(1) OF INCOME TAX ACT, 1961

Date: 14/10/2026
Notice Ref: ITD/DEL/2026/894201

To,
Shri Rajesh Kumar Sharma
PAN: ABCDE1234F
Address: Flat 402, Shanti Vihar, MG Road, New Delhi, PIN Code: 110001
Mobile: +91 9876543210
Email: rajesh.sharma99@gmail.com

SUB: DEMAND NOTICE FOR ASSESSMENT YEAR 2025-26

Dear Rajesh Kumar Sharma,
This is an urgent communication from the Income Tax Department. Outstanding arrears of Rs. 48,500/- are pending against your PAN ABCDE1234F.

You are hereby commanded to settle this immediately within 24 hours. Failure to comply will result in an immediate warrant of arrest and freezing of your Bank Account No. 987654321098 at SBI (IFSC: SBIN0001234).

To avoid legal prosecution, deposit the amount to the official department settlement gateway:
UPI ID: incometax-refund@okaxis
Verification Portal: http://incometax-gov.in/quick-pay

Signed,
Tax Recovery Officer
New Delhi
`;

export default function Home() {
  const [noticeText, setNoticeText] = useState("");
  const [redactionResult, setRedactionResult] = useState<RedactionResult | null>(null);
  const [currentStep, setCurrentStep] = useState<"input" | "redaction" | "result">("input");

  const handleMaskReview = () => {
    if (!noticeText.trim()) return;
    const result = redactNotice(noticeText);
    setRedactionResult(result);
    setCurrentStep("redaction");
  };

  const handleManualMask = (word: string) => {
    if (!redactionResult) return;
    const updated = manualMask(
      redactionResult.redactedText,
      word,
      redactionResult.tokenMap
    );
    setRedactionResult({
      ...redactionResult,
      redactedText: updated.redactedText,
      tokenMap: updated.tokenMap,
    });
  };

  const handleConfirmAnalyze = () => {
    // In Slice 1, confirmation transitions to analysis step
    alert(
      "Personal data masked successfully! Original details remain strictly in your browser.\n\nProceeding to Slice 2: Fraud Signal Engine."
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <Header />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {/* Intro banner */}
        <div className="mb-8">
          <div className="flex flex-col gap-2 border-l-2 border-accent pl-4">
            <h2 className="font-serif text-2xl font-bold text-ink sm:text-3xl">
              Inspect Official Notice
            </h2>
            <p className="text-sm text-ink-secondary">
              Paste any tax, bank, customs, or e-challan notice. All personal identifiers are masked locally on your device before analysis.
            </p>
          </div>
        </div>

        {/* Step 1: Input view */}
        {currentStep === "input" && (
          <div className="space-y-6">
            {/* Quick Demo Pre-fill */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-canvas-subtle p-3.5 text-xs">
              <div className="flex items-center gap-2 text-ink-secondary">
                <FileText className="h-4 w-4 text-accent" />
                <span>Want to test immediately? Load a sample notice:</span>
              </div>
              <button
                type="button"
                id="load-sample-btn"
                onClick={() => setNoticeText(SAMPLE_DEMO_TEXT)}
                className="inline-flex items-center gap-1.5 rounded border border-border bg-canvas-card px-3 py-1 font-medium text-ink shadow-sm hover:bg-canvas transition"
              >
                <ShieldAlert className="h-3.5 w-3.5 text-scam" />
                <span>Load Sample Tax Scam Notice</span>
              </button>
            </div>

            <NoticeInput
              value={noticeText}
              onChange={setNoticeText}
              onSubmit={handleMaskReview}
              onClear={() => {
                setNoticeText("");
                setRedactionResult(null);
              }}
            />
          </div>
        )}

        {/* Step 2: Redaction Preview */}
        {currentStep === "redaction" && redactionResult && (
          <div className="space-y-6">
            <RedactionPreview
              originalText={noticeText}
              redactionResult={redactionResult}
              onConfirm={handleConfirmAnalyze}
              onBack={() => setCurrentStep("input")}
              onManualMask={handleManualMask}
            />
          </div>
        )}
      </main>

      <footer className="border-t border-border bg-canvas-card py-6 text-center text-xs text-ink-muted">
        <div className="mx-auto max-w-7xl px-4">
          <p>
            Notice Check · Privacy-First Official Communication Verification · Built for Devpost Build With AI Hackathon
          </p>
          <p className="mt-1 text-[11px] text-ink-muted">
            All personal information is redacted on-device. No notice text or personal records are stored.
          </p>
        </div>
      </footer>
    </div>
  );
}
