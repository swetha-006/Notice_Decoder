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
  {
    category: "Phone number",
    pattern:
      /(?<!\d)(?:\+91[ \t-]?(?:0[ \t-]?)?|0)?[6-9]\d{4}[ \t-]?\d{5}\b|(?<!\d)(?:\+91[ \t-]?(?:0?[1-9]\d{1,3})|0[1-9]\d{1,3})[ \t-]?\d{3,4}[ \t-]?\d{3,4}\b|(?<!\d)\+[1-9]\d{0,2}[ \t-]?(?:\(\d{1,4}\)|\d{1,4})[ \t-]?\d{3,4}[ \t-]?\d{3,4}\b/g,
  },
  {
    category: "Aadhaar-style identifier",
    pattern:
      /\b(?:Aadhaar(?:\s+(?:No\.?|number|card))?[ \t:=-]*\d{4}(?:[ \t-]?\d{4}){2}|\d{4}[ \t-]\d{4}[ \t-]\d{4})\b/gi,
  },
  {
    category: "Account number near account label",
    pattern:
      /\b(?:bank\s+)?(?:a\/c|account|acct)(?:\s+no\.?)?\s*(?:is|:|-)?\s*(?=(?:\d[ -]?){8,17}\d\b)\d[\d -]{7,25}\d\b/gi,
  },
  {
    category: "Name following a name label",
    pattern:
      /(?:Dear[ \t]+|To,[ \t]*|To:[ \t]*|Shri[ \t]+|Smt\.?[ \t]+|Mr\.?[ \t]+|Mrs\.?[ \t]+|Ms\.?[ \t]+|Dr\.?[ \t]+|திரு\.?[ \t]+|திருமதி[ \t]+|श्री[ \t]+|श्रीमती[ \t]+|सुश्री[ \t]+|श्रीमान[ \t]+|Name(?: of Assessee)?[ \t]*:[ \t]*|Applicant Name[ \t]*:[ \t]*|Taxpayer Name[ \t]*:[ \t]*|Account Holder[ \t]*:[ \t]*|Customer Name[ \t]*:[ \t]*|Vehicle Owner[ \t]*:[ \t]*|Addressed To[ \t]*:[ \t]*|Address[ \t]*:[ \t]*)(?!\[|Sir\b|Madam\b|Officer\b|Customer\b|Taxpayer\b|Assessee\b)(?:[\p{L}\p{M}][\p{L}\p{M}'’-]*(?:[ \t]+[\p{L}\p{M}][\p{L}\p{M}'’-]*){0,3})/giu,
  },
  {
    category: "Postal PIN near postal label",
    pattern: /\b(?:pin(?:\s*code)?|pincode|postal\s+code|zip(?:\s*code)?)\s*[:\-]?\s*[1-9][0-9]{5}\b/gi,
  },
];

const NON_AADHAAR_NUMERIC_CONTEXT =
  /\b(?:DIN|document identification number|reference(?:\s+(?:number|no\.?))?|ref(?:\s+no\.?)?|account(?:\s+(?:number|no\.?))?|acct|a\/c|transaction(?:\s+(?:id|reference|ref))?|section|amount|total|issued\s+on|date(?:\s+of\s+issue)?)\s*[:#=-]?\s*$/i;

export function scanResidualSensitiveData(text: string): PrivacyScanFinding[] {
  if (!text) return [];

  const findings: PrivacyScanFinding[] = [];
  for (const { category, pattern } of RESIDUAL_PATTERNS) {
    pattern.lastIndex = 0;
    let count = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      if (category === "Aadhaar-style identifier") {
        const context = text.slice(Math.max(0, match.index - 60), match.index);
        if (NON_AADHAAR_NUMERIC_CONTEXT.test(context)) continue;
      }
      count += 1;
    }
    if (count > 0) findings.push({ category, count });
  }

  return findings;
}
