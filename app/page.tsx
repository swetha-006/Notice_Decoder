"use client";

import React, { useState } from "react";
import { Header } from "@/components/Header";
import { NoticeInput } from "@/components/NoticeInput";
import { SampleSelector } from "@/components/SampleSelector";
import { RedactionPreview } from "@/components/RedactionPreview";
import { DocumentViewer } from "@/components/DocumentViewer";
import { VerdictCard } from "@/components/VerdictCard";
import { SummarySection } from "@/components/SummarySection";
import { ChecklistSection } from "@/components/ChecklistSection";
import { ResponseDraft } from "@/components/ResponseDraft";
import { LanguageSwitcher, Language } from "@/components/LanguageSwitcher";
import { SampleNotice } from "@/samples";
import { redactNotice, manualMask, RedactionResult } from "@/lib/redact";
import { evaluateSignals } from "@/lib/signals";
import { groundModelFlags, mergeAndDeDuplicateFlags, GroundedFlag } from "@/lib/grounding";
import { calculateVerdict, ScoringResult } from "@/lib/scoring";
import { AnalysisResponse } from "@/lib/schema";
import { ArrowLeft, RefreshCw, ShieldAlert } from "lucide-react";

export default function Home() {
  const [currentStep, setCurrentStep] = useState<"input" | "redaction" | "result">("input");
  const [noticeText, setNoticeText] = useState("");
  const [selectedSampleId, setSelectedSampleId] = useState<string | undefined>();
  const [redactionResult, setRedactionResult] = useState<RedactionResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentLang, setCurrentLang] = useState<Language>("en");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Analysis Result State
  const [groundedFlags, setGroundedFlags] = useState<GroundedFlag[]>([]);
  const [scoringResult, setScoringResult] = useState<ScoringResult | null>(null);
  const [analysisResponse, setAnalysisResponse] = useState<(AnalysisResponse & { source: "model" | "rules_only" }) | null>(null);
  const [daysRemaining, setDaysRemaining] = useState<number | undefined>();
  const [isExpired, setIsExpired] = useState<boolean | undefined>();

  const handleSelectSample = (sample: SampleNotice) => {
    setNoticeText(sample.content);
    setSelectedSampleId(sample.id);
    setErrorMessage(null);
  };

  const handleMaskReview = () => {
    if (!noticeText.trim()) return;
    setErrorMessage(null);
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

  const handleConfirmAnalyze = async () => {
    if (!redactionResult) return;
    setIsAnalyzing(true);
    setErrorMessage(null);

    try {
      // 1. Evaluate deterministic signals locally
      const ruleSignals = evaluateSignals(noticeText);
      setDaysRemaining(ruleSignals.deadlineInfo?.daysRemaining);
      setIsExpired(ruleSignals.deadlineInfo?.isExpired);

      // 2. Call server route for structured model analysis
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maskedText: redactionResult.redactedText }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with status ${res.status}`);
      }

      const modelData: AnalysisResponse & { source: "model" | "rules_only" } = await res.json();
      setAnalysisResponse(modelData);

      // 3. Ground model flags: discard any flag whose quote cannot be found verbatim
      const verifiedModelFlags = groundModelFlags(modelData.flags, noticeText, redactionResult.tokenMap);

      // 4. Merge rule findings with verified model flags & de-duplicate ranges
      const merged = mergeAndDeDuplicateFlags(
        verifiedModelFlags,
        ruleSignals.findings,
        noticeText
      );
      setGroundedFlags(merged);

      // 5. Compute deterministic composite score & verdict
      const scoreRes = calculateVerdict({
        ruleSignals,
        groundedFlags: merged,
        modelVerdict: modelData.verdict,
        modelConfidence: modelData.confidenceScore,
      });
      setScoringResult(scoreRes);

      setCurrentStep("result");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to analyze notice";
      setErrorMessage(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setCurrentStep("input");
    setNoticeText("");
    setSelectedSampleId(undefined);
    setRedactionResult(null);
    setAnalysisResponse(null);
    setScoringResult(null);
    setGroundedFlags([]);
    setErrorMessage(null);
  };

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <Header />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {errorMessage && (
          <div className="mb-6 rounded-md border border-scam-border bg-scam-bg p-4 text-xs text-scam-text">
            <div className="flex items-center gap-2 font-bold">
              <ShieldAlert className="h-4 w-4 text-scam" />
              <span>Analysis Error</span>
            </div>
            <p className="mt-1">{errorMessage}</p>
          </div>
        )}

        {/* STEP 1: INPUT & SAMPLE SELECTION */}
        {currentStep === "input" && (
          <div className="space-y-6">
            <SampleSelector
              onSelectSample={handleSelectSample}
              selectedSampleId={selectedSampleId}
            />

            <NoticeInput
              value={noticeText}
              onChange={(val) => {
                setNoticeText(val);
                setSelectedSampleId(undefined);
              }}
              onSubmit={handleMaskReview}
              onClear={() => {
                setNoticeText("");
                setSelectedSampleId(undefined);
              }}
              isLoading={isAnalyzing}
            />
          </div>
        )}

        {/* STEP 2: REDACTION PREVIEW */}
        {currentStep === "redaction" && redactionResult && (
          <div className="space-y-6">
            <RedactionPreview
              originalText={noticeText}
              redactionResult={redactionResult}
              onConfirm={handleConfirmAnalyze}
              onBack={() => setCurrentStep("input")}
              onManualMask={handleManualMask}
              isAnalyzing={isAnalyzing}
            />
          </div>
        )}

        {/* STEP 3: RESULT SCREEN (SIDE-BY-SIDE DOCUMENT VIEW) */}
        {currentStep === "result" && scoringResult && analysisResponse && redactionResult && (
          <div className="space-y-6">
            {/* Top Toolbar: Language Switcher and Reset */}
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-canvas-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 self-start text-xs font-semibold text-ink hover:text-ink-secondary sm:self-auto"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Check Another Notice</span>
              </button>

              <div className="flex items-center gap-3">
                <LanguageSwitcher
                  currentLang={currentLang}
                  onLanguageChange={setCurrentLang}
                />
              </div>
            </div>

            {analysisResponse.source === "rules_only" && (
              <div role="status" className="rounded-md border border-amber-400 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950">
                Rule-based check only - AI analysis unavailable. Verify through an official channel before acting.
              </div>
            )}

            {/* Verdict Card */}
            <VerdictCard
              verdict={scoringResult.verdict}
              confidenceLevel={scoringResult.confidenceLevel}
              verifyBeforeActing={scoringResult.verifyBeforeActing}
              urgencyLevel={scoringResult.urgencyLevel}
              oneSentenceReason={scoringResult.oneSentenceReason}
              daysRemaining={daysRemaining}
              isExpired={isExpired}
              currentLang={currentLang}
            />

            {/* Split Screen Container: Document on Left, Actions on Right */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
              {/* Left Column: Original Letter with Grounded Highlights (5 cols) */}
              <div className="lg:col-span-5 h-full">
                <DocumentViewer
                  originalText={noticeText}
                  flags={groundedFlags}
                  currentLang={currentLang}
                />
              </div>

              {/* Right Column: Plain Summary, Checklist, and Drafted Reply (7 cols) */}
              <div className="lg:col-span-7 space-y-6">
                {analysisResponse.source === "model" ? (
                  <SummarySection summary={analysisResponse.summary} currentLang={currentLang} />
                ) : (
                  <section className="rounded-lg border border-border bg-canvas-card p-5">
                    <h2 className="font-serif text-lg font-semibold">General guidance</h2>
                    <p className="mt-2 text-sm">Do not use links or contact details in the notice. Find the official website independently and verify the reference with the issuing organization.</p>
                  </section>
                )}

                <section className="rounded-lg border border-border bg-canvas-card p-5" aria-labelledby="why-verdict-title">
                  <h2 id="why-verdict-title" className="font-serif text-lg font-semibold">Why this verdict</h2>
                  <ul className="mt-3 space-y-2 text-sm">
                    {scoringResult.breakdown.length ? scoringResult.breakdown.map((item, index) => <li key={`${item.factor}-${index}`} className="flex justify-between gap-3"><span>{item.factor}</span><span className="shrink-0 font-mono">{item.points > 0 ? "+" : ""}{item.points}</span></li>) : <li>No strong rule signals were detected. Verify independently before acting.</li>}
                  </ul>
                </section>

                <ChecklistSection
                  items={analysisResponse.checklist}
                  currentLang={currentLang}
                />

                {analysisResponse.source === "model" && (
                  <ResponseDraft draftReply={analysisResponse.draftReply} tokenMap={redactionResult.tokenMap} currentLang={currentLang} />
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-border bg-canvas-card py-6 text-center text-xs text-ink-muted">
        <div className="mx-auto max-w-7xl px-4">
          <p>
            Notice Check · Privacy-First Administrative Verification Engine · Devpost Build With AI: Basics
          </p>
          <p className="mt-1 text-[11px] text-ink-muted">
            All personal information is redacted on-device. No notice text or personal records are ever logged or stored.
          </p>
        </div>
      </footer>
    </div>
  );
}
