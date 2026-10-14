---
doc: prd
status: approved
---

# Notice Check — Product Requirements

Before you panic or pay, check whether an official-looking notice is real and know exactly what to do.
Source: `scope.md > The Unique Kernel`.

## The Core Journey
1. **Arrival & Input**: The user arrives on a clean, quiet interface. They can paste any notice text into an expansive input area or click one of 6 pre-loaded fictional sample notices (e.g. Income Tax Demand, Courier Customs Fee, Bank KYC Suspension, Traffic E-Challan).
2. **Instant Privacy Detection**: As soon as text is present and the user initiates check, the client-side redactor scans the text locally. Identifiers (names, phone numbers, email addresses, PAN, Aadhaar, bank accounts, IFSC, PIN codes) are replaced with structured tokens (e.g., `[PERSON_1]`, `[PAN_1]`).
3. **Explicit "What Will Be Sent" Preview**: A dedicated card or modal displays the exact redacted text that will travel to the server. The user can manually click or select additional words to mask. They see an explicit guarantee: "Your original personal details never leave your browser."
4. **Analysis with Dual-Engine Evaluation**: Upon confirmation, the redacted text is submitted. The rule-based signal engine executes immediate deterministic tests (UPI handles, threat terms, domain lookalikes via Levenshtein distance, non-.gov.in checks, sender mismatches, deadline math), while the `/api/analyze` route prompts Google Gemini for structured analysis.
5. **Evidence Grounding Verification**: Every claim made by the model is validated against the submitted text. If a cited quote cannot be found verbatim (with whitespace normalized), it is dropped. Verified model flags are merged with rule-engine flags, de-duplicating overlapping character spans.
6. **Side-by-Side Document Review**:
   - **Left Panel (Document View)**: The original notice is rendered with exact trigger lines highlighted in semantic colors (red for scam indicators, amber for suspicious traits, green/neutral for standard administrative language). Hovering or clicking a highlight shows the plain-language explanation.
   - **Right Panel (Action & Verdict View)**:
     - Prominent verdict banner: **Likely genuine**, **Suspicious**, or **Likely scam**, with a confidence score and a single explanatory sentence.
     - Urgency badge (Red / Amber / Green) with a calculated **Days Remaining** countdown.
     - Plain-language summary answering: What is this? What does it demand? What happens if ignored?
     - Step-by-step "What To Do Next" checklist, prominently featuring official verification pathways (e.g. verifying DIN on `incometax.gov.in`).
     - Ready-to-send drafted response or clarification request, with the user's original names and numbers **locally rehydrated** from browser memory.
     - Language selector toggle (English, Tamil, Hindi) that re-renders all summaries, checklists, and drafts in the chosen language.

## Screens and Layout
- **Single Page Application with Two Main Views**:
  1. **Input & Redaction Surface**:
     - Header: Simple, authoritative wordmark ("Notice Check") with trust subtitle.
     - Main Card: Large notice input textarea with character counter (max 10,000 characters).
     - Sample Selector Bar: 6 quick-fill chips categorized by notice type.
     - Redaction Review Drawer/Modal: Shows side-by-side original vs masked text with token legends and manual mask tools.
  2. **Document Analysis Surface**:
     - Desktop Layout: 50/50 split container. Left pane holds the marked-up document; right pane holds the verdict, summary, urgency, action checklist, response draft, and language switcher.
     - Mobile Layout: Stacked view with a quick jump bar ("View Document Evidence" / "View Recommended Actions").
     - Print / Export: Clean printable view for offline consultation or visiting a real bank/tax office.

## Look and Feel
- **Aesthetic**: Dignified, calm editorial styling inspired by civic design systems (Gov.uk) and thoughtful financial tools (Stripe).
- **Color Palette**:
  - Background: Warm off-white (`#FBFBFA` / `#F7F6F2`).
  - Text: Near-black (`#18181B`) for optimal legibility.
  - Border / Muted: Warm gray (`#E4E4E7` / `#D4D4D8`).
  - Brand Accent: Deep indigo/slate (`#1E293B`).
  - Semantic Status: Calm red (`#DC2626`), amber (`#D97706`), green (`#16A34A`), with soft tinted highlight backgrounds (`#FEE2E2`, `#FEF3C7`, `#DCFCE7`).
  - Contrast: Strictly WCAG AA compliant (minimum 4.5:1 for normal text).
- **Typography**:
  - Headings: Clean, authoritative serif or editorial sans (e.g. Newsreader / Playfair / Fraunces or Merriweather, paired with Inter / Plus Jakarta Sans).
  - Body: High-legibility sans-serif with generous line-height (`1.6`).
  - Indic Scripts: Google Noto Sans Tamil and Noto Sans Devanagari for clean, native rendering of Tamil and Hindi.
