/**
 * Best-effort scan for common high-confidence identifiers that remain in the
 * exact masked text prepared for submission. This intentionally returns only
 * category/count metadata, never the matched values.
 */
export interface PrivacyScanFinding {
  category: string;
  count: number;
}

const RESIDUAL_PATTERNS: Array<{ category: string; pattern: RegExp }> = [
  { category: "Email address", pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi },
  { category: "PAN-like identifier", pattern: /\b[A-Z]{5}[0-9]{4}[A-Z]\b/gi },
  { category: "IFSC code", pattern: /\b[A-Z]{4}0[A-Z0-9]{6}\b/gi },
  { category: "Phone number", pattern: /(?:\+91[\s-]?)?\b[6-9][0-9]{9}\b/g },
  { category: "Spaced 12-digit identifier", pattern: /\b[0-9]{4}[\s-][0-9]{4}[\s-][0-9]{4}\b/g },
  { category: "12-digit identifier", pattern: /\b[0-9]{12}\b/g },
  {
    category: "Account number near account label",
    pattern: /\b(?:bank\s+)?(?:a\/c|account|acct)(?:\s+no\.?)?\s*(?:is|:|-)?\s*[0-9]{9,18}\b/gi,
  },
  {
    category: "Postal PIN near postal label",
    pattern: /\b(?:pin(?:\s*code)?|pincode|postal\s+code|zip(?:\s*code)?)\s*[:\-]?\s*[1-9][0-9]{5}\b/gi,
  },
];

export function scanResidualSensitiveData(text: string): PrivacyScanFinding[] {
  if (!text) return [];

  const findings: PrivacyScanFinding[] = [];
  for (const { category, pattern } of RESIDUAL_PATTERNS) {
    pattern.lastIndex = 0;
    let count = 0;
    while (pattern.exec(text) !== null) count += 1;
    if (count > 0) findings.push({ category, count });
  }

  return findings;
}
