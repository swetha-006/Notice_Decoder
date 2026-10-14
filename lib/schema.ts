import { z } from "zod";

export const LocalizedTextSchema = z.object({
  en: z.string().describe("English text"),
  ta: z.string().describe("Tamil translation (தமிழ்)"),
  hi: z.string().describe("Hindi translation (हिन्दी)"),
});

export type LocalizedText = z.infer<typeof LocalizedTextSchema>;

export const ModelFlagSchema = z.object({
  quote: z
    .string()
    .describe("Exact verbatim substring from the notice text. Do not paraphrase."),
  category: z.enum([
    "suspicious_demand",
    "threat_or_coercion",
    "unverified_contact",
    "procedural_anomaly",
    "official_marker",
  ]),
  severity: z.enum(["critical", "warning", "info", "positive"]),
  explanation: LocalizedTextSchema,
});

export type ModelFlag = z.infer<typeof ModelFlagSchema>;

export const ChecklistItemSchema = z.object({
  step: z.number(),
  action: LocalizedTextSchema,
  isOfficialChannel: z.boolean().describe("True if step instructs verification via official .gov.in portal"),
});

export type ChecklistItem = z.infer<typeof ChecklistItemSchema>;

export const AnalysisResponseSchema = z.object({
  noticeType: z.string().describe("e.g. Income Tax Demand, Bank KYC Notice, Traffic E-Challan, Courier Clearance"),
  issuingAuthorityClaimed: z.string().describe("e.g. Income Tax Department, State Bank of India, Delhi Traffic Police"),
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
  checklist: z.array(ChecklistItemSchema),
  draftReply: LocalizedTextSchema.describe(
    "Formal drafted response letter or clarification request with tokens like [PERSON_1], [PAN_1] preserved so they can be rehydrated locally."
  ),
});

export type AnalysisResponse = z.infer<typeof AnalysisResponseSchema>;

export const AnalyzeRequestSchema = z.object({
  maskedText: z
    .string()
    .min(10, "Notice text is too short to analyze.")
    .max(10000, "Notice text exceeds maximum allowed length of 10,000 characters."),
});

export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;