- **Copy Tone**: Clear, neutral, reassuring. Never alarming, never dismissive, free of marketing jargon and AI buzzwords.

## Features and Behavior

### Notice Input & Sample Library
- Allows pasting arbitrary text up to 10,000 characters.
- Provides 6 pre-configured fictional samples:
  1. `tax-scam-upi.txt`: Income tax demand threatening 24hr arrest demanding payment to a personal UPI ID (`incometax-refund@okaxis`).
  2. `tax-genuine-143.txt`: Genuine Income Tax Section 143(1) intimation with official DIN, directing to `eportal.incometax.gov.in`.
  3. `bank-kyc-scam.txt`: Bank account freeze warning demanding immediate APK download or link verification on `sbi-kyc-update.co.in`.
  4. `courier-customs-scam.txt`: Fake FedEx/India Post customs clearance demanding courier fee payment to a personal account.
  5. `echallan-scam.txt`: Fake traffic e-challan notice sent via mobile SMS with a shortened `bit.ly` or lookalike link `echallan-parivahan.in`.
  6. `bank-genuine-statement.txt`: Genuine bank annual statement notice asking user to log in only at the official netbanking portal.
- All sample letters display a permanent disclaimer banner: *"Sample letter — fictional"*.

### Client-Side Redaction & In-Memory Rehydration
- **Detection Scope**:
  - Full Names (heuristic based on salutations like "Dear [Name]", "To, [Name]", "Shri/Smt [Name]").
  - Email addresses (`[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}`).
  - Phone numbers (Indian 10-digit mobile `+91`, `0`, spaces/hyphens; international formats).
  - Indian PAN numbers (`[A-Z]{5}[0-9]{4}[A-Z]{1}`).
  - Aadhaar-style 12-digit numbers (`\d{4}\s?\d{4}\s?\d{4}`).
  - Bank Account Numbers & IFSC codes (`[A-Z]{4}0[A-Z0-9]{6}`).
  - Indian Postal PIN codes (`\b[1-9][0-9]{5}\b`).
  - Street addresses and house numbers (heuristics).
- **Token Replacement**: Replaces each matched substring with a stable token: `[PERSON_1]`, `[PHONE_1]`, `[EMAIL_1]`, `[PAN_1]`, `[ACCOUNT_1]`, `[ADDRESS_1]`.
- **In-Memory Token Map**: Stored strictly in browser state (never transmitted, never persisted in localStorage or cookies).
- **Manual Redaction**: Users can click or highlight any unmasked word to convert it into a `[REDACTED_N]` token before sending.
- **Local Rehydration**: When the response draft is generated, the client replaces placeholders back with original values so the user can directly copy and use the letter.

### Rule-Based Signal Engine
Pure TypeScript module running deterministically:
1. **Payment Signals**: Detects UPI IDs (`[\w.-]+@[\w.-]+`), cryptocurrency wallet patterns, gift card redemption requests, or demands to transfer to personal savings accounts.
2. **Urgency & Threat Signals**: Matches high-pressure coercion terms ("arrest warrant", "immediate seizure", "within 24 hours", "police complaint", "non-bailable", "account frozen").
3. **Link & Domain Analysis**:
   - URL shorteners (`bit.ly`, `tinyurl.com`, `t.co`, `is.gd`, `cutt.ly`).
   - Official domain allowlist (`incometax.gov.in`, `eportal.incometax.gov.in`, `parivahan.gov.in`, `echallan.parivahan.gov.in`, `sbi.co.in`, `rbi.org.in`, `indiapost.gov.in`).
   - Lookalike / near-miss detection: Levenshtein distance check against allowlisted domains (e.g. `incometax-gov.in`, `incometaxindiaefiling.org`, `parivahan-gov.in`).
   - Non-.gov.in validation: Flags notices claiming to be Government of India departments but linking to `.com`, `.co.in`, `.org`, `.xyz`, or raw IP addresses.
4. **Sender Mismatch Signals**: Flags official notices originating from public free email services (`@gmail.com`, `@yahoo.com`, `@outlook.com`) or personal mobile numbers.
5. **Deadline Extraction & Math**: Extracts stated dates/deadlines and computes days remaining relative to current date (e.g., "3 days remaining", "Expired yesterday").

### Structured AI Analysis & Strict Evidence Grounding
- Server route calls Gemini with structured output schema (Zod).
- Model outputs:
  - Document summary: Category, issuing authority claim, primary demand.
  - Urgency level: Low, Medium, High.
  - Model verdict: Likely genuine, Suspicious, Likely scam, with confidence (0–100%) and one-line justification.
  - Identified flags: Each flag must contain `quote` (exact string), `category`, and `explanation`.
  - Next steps checklist: 3–5 concrete verification and compliance actions.
  - Draft response: A formal letter template tailored to either dispute a scam demand or comply with a genuine request.
  - Multi-lingual translations for English, Tamil, and Hindi.
