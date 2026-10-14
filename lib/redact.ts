/**
 * Pure TypeScript In-Browser Redaction & Rehydration Module
 *
 * Runs locally in the user's browser before any text is sent over the network.
 * Detects and masks personal identifiers (PII):
 * - Bank Account numbers and IFSC codes (contextual)
 * - Names after salutations and administrative labels (contextual)
 * - Indian postal PIN codes (contextual)
 * - Physical address lines (contextual)
 * - Email addresses
 * - Indian PAN cards (e.g. ABCDE1234F)
 * - IFSC codes
 * - Aadhaar-style 12-digit numbers
 * - Phone numbers (Indian +91, 10-digit mobile, and international)
 *
 * Replaces matches with stable tokens ([PERSON_1], [PAN_1], etc.)
 * Keeps the token map strictly in browser memory.
 */

export interface RedactionResult {
  redactedText: string;
  tokenMap: Record<string, string>;
  counts: Record<string, number>;
  identifiedEntities: Array<{
    token: string;
    original: string;
    type: string;
  }>;
}

export interface RedactionRule {
  type: string;
  pattern: RegExp;
  extractMatch?: (match: RegExpExecArray) => string;
}

// Rules ordered by specificity: contextual patterns first so generic numbers aren't misattributed
const RULES: RedactionRule[] = [
  // 1. Bank Account Numbers preceded by keywords (Contextual - high priority)
  {
    type: "ACCOUNT",
    pattern: /(?:(?:Bank\s+)?A\/C|Account|Acct|Saving(?:s)?\s+A\/c|Current\s+A\/c|Account\s+No\.?|A\/C\s+No\.?)\s*(?:is|:|-)?\s*(\b\d{9,18}\b)/gi,
    extractMatch: (match) => match[1],
  },
  // 2. Names following formal salutations and bureaucratic headers (Contextual)
  {
    type: "PERSON",
    pattern: /(?:Dear|To,\s*|To:\s*|Shri|Smt\.?|Mr\.?|Mrs\.?|Ms\.?|Dr\.?|Name of Assessee:\s*|Taxpayer Name:\s*|Account Holder:\s*|Customer Name:\s*|Vehicle Owner:\s*)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){1,3})/g,
    extractMatch: (match) => match[1],
  },
  // 3. Indian Postal PIN Codes preceded by keywords (Contextual)
  {
    type: "PIN",
    pattern: /(?:PIN|Pincode|PIN\s+Code|Postal\s+Code|Zip|Zipcode)[\s:-]*(\b[1-9][0-9]{5}\b)/gi,
    extractMatch: (match) => match[1],
  },
  // 4. Physical address lines (Contextual)
  {
    type: "ADDRESS",
    pattern: /(?:Address:\s*|Residing at:\s*|Premises:\s*)([^\n,]+,\s*[^\n,]+(?:,\s*[^\n,]+)?)/gi,
    extractMatch: (match) => match[1],
  },
  // 5. Emails
  {
    type: "EMAIL",
    pattern: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g,
  },
  // 6. Indian PAN: 5 uppercase letters, 4 digits, 1 uppercase letter
  {
    type: "PAN",
    pattern: /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/g,
  },
  // 7. IFSC Code (e.g. SBIN0001234, HDFC0000456)
  {
    type: "IFSC",
    pattern: /\b[A-Z]{4}0[A-Z0-9]{6}\b/g,
  },
  // 8. Aadhaar-style 12-digit number (e.g. 1234 5678 9012 or 1234-5678-9012 or Aadhaar: 123456789012)
  {
    type: "AADHAAR",
    pattern: /(?:Aadhaar(?:\s+(?:No\.?|number))?[\s:-]*)?(\b\d{4}[\s-]\d{4}[\s-]\d{4}\b|\b\d{12}\b)/gi,
    extractMatch: (match) => match[1] || match[0],
  },
  // 9. Indian Phone Numbers (+91, 0, or raw 10-digit starting with 6,7,8,9) & International formats
  {
    type: "PHONE",
    pattern: /(?:\+91[\s-]?)?(?:(?:\b0?[6789]\d{9}\b)|(?:\b\+?[1-9]\d{1,2}[\s-]?(?:\(\d{1,4}\)|\d{1,4})[\s-]?\d{3,4}[\s-]?\d{3,4}\b))/g,
  },
];

/**
 * Detects and masks personal identifiers within notice text.
 * Returns the redacted text, token map, token counts, and entity list.
 */
export function redactNotice(text: string): RedactionResult {
  if (!text || typeof text !== "string") {
    return {
      redactedText: "",
      tokenMap: {},
      counts: {},
      identifiedEntities: [],
    };
  }

  const tokenMap: Record<string, string> = {}; // [TOKEN] -> original
  const reverseMap = new Map<string, string>(); // original -> [TOKEN]
  const counters: Record<string, number> = {};
  const identifiedEntities: Array<{ token: string; original: string; type: string }> = [];

  let redactedText = text;

  for (const rule of RULES) {
    const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
    let match: RegExpExecArray | null;

    const matches: Array<{ original: string }> = [];

    // Scan the current redactedText so earlier replacements are respected
    while ((match = regex.exec(redactedText)) !== null) {
      const original = rule.extractMatch ? rule.extractMatch(match) : match[0];
      if (original && original.trim().length > 1 && !original.startsWith("[")) {
        matches.push({ original: original.trim() });
      }
    }

    // Process unique matches for this rule
    for (const { original } of matches) {
      let token = reverseMap.get(original);

      if (!token) {
        const count = (counters[rule.type] || 0) + 1;
        counters[rule.type] = count;
        token = `[${rule.type}_${count}]`;

        reverseMap.set(original, token);
        tokenMap[token] = original;
        identifiedEntities.push({
          token,
          original,
          type: rule.type,
        });
      }

      const escaped = escapeRegExp(original);
      redactedText = redactedText.replace(new RegExp(escaped, "g"), token);
    }
  }

  return {
    redactedText,
    tokenMap,
    counts: counters,
    identifiedEntities,
  };
}

/**
 * Allows the user to manually mask any highlighted word/phrase before sending.
 */
export function manualMask(
  text: string,
  selection: string,
  existingTokenMap: Record<string, string>
): { redactedText: string; tokenMap: Record<string, string>; token: string } {
  const trimmed = selection.trim();
  if (!trimmed) {
    return { redactedText: text, tokenMap: existingTokenMap, token: "" };
  }

  const existingTokens = Object.keys(existingTokenMap);
  const customCount =
    existingTokens.filter((t) => t.startsWith("[CUSTOM_")).length + 1;
  const token = `[CUSTOM_${customCount}]`;

  const tokenMap = { ...existingTokenMap, [token]: trimmed };
  const escaped = escapeRegExp(trimmed);
  const redactedText = text.replace(new RegExp(escaped, "g"), token);

  return { redactedText, tokenMap, token };
}

/**
 * Replaces token placeholders in drafted replies back with their original values.
 * Runs 100% in-browser using the in-memory token map.
 */
export function rehydrate(
  draft: string,
  tokenMap: Record<string, string>
): string {
  if (!draft) return "";
  let result = draft;

  for (const [token, original] of Object.entries(tokenMap)) {
    const escaped = escapeRegExp(token);
    result = result.replace(new RegExp(escaped, "g"), original);
  }

  return result;
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
