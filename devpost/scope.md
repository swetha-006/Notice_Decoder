---
doc: scope
status: approved
---

# Notice Check

Before you panic or pay, check whether an official-looking notice is real and know exactly what to do.

## The Unique Kernel
Local-first privacy redaction paired with dual-engine verification: deterministic heuristics and official domain/threat signals merged with structured AI analysis (Groq preferred, Gemini fallback), where every single flag is verified as a verbatim quote from the original text, culminating in a calm document-style verdict, days-remaining counter, official channel verification checklist, and locally rehydrated drafted reply in English, Tamil, or Hindi.

## Who It's For
An everyday citizen or small business owner who receives a tax demand, bank KYC freeze warning, courier customs fee notice, or traffic e-challan and is unsure whether it is genuine or what it legally requires. Often they are not fluent in legalistic or bureaucratic English/Hindi and risk panicking into scam payments or missing real compliance deadlines.

## The Core Loop
1. **Input**: User pastes the notice text or selects one of 6 built-in fictional sample letters.
2. **Redact & Preview**: Pure TypeScript browser module detects and masks personal identifiers (names, phone numbers, emails, PAN, Aadhaar, account/IFSC numbers, PIN codes, addresses). The user reviews the exact outgoing-text preview, runs a best-effort residual-identifier scan, and can manually mask additional terms. Only the displayed masked text is submitted; automatic detection can miss names, addresses, and unusual identifiers.
3. **Analyze**: The server route invokes Groq first and configured Gemini models as fallback using JSON checked against a Zod schema, while the rule-based signal engine runs deterministic checks (UPI, threat words, lookalike domains, sender mismatches, deadline math).
4. **Grounded Document Result**: The user sees a split-screen view: the original notice with exact verbatim trigger lines highlighted on one side, and the verdict (Likely genuine / Suspicious / Likely scam), plain-language summary, days-remaining deadline, urgency level (red/amber/green), official verification checklist, and locally rehydrated response draft in English, Tamil, or Hindi on the other.

## Inspiration & Identity
- **Aesthetic**: Calm, trustworthy, and editorial—reminiscent of Gov.uk or Stripe/Monzo fintech utilities rather than a flashy AI startup.
- **Color Palette**: Warm off-white background (#FBFBFA / #F7F6F2), near-black text (#1A1A1A), refined ink/slate accents, with semantic red/amber/green reserved strictly for urgency badges and final verdicts. Meets WCAG AA contrast.
- **Typography**: Distinctive serif for headings paired with a clean, high-legibility sans for body, with Google Noto Sans support for Tamil and Hindi.
- **Tone**: Plain, measured, and human. Zero AI tropes: no purple/blue gradients, no glassmorphism, no chatbot bubbles, no sparkle icons, no exclamation marks.

## Why This Matters to the Learner
Impersonation scams and fake legal/tax notices cause catastrophic financial and emotional harm, especially when scammers weaponize urgency (threats of arrest or account freezing). Existing AI tools either require users to paste sensitive financial and identity records into third-party cloud prompts or produce hallucinations without verifiable quotes. Notice Check demonstrates that privacy-preserving redaction, deterministic rule engines, and strict quote grounding can provide reliable consumer defense with zero paid services.

## What "Working" Looks Like
A fully functioning Next.js web application running locally and ready for zero-cost deployment on Vercel or Cloudflare Pages.
In the demo:
1. Pasting a scam income tax or customs notice triggers automatic masking of names, PAN, phone numbers, and bank details.
2. The analysis returns a "Likely scam" verdict with high confidence, highlighting exact trigger phrases inline (e.g., payment via personal UPI ID, urgency threat of 24-hour arrest, non-.gov.in domain).
3. The plain-language summary explains the scam tactics, urgency is marked red, and the verification checklist points directly to the real portal (`incometax.gov.in`).
4. Switching the output language to Tamil or Hindi renders the summary, checklist, and drafted reply seamlessly with original names and reference numbers restored.
5. Pasting a genuine assessment notice yields a calm green "Likely genuine" verdict with standard compliance steps.

## The POC Boundary
- **Framework**: Next.js (App Router) + TypeScript (strict) + Tailwind CSS.
- **Privacy Redactor**: In-browser regex and heuristic mask engine with in-memory token map, placeholder replacement (`[PERSON_1]`, `[PAN_1]`, etc.), and local `rehydrate()` utility.
- **Rule-based Signal Engine**: Pure TypeScript engine evaluating payment types (UPI, crypto, gift cards), urgency threats, domain lookalikes (Levenshtein distance against official domains like `incometax.gov.in`), non-.gov.in flags, sender mismatch, and deadline calculation.
- **Evidence Grounding Engine**: Substring matching with whitespace normalization; ungrounded flags are discarded; overlapping highlights are merged.
- **Scoring Function**: Deterministic algorithm in `/lib/scoring.ts` combining rule signals and model confidence.
- **API Route**: Single `/api/analyze` route preferring Groq with Gemini as fallback, using server-side API keys, Zod validation, one retry per model for invalid output, and in-memory rate limiting.
- **Rules-only safety**: Without AI, a notice lacking positive evidence from an allowlisted official domain is **Suspicious** and requires independent verification; no detected scam signal alone is not proof of authenticity.
- **Samples**: 6 fictional sample letters in `/samples` (2 genuine, 4 scam across tax, bank KYC, courier, e-challan) clearly marked "Sample letter - fictional".
- **Unit Tests**: Full Vitest suite covering redaction, rehydration, signal rules, quote grounding, deadline math, and scoring.

## Later
- On-device local LLM execution (WebGPU / WebLLM) for zero-network end-to-end analysis.
- Multi-page PDF document rendering and client-side OCR.
- Direct links to official grievance redressal portals (e.g., CPGRAMS, National Cyber Crime Reporting Portal).
- Expansion to state-level municipal notices, court summons, and electricity bill disconnect threats.

## Explicitly Cut
- User accounts, login, or authentication (unnecessary friction and privacy risk).
- Database or persistent storage (notices should be ephemeral and never stored).
- Server-side logging of notice content or user IP addresses.
- Image/OCR upload in the initial PoC (kept to clean text to maintain local privacy and avoid third-party OCR API dependencies; documented on roadmap).
- Payment gateways or fee dispute settlement.