- **Evidence Grounding Engine**:
  - Every quote returned by the model is verified against the submitted text using whitespace-normalized substring search.
  - Any model flag failing verbatim quote matching is discarded immediately.
  - Validated model flags and rule-based signal flags are merged, removing duplicates and computing exact start/end character offsets for UI rendering.

### Deterministic Scoring Function (`/lib/scoring.ts`)
The final verdict is not simply the model's opinion. A deterministic algorithm weighs:
- Scam disqualifiers (e.g., UPI payment demand on a tax notice = automatic **Likely scam**).
- Critical rule hits (lookalike domain, threat of arrest, free email sender).
- Legitimate proof points (valid `.gov.in` domain, Document Identification Number (DIN) reference, absence of payment links).
- Resulting classification:
  - **Likely scam**: High certainty of fraudulent coercion or phishing.
  - **Suspicious**: Irregular communication channel, unverified links, or severe ambiguities.
  - **Likely genuine**: Standard administrative notice matching official format and official portals.

### Multi-Language Output
- Full localization toggle for results: **English**, **Tamil (தமிழ்)**, and **Hindi (हिन्दी)**.
- Covers: Verdict summary, flag explanations, urgency label, verification checklist, and the draft response.
- Font styling uses Google Noto Sans Tamil and Noto Sans Devanagari to guarantee clean typography without glyph clipping.

## States and Boundaries
- **Empty State**: Friendly greeting, sample selector cards, clear privacy note explaining in-browser redaction.
- **Redaction State**: Highlighting identified personal identifiers, allowing one-click toggle or manual word selection.
- **Analyzing State**: Unobtrusive progress indication ("Checking official domain registries...", "Running signal heuristics...", "Grounding evidence...").
- **Completed Result State**: Split view with highlighted text and action checklist.
- **Retry / Recovery State**: If Gemini API returns invalid JSON or schema errors, the server retries once; if it fails again, returns a graceful fallback combining the full rule-based signal results.
- **Rate Limit State**: In-memory rate limiting (10 requests per IP per minute) returns HTTP 429 with a clear "Please wait a moment" message.
- **Session Boundary**: Completely ephemeral. Reloading clears all data; no local storage of notice contents.

## Product Decisions
- **In-Browser Redaction as a Core Privacy Promise**: Rather than asking users to trust a remote server or LLM with their PAN or phone number, all PII is replaced with placeholders before network transfer.
- **Verbatim Evidence Grounding**: Hallucinations in fraud detection are dangerous. If the AI cannot cite the exact sentence in the notice, the warning is suppressed.
- **Deterministic Scoring**: AI can be swayed by polite scam formatting; the rule-based engine acts as a hard security guardrail that overrides false negatives.
- **Multi-Lingual Support**: Scammers prey on linguistic vulnerability. Explaining legal notices in Tamil and Hindi bridges critical information gaps.

## What We're Building
- Next.js (App Router) with TypeScript (strict) and Tailwind CSS.
- In-browser PII detection and redaction module with manual redaction support and rehydration.
- Rule-based signal engine (UPI, crypto, urgency threats, lookalike domains, sender mismatch, deadline math).
- Evidence grounding engine with whitespace normalization and character offset highlighter.
- Deterministic scoring function in `/lib/scoring.ts`.
- Next.js Route Handler `/api/analyze` with Gemini free-tier structured JSON output, Zod schema validation, retry logic, and in-memory rate limiting.
- 6 fictional sample letters in `/samples`.
- Editorial document split-screen UI with responsive mobile layout.
- Multi-language output (English, Tamil, Hindi).
- Vitest unit test suite covering redaction, rehydration, signal rules, quote grounding, deadline math, and scoring.

## Deferred From the POC
- PDF and image file upload with client-side OCR (roadmap item).
- Custom user-uploaded allowlists for enterprise domains.
- Direct submission to police cybercrime reporting APIs.

## Possible Later Enhancements
- WebGPU / WebLLM client-side model execution for 100% offline analysis.
- Multi-language voice read-out of plain-language summaries for low-literacy users.

## Non-Goals
- We do not store or persist user notices.
- We do not provide formal legal advice or substitute for licensed chartered accountants / attorneys.
- We do not process payments or negotiate fine settlements.

## Open Questions
- None blocking specification. All behavioral criteria, acceptance criteria, and edge cases are specified.
