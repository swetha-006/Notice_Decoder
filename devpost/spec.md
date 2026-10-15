---
doc: spec
status: approved
---

# Notice Check — Technical Spec

## How This Works, In Plain Language
When a user pastes a notice or selects a sample letter, everything personal—like their name, phone number, PAN, bank account, or street address—is immediately detected and replaced by tokens like `[PERSON_1]` or `[PAN_1]` directly inside their web browser. The original details stay in memory on their machine and are never transmitted over the internet.

Before anything leaves the computer, the user inspects an exact preview of what will be transmitted, with the ability to click any additional words to mask them manually.

When the user confirms, the masked text is evaluated in two parallel ways:
1. **A deterministic rule engine** (running in pure TypeScript) inspects the notice for known fraud patterns: non-governmental payment destinations (UPI IDs, cryptocurrency wallets, gift cards), coercive threat language ("arrest warrant", "within 24 hours"), lookalike domains (e.g. `incometax-gov.in` instead of `incometax.gov.in`), sender mismatches (tax notices from Gmail addresses), and calculation of response deadlines.
2. **A server route** (`/api/analyze`) sends the masked text to the Google Gemini API (using a model configured via environment variable, such as `gemini-2.0-flash` or `gemini-1.5-flash`) demanding structured JSON verified against a strict Zod schema.

Before showing anything to the user, an **Evidence Grounding Engine** cross-checks every single claim or quote returned by the model against the submitted notice text. If the model quotes something that isn't verbatim in the letter (accounting for normalized whitespace), that flag is immediately discarded.

Finally, a **deterministic scoring function** (`/lib/scoring.ts`) combines the verified model flags and the rule engine signals. It assigns a clear verdict (**Likely genuine**, **Suspicious**, or **Likely scam**), an urgency level (red/amber/green), and a days-remaining countdown. The browser re-hydrates any drafted response with the user's real personal details locally so they can copy and send it, and renders everything in English, Tamil, or Hindi.

## The Core Journey Through the System
1. **Paste / Sample Pick**: User enters text in `NoticeInput` or clicks a chip from `SampleSelector`.
   - Ref: `prd.md > Notice Input & Sample Library`.
2. **Local Redaction**: `redactNotice(text)` in `/lib/redact.ts` tokenizes PII and creates an in-memory `TokenMap`.
   - Ref: `prd.md > Client-Side Redaction & In-Memory Rehydration`.
3. **Privacy Gate & Review**: `RedactionPreview` renders original vs. masked text side-by-side with interactive tokens. User clicks "Confirm & Analyze".
   - Ref: `prd.md > Explicit "What Will Be Sent" Preview`.
4. **Signal Engine & Server Evaluation**:
   - Client executes `evaluateSignals(maskedText)` from `/lib/signals.ts`.
   - Client posts `{ maskedText }` to `/api/analyze`.
   - `/api/analyze` verifies rate limits (in-memory token bucket), checks length `<= 10,000`, invokes Gemini with structured JSON, validates against `AnalysisResponseSchema` (Zod), retrying once on JSON/schema mismatch.
   - Ref: `prd.md > Dual-Engine Analysis: Rule Engine & Grounded Model Analysis`.
5. **Grounding & Scoring**:
   - `groundFlags(modelFlags, originalMaskedText)` verifies verbatim substrings in `/lib/grounding.ts`.
   - `mergeFlags(groundedModelFlags, ruleSignals)` unites flags and sorts non-overlapping character spans.
   - `calculateVerdict(ruleSignals, groundedModelFlags)` in `/lib/scoring.ts` calculates final score, verdict, and urgency.
   - Ref: `prd.md > Verbatim Evidence Highlighting & Grounding` & `prd.md > Deterministic Scoring Function`.
6. **Side-by-Side Presentation**:
   - `DocumentViewer` renders original text with highlighted spans.
   - `VerdictCard`, `SummarySection`, `ChecklistSection`, and `ResponseDraft` render right-hand panel.
   - `rehydrate(draftText, tokenMap)` injects original personal identifiers back into the draft.
   - `LanguageSwitcher` toggles translations (English, Tamil, Hindi).
   - Ref: `prd.md > Side-by-Side Document Review` & `prd.md > Multi-Language Output`.

