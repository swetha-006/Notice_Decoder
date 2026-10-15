---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast

## Slices

- [x] **1. Scaffold Next.js app with in-browser privacy redactor and rehydration**
  Becomes usable: Running Next.js app with editorial styling where a user can paste notice text, see automatic detection and masking of personal identifiers (names, phones, emails, PAN, Aadhaar, accounts, IFSC, PIN codes), view the explicit "what will be sent" preview with manual masking toggles, and test client-side rehydration.
  Why now: The privacy redactor is the core privacy guarantee and the entry gate for all text processing. Putting it in slice 1 keeps detection and token mapping local, while a preview and residual scan help users review the exact outgoing payload. Detection remains best-effort.
  PRD ref: `prd.md > Notice Input & Sample Library`, `prd.md > Client-Side Redaction & In-Memory Rehydration`
  Spec ref: `spec.md > Stack`, `spec.md > Components > NoticeInput`, `spec.md > Components > RedactionPreview`, `spec.md > Data Model > Redaction Token Map`
  Build: Initialize Next.js project with TypeScript (strict), Tailwind CSS, Lucide icons, Vitest, and Zod. Implement `/lib/redact.ts` with regex and heuristics for Indian and international formats, token mapping, and `rehydrate()`. Build `NoticeInput` and `RedactionPreview` components. Add unit tests in `tests/redact.test.ts`.
  Verify (mechanical): Run `npx vitest run tests/redact.test.ts` to confirm 100% test pass on PII tokenization and rehydration. Run `npm run build` or `npx next build` to confirm zero compilation errors.
  Learner check: Start dev server, open `http://localhost:3000`, paste a notice containing a name, PAN, and phone number, and confirm the tokens `[PERSON_1]`, `[PAN_1]`, `[PHONE_1]` appear with the outgoing-text preview and best-effort warning.
  Commit: `feat: scaffold Next.js app with in-browser privacy redactor and test suite`

- [x] **2. Deterministic rule-based fraud signal engine and deadline calculation**
  Becomes usable: Pure TypeScript rule engine that inspects notice text for non-governmental payment mechanisms (UPI IDs, crypto, gift cards), urgency coercion phrases ("arrest warrant", "24 hours"), lookalike domains (Levenshtein distance against official allowlist), non-.gov.in government claims, sender mismatches, and deadline days-remaining calculation.
  Why now: Scams can be caught deterministically without an LLM; placing this rule engine early provides a rock-solid, offline-capable security floor.
  PRD ref: `prd.md > Rule-Based Signal Engine`
  Spec ref: `spec.md > Components`, `spec.md > Data Model > Signal Engine Findings`, `spec.md > External Services and Dependencies`
  Build: Create `/lib/official-domains.ts` with verified government and bank domains. Implement `/lib/signals.ts` with payment, threat, domain lookalike, sender mismatch, and deadline calculation logic. Add comprehensive unit tests in `tests/signals.test.ts` and `tests/deadline.test.ts`.
  Verify (mechanical): Run `npx vitest run tests/signals.test.ts tests/deadline.test.ts` to verify detection of UPI IDs, lookalikes (`incometax-gov.in`), threat phrases, and deadline math.
  Learner check: Inspect test output verifying that a scam notice with `incometax-refund@okaxis` and `arrest warrant within 24 hours` triggers critical fraud flags with exact substring quotes.
  Commit: `feat: add deterministic rule-based fraud signal engine and deadline math`

- [x] **3. Quote evidence grounding and deterministic scoring engine**
  Becomes usable: Evidence grounding module that verifies every model flag against the submitted notice text via normalized substring search (dropping ungrounded claims), merges rule and model flags without overlapping highlights, and computes the composite verdict (Likely genuine / Suspicious / Likely scam) and urgency score in `/lib/scoring.ts`.
  Why now: Eliminates AI hallucinations and ensures the final verdict is governed by a transparent, reproducible scoring formula rather than raw model text.
  PRD ref: `prd.md > Verbatim Evidence Highlighting & Grounding`, `prd.md > Deterministic Scoring Function`
  Spec ref: `spec.md > Components`, `spec.md > Data Model > Combined Grounded Analysis`
  Build: Implement `/lib/grounding.ts` with whitespace-normalized substring locator, highlight span merger, and ungrounded flag filtering. Implement `/lib/scoring.ts` with the deterministic verdict and urgency calculation function. Add unit tests in `tests/grounding.test.ts` and `tests/scoring.test.ts`.
  Verify (mechanical): Run `npx vitest run tests/grounding.test.ts tests/scoring.test.ts` to confirm that quotes must be exact substrings and that scoring weights rule signals and model outputs correctly.
  Learner check: Verify that a hallucinated quote is dropped from flags, and that a critical payment flag deterministically forces a "Likely scam" verdict.
  Commit: `feat: implement quote evidence grounding and deterministic scoring engine`