## Stack
- **Framework**: Next.js 15 (App Router, React 19).
  - *Rationale*: Server route handles API secrets without browser exposure; App Router provides zero-overhead client/server boundaries.
  - *Doc link*: [nextjs.org/docs](https://nextjs.org/docs)
- **Language**: TypeScript (strict mode enabled).
  - *Rationale*: Guarantees type safety across redaction tokens, signal objects, and Zod schemas.
  - *Doc link*: [typescriptlang.org/docs](https://www.typescriptlang.org/docs/)
- **Styling**: Tailwind CSS v3/v4 with custom typography and color tokens.
  - *Rationale*: High control over responsive layout, typography, and contrast tokens without heavy CSS runtimes.
  - *Doc link*: [tailwindcss.com/docs](https://tailwindcss.com/docs)
- **AI SDK**: `@google/genai` (official Google Gen AI SDK) or `@google/generative-ai`.
  - *Rationale*: Direct access to Gemini 2.0 Flash / 1.5 Flash structured output and system instructions on free tier.
  - *Doc link*: [ai.google.dev/docs](https://ai.google.dev/docs)
- **Schema Validation**: Zod (`zod`).
  - *Rationale*: Runtime validation of model JSON output, request bodies, and internal state.
  - *Doc link*: [zod.dev](https://zod.dev)
- **Icons**: Lucide React (`lucide-react`).
  - *Rationale*: Clean, minimal SVG icons matching the restrained editorial tone (no emojis).
  - *Doc link*: [lucide.dev](https://lucide.dev)
- **Test Framework**: Vitest (`vitest`).
  - *Rationale*: Fast native ESM unit testing for pure TypeScript modules (`/lib`).
  - *Doc link*: [vitest.dev](https://vitest.dev)

## Where It Runs and How Someone Tries It
- **Runtime**: Node.js 18+ (tested on Node 20 / 22), local web server, and modern Evergreen browser (Chrome, Firefox, Safari, Edge).
- **Environment Variables**:
  - `GEMINI_API_KEY`: Google AI Studio API key (free tier, required for AI analysis).
  - `GEMINI_MODEL`: Model name (default `gemini-2.0-flash`, configurable to `gemini-1.5-flash`).
- **Start Command**:
  ```bash
  npm install
  npm run dev
  ```
  Open `http://localhost:3000` in a browser.
- **Demo Script**:
  1. Open app; pick `tax-scam-upi.txt` sample.
  2. Inspect the privacy redaction preview highlighting masked PAN and names.
  3. Click "Analyze Notice".
  4. Review "Likely scam" verdict, red urgency badge, days-remaining counter, and inline highlighted UPI ID.
  5. Toggle language to Tamil or Hindi to see localized summary and checklist.
  6. Inspect rehydrated response letter.
  7. Switch to `tax-genuine-143.txt` sample to show a calm green "Likely genuine" verdict.
- **Deployment**: Free tier on Vercel or Cloudflare Pages.
  - Add `GEMINI_API_KEY` and `GEMINI_MODEL` to project environment variables.

## Look and Feel
- **Color Tokens**:
  - `bg-canvas`: `#FAF9F5` (warm, archival off-white).
  - `text-primary`: `#18181B` (zinc-900, near-black).
  - `text-muted`: `#71717A` (zinc-500).
  - `border-subtle`: `#E4E4E7` (zinc-200).
  - `accent`: `#0F172A` (deep slate navy).
  - `status-scam`: Red `#DC2626` (bg: `#FEF2F2`, border: `#FCA5A5`).
  - `status-suspicious`: Amber `#D97706` (bg: `#FFFBEB`, border: `#FCD34D`).
  - `status-genuine`: Emerald `#16A34A` (bg: `#F0FDF4`, border: `#86EFAC`).
- **Typography**:
  - Headings: Serif (`Merriweather`, `Newsreader`, or fallback Georgia).
  - Body: Modern clean sans-serif (`Inter` or fallback system sans-serif).
  - Indic Scripts: `Noto Sans Tamil`, `Noto Sans Devanagari`.
- **Layout & Density**:
  - Generous editorial margins, document card with subtle 1px border and soft natural shadow (`box-shadow: 0 1px 3px rgba(0,0,0,0.05)`).
  - Zero glassmorphism, zero floating gradient blobs, zero AI sparkle icons.

## Components

### `NoticeInput`
- What it does: Controlled textarea for notice text entry, character counter (up to 10,000 chars), validation state, and submit trigger.
- Implements: `prd.md > Notice Input & Sample Library`.

### `SampleSelector`
- What it does: Horizontal list of 6 curated sample cards (tax, bank, customs, challan), with type badges and "Sample letter - fictional" labels. Selecting one auto-populates `NoticeInput`.
- Implements: `prd.md > Notice Input & Sample Library`.

### `RedactionPreview`
- What it does: Displays side-by-side or tabbed comparison of original notice vs. redacted text. Lists identified tokens (`[PERSON_1]`, `[PAN_1]`, etc.) with counts. Allows user to select unmasked words to redact them before proceeding.
- Implements: `prd.md > Client-Side Redaction & In-Memory Rehydration` and `prd.md > Explicit "What Will Be Sent" Preview`.

### `DocumentViewer`
- What it does: Renders the notice text with inline highlighted evidence spans. Hovering or clicking an evidence span reveals a tooltip/popover with the rule/model category and plain-language explanation.
- Implements: `prd.md > Side-by-Side Document Review` and `prd.md > Verbatim Evidence Highlighting & Grounding`.

### `VerdictCard`
- What it does: Displays the final consolidated verdict (**Likely genuine**, **Suspicious**, or **Likely scam**), confidence score (0–100%), urgency level badge (Red / Amber / Green), days-remaining counter, and one-sentence justification.
- Implements: `prd.md > Deterministic Scoring Function` and `prd.md > Side-by-Side Document Review`.

### `SummarySection`
- What it does: Displays the plain-language breakdown answering: What is this document? What does it ask? What happens if ignored?
- Implements: `prd.md > Side-by-Side Document Review`.

### `ChecklistSection`
- What it does: Interactive step-by-step checklist with checkboxes for the user to follow, including direct instructions on how to verify via official government/bank portals.
- Implements: `prd.md > Actionable Verification Checklist & Official Portals`.

### `ResponseDraft`
- What it does: Renders a formal drafted response letter or clarification request. Re-hydrates `[PERSON_1]` and other tokens with original local values. Includes a one-click "Copy to Clipboard" button.
- Implements: `prd.md > Localized Response Draft with Client Rehydration`.

### `LanguageSwitcher`
- What it does: Allows toggling output language between English (`en`), Tamil (`ta`), and Hindi (`hi`). Dynamically updates the content of `VerdictCard`, `SummarySection`, `ChecklistSection`, and `ResponseDraft`.
- Implements: `prd.md > Multi-Language Output`.

## Data Model

### Redaction Token Map (`/lib/redact.ts`)
```typescript
export interface RedactionResult {
  redactedText: string;
  tokenMap: Record<string, string>; // e.g. { "[PERSON_1]": "Rajesh Kumar", "[PAN_1]": "ABCDE1234F" }
  counts: Record<string, number>;    // e.g. { PERSON: 1, PAN: 1, PHONE: 2 }
}
```

### Signal Engine Findings (`/lib/signals.ts`)
```typescript
export type SignalSeverity = "critical" | "warning" | "info" | "positive";

export interface SignalFinding {
  id: string;
  category: "payment" | "threat" | "domain" | "sender" | "deadline" | "format";
  severity: SignalSeverity;
  quote: string;
  explanation: string;
  startIndex?: number;
  endIndex?: number;
}

export interface DeadlineInfo {
  extractedDate?: string;
  daysRemaining?: number;
  isExpired?: boolean;
  rawPhrase?: string;
}

export interface SignalEngineResult {
  findings: SignalFinding[];
  deadlineInfo?: DeadlineInfo;
  hasUpiOrCrypto: boolean;
  hasLookalikeDomain: boolean;
  hasUrgencyThreat: boolean;
  hasSenderMismatch: boolean;
  hasValidGovDomain: boolean;
}
```

### Gemini Structured Response Schema (`/lib/schema.ts`)
```typescript
import { z } from "zod";

export const LocalizedTextSchema = z.object({
  en: z.string(),
  ta: z.string(),
  hi: z.string(),
});

export const ModelFlagSchema = z.object({
  quote: z.string().describe("Exact verbatim substring from the notice text"),
  category: z.enum(["suspicious_demand", "threat_or_coercion", "unverified_contact", "procedural_anomaly", "official_marker"]),
  severity: z.enum(["critical", "warning", "info"]),
  explanation: LocalizedTextSchema,
});

export const AnalysisResponseSchema = z.object({
  noticeType: z.string().describe("e.g. Income Tax Assessment, Bank KYC, Courier Customs, Traffic Fine"),
  issuingAuthorityClaimed: z.string(),
  verdict: z.enum(["likely_genuine", "suspicious", "likely_scam"]),
  confidenceScore: z.number().min(0).max(100),
  oneSentenceReason: LocalizedTextSchema,
  urgencyLevel: z.enum(["low", "medium", "high"]),
  summary: z.object({
    whatThisIs: LocalizedTextSchema,
    whatItDemands: LocalizedTextSchema,
    consequenceIfIgnored: LocalizedTextSchema,
  }),
  flags: z.array(ModelFlagSchema),
  checklist: z.array(z.object({
    step: z.number(),
    action: LocalizedTextSchema,
    isOfficialChannel: z.boolean(),
  })),
  draftReply: LocalizedTextSchema,
});

export type AnalysisResponse = z.infer<typeof AnalysisResponseSchema>;
```

### Combined Grounded Analysis (`/lib/scoring.ts`)
```typescript
export interface GroundedFlag {
  id: string;
  quote: string;
  startIndex: number;
  endIndex: number;
  category: string;
  severity: "critical" | "warning" | "info" | "positive";
  source: "rule" | "model";
  explanation: { en: string; ta: string; hi: string };
}

export interface FinalAnalysisResult {
  verdict: "likely_genuine" | "suspicious" | "likely_scam";
  confidenceScore: number;
  urgencyLevel: "low" | "medium" | "high";
  oneSentenceReason: { en: string; ta: string; hi: string };
  daysRemaining?: number;
  isExpired?: boolean;
  summary: {
    whatThisIs: { en: string; ta: string; hi: string };
    whatItDemands: { en: string; ta: string; hi: string };
    consequenceIfIgnored: { en: string; ta: string; hi: string };
  };
  flags: GroundedFlag[];
  checklist: Array<{ step: number; action: { en: string; ta: string; hi: string }; isOfficialChannel: boolean }>;
  draftReply: { en: string; ta: string; hi: string };
}
```

## File Structure
```
Notice_Decoder/
├── .agents/skills/          # Installed Devpost Learn skills
├── .env.example             # Safe template with GEMINI_API_KEY & GEMINI_MODEL
├── .gitignore               # Secrets, learner profile, build artifacts
├── devpost/                 # Devpost skill artifacts
│   ├── learner-profile.md
│   ├── scope.md
│   ├── prd.md
│   ├── spec.md
│   └── checklist.md
├── scope.md                 # Root copy per user instructions
├── prd.md                   # Root copy per user instructions
├── spec.md                  # Root copy per user instructions
├── package.json             # Next.js, React, Tailwind, Vitest, Zod, @google/genai
├── tsconfig.json            # Strict TypeScript configuration
├── next.config.ts           # Next.js configuration with security headers
├── tailwind.config.ts       # Tailwind CSS configuration with editorial palette
├── postcss.config.mjs       # PostCSS configuration
├── app/
│   ├── layout.tsx           # Root layout with Noto Sans & Newsreader fonts
│   ├── page.tsx             # Main interactive application page
│   ├── globals.css          # Core CSS variables, typography, and highlight styles
│   └── api/
│       └── analyze/
│           └── route.ts     # POST endpoint calling Gemini with Zod & rate limit
├── components/
│   ├── Header.tsx           # Editorial header with trust mark
│   ├── NoticeInput.tsx      # Textarea with character count & submit button
│   ├── SampleSelector.tsx   # Chips for 6 fictional samples
│   ├── RedactionPreview.tsx # Privacy comparison card & manual mask tools
│   ├── DocumentViewer.tsx   # Text viewer with grounded highlight tooltips
│   ├── VerdictCard.tsx      # Verdict banner, urgency, confidence, deadline
│   ├── SummarySection.tsx   # What it is, demands, consequences
│   ├── ChecklistSection.tsx # Official verification checklist with checkboxes
│   ├── ResponseDraft.tsx    # Rehydrated response draft with copy button
│   └── LanguageSwitcher.tsx # English / Tamil / Hindi language pill switcher
├── lib/
│   ├── redact.ts            # Regex & heuristic PII detection & rehydrate()
│   ├── signals.ts           # Deterministic rule engine & domain allowlists
│   ├── grounding.ts         # Verbatim quote substring matcher & range merger
│   ├── scoring.ts           # Deterministic composite scoring function
│   ├── schema.ts            # Zod response validation schemas
│   ├── rate-limit.ts        # In-memory IP/token rate limiter
│   └── official-domains.ts  # Verified government & bank domain allowlist
├── samples/
│   ├── index.ts             # Sample registry with metadata
│   ├── tax-scam-upi.txt     # Income tax scam demanding UPI payment
│   ├── tax-genuine-143.txt  # Genuine Section 143(1) intimation
│   ├── bank-kyc-scam.txt    # Bank account suspension phishing SMS
│   ├── courier-customs.txt  # Fake courier customs clearance fee demand
│   ├── echallan-scam.txt    # Traffic e-challan SMS with lookalike domain
│   └── bank-genuine.txt     # Genuine bank notification with netbanking guidance
├── tests/
│   ├── redact.test.ts       # Vitest tests for masking and rehydration
│   ├── signals.test.ts      # Vitest tests for payment, lookalike, and threat rules
│   ├── grounding.test.ts    # Vitest tests for quote verification and highlight spans
│   ├── scoring.test.ts      # Vitest tests for deterministic scoring logic
│   └── deadline.test.ts     # Vitest tests for deadline parsing and day math
└── README.md                # Comprehensive documentation, Mermaid diagrams, setup
```

## External Services and Dependencies
- **Google AI Studio Gemini API**:
  - Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` (via official SDK).
  - Model: `process.env.GEMINI_MODEL || "gemini-2.0-flash"` (or `gemini-1.5-flash`).
  - Auth: `GEMINI_API_KEY` passed via server-side environment variable.
  - Rate limits: 15 Requests Per Minute (RPM), 1,500 Requests Per Day (RPD) on the free tier.
  - Cost: Free tier ($0.00).
  - Documentation: [ai.google.dev/pricing](https://ai.google.dev/pricing)
- **Local In-Memory Rate Limiter**:
  - Restricts clients to 10 requests per minute per IP to protect the free tier Gemini API key from exhaustion. Zero external infrastructure.

## Important Failure Modes
1. **Gemini API Key Missing or Invalid**:
   - Fallback: The API route detects missing/unauthorized key and falls back to a 100% deterministic rule-based analysis. The UI displays an informative banner: *"Running in offline rule-based mode (AI key not configured)."*
2. **Model Returns Malformed JSON or Hallucinated Schema**:
   - Fallback: The route catches Zod validation errors, retries the request once with a corrective prompt. If validation fails again, it gracefully constructs a valid analysis from the rule engine findings and informs the user.
3. **Model Quotes Hallucinated Text**:
   - Fallback: `groundFlags()` runs substring search on the submitted text. Any flag whose quote is not present verbatim is silently dropped.
4. **Input Exceeds Length Limit (>10,000 characters)**:
   - Fallback: Client prevents submission with a clear character counter; server rejects payloads exceeding 10,000 characters with HTTP 400.

## What Was Simplified and Why
- **In-Memory Rate Limiting** instead of Redis / Upstash: Avoids external cloud accounts, setup complexity, and billing, keeping setup under 3 minutes for evaluators.
- **Pure Regex/Heuristic Redaction** instead of client-side BERT / Spacy WASM: Keeps bundle size under 200KB, runs in sub-10ms with zero loading delay on mobile devices, and handles standard Indian identifiers (PAN, Aadhaar, Phone, Email) cleanly.
- **Client-Side Rehydration** instead of server state: Zero database or session storage required. Keeps the token map in browser memory and avoids application-managed server persistence; it does not guarantee that heuristic redaction catches every identifier.

## Decisions and Open Issues
- **Free-Tier Model Choice**: Selected `gemini-2.0-flash` as the default model due to its speed, exceptional structured JSON following, and free tier availability, while allowing user override to `gemini-1.5-flash` via `GEMINI_MODEL`.
- **Edit Distance Threshold**: Set Levenshtein distance `<= 2` on lookalike domain detection against the allowlist (`incometax.gov.in`, `parivahan.gov.in`, `sbi.co.in`, etc.) to reliably catch fraudulent typosquatting domains.
- **Tamil and Hindi Localization**: Model outputs multi-lingual content directly in a single pass to minimize latency and token usage.
- All consequential technical decisions are agreed upon and documented.