- [x] **4. Server route with Gemini structured output, Zod schema, and rate limiting**
  Becomes usable: `/api/analyze` Route Handler that validates incoming masked text, enforces in-memory rate limiting (10 req/min/IP), calls Google Gemini using the configurable `GEMINI_MODEL` env variable with structured JSON, validates responses against `AnalysisResponseSchema` (Zod), retries once on error, and provides a graceful fallback if the key is missing or invalid.
  Why now: Connects the server-side AI model safely without exposing the API key to client browsers, completing the dual-engine pipeline.
  PRD ref: `prd.md > Structured AI Analysis & Strict Evidence Grounding`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > External Services and Dependencies`, `spec.md > Data Model > Shared Structured Response Schema`, `spec.md > Important Failure Modes`
  Build: Create `/lib/schema.ts` with Zod validation schemas. Implement `/lib/rate-limit.ts` with an in-memory token bucket limiter. Implement `/app/api/analyze/route.ts` with model invocation, retry logic, error handling, and security headers. Create `.env.example`.
  Verify (mechanical): Run `npx vitest run` across all test suites, and execute a mock test against `/api/analyze` validating rate limiting, payload size rejection (>10k chars), and schema handling.
  Learner check: Trigger the route with mock input to verify structured JSON response containing categorized flags, checklist, and localized drafts.
  Commit: `feat: add secure Gemini analysis route with Zod schema validation and rate limiting`

- [x] **5. Side-by-side document UI, multi-language localization, and 6 fictional samples**
  Becomes usable: Complete end-to-end product with editorial document split-screen view: original notice with inline highlighted trigger lines on the left, verdict card, days-remaining counter, plain-language summary, verification checklist, rehydrated response letter with copy button, English/Tamil/Hindi language switching, and 6 fictional samples in `/samples` with disclaimer badges.
  Why now: Completes the user experience into a polished, accessible, production-grade submission matching the design direction.
  PRD ref: `prd.md > The Core Journey`, `prd.md > Screens and Layout`, `prd.md > Look and Feel`, `prd.md > Multi-Language Output`
  Spec ref: `spec.md > Components`, `spec.md > Look and Feel`, `spec.md > File Structure`
  Build: Build `DocumentViewer`, `VerdictCard`, `SummarySection`, `ChecklistSection`, `ResponseDraft`, `LanguageSwitcher`, `Header`, and `SampleSelector`. Populate `/samples` with 6 fictional sample letters (2 genuine, 4 scam) with explicit "Sample letter - fictional" labels. Assemble the main `app/page.tsx` responsive split view. Configure editorial typography with Google Noto Sans Tamil and Devanagari fallbacks.
  Verify (mechanical): Run `npm run build` to verify zero TypeScript or Next.js build errors. Run all Vitest suites (`npx vitest run`) to ensure 100% green tests. Verify WCAG AA color contrast.
  Learner check: Open the running web app, test the full demo flow (select scam sample, observe masking preview, run analysis, inspect inline highlights, toggle to Tamil and Hindi, inspect rehydrated draft letter, test genuine sample for calm green verdict).
  Commit: `feat: assemble complete side-by-side analysis UI with multi-language support and sample library`

## Hands-on Checkpoints

- [x] Early usable behavior explored — Slice 1 (PII detection and in-browser masking preview verified)
- [x] Final kick-the-tires exploration and feedback completed

## Final Review

- [x] Previous final review complete — before the approved provider and rules-only safety revision
- [x] Post-revision hands-on check — learner confirmed the checks looked good; the individual verdict labels were not reported. A synthetic live request also succeeds through the configured Groq route.
- [ ] Mobile responsiveness hands-on check — review the input, privacy review, and result screens on a phone-sized viewport; the browser check found and fixed horizontal overflow at 320px.
- [ ] Final review complete — re-opened for the requested mobile-layout refinement; learner confirms it feels ready after the mobile check.

## Code Tour and App Map

- [x] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [x] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [x] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: Verified complete 4-stage pipeline across lib/redact.ts, lib/signals.ts, lib/grounding.ts, lib/scoring.ts, and app/api/analyze/route.ts with 33 passing Vitest tests.
Route and stops: lib/redact.ts (redactNotice & rehydrate) -> lib/signals.ts (evaluateSignals) -> app/api/analyze/route.ts (Groq-first/Gemini fallback, shared schema & rate limit) -> lib/grounding.ts (findVerbatimQuote & mergeAndDeDuplicateFlags) -> lib/scoring.ts (calculateVerdict).
Edit outcome: Fixed severity type union across grounding and schema; fixed domain regex for multi-level subdomains.
Reflection: Evidence grounding and local-first client-side redaction effectively solve both LLM hallucination risk and consumer privacy anxiety simultaneously.
Activity mode: live app, automated test suites, and devpost/app-map.html visual take-home guide.
Revision note: Refreshed `devpost/app-map.html` to show provider fallback and rules-only verification behavior.

## Revisions

- Approved after hands-on review: prefer Groq using a server-side `GROQ_API_KEY`, try configured Gemini models when Groq is unavailable, and keep all provider keys in local/server environment variables. Free-tier availability and quotas are account-dependent and may change.
- Approved safety revision: rules-only analysis must not label an unverified notice Likely genuine just because no scam rule matched; without positive allowlisted official-domain evidence, return Suspicious and require independent verification.
- Groq strict-schema compatibility revision: on HTTP 400, retry once in JSON-object mode with the full schema in the system instructions; validate all output against the shared Zod schema. This fixed the full live synthetic analysis request, which now returns `source: model`. The learner confirmed the app and post-revision checks looked good; they did not provide individual verdict labels.
- Mechanical verification: all 103 tests pass, lint and standalone type-check pass, the provider smoke check succeeds, and the local synthetic `/api/analyze` request returns model-backed output. Production build is deferred while the dev server is active.
- Pre-deployment mobile responsiveness refinement: the privacy review overflowed horizontally at 320px when showing long identifier values and the manual-mask controls. Identifier chips now wrap, the manual-mask form stacks on narrow screens, and notice/evidence text can break long words. Browser checks across 320, 360, 375, 390, 768, 1024, and 1440px show no horizontal overflow on input, privacy-review, and result screens. Learner visual confirmation remains pending.
