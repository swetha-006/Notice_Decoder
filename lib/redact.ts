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
  captureGroup?: number;
}

// Rules ordered by specificity: contextual patterns first so generic numbers aren't misattributed
const RULES: RedactionRule[] = [
  // 1. Bank Account Numbers preceded by keywords (Contextual - high priority)
  {
    type: "ACCOUNT",
    pattern: /(?:(?:Bank\s+)?A\/C|Account|Acct|Saving(?:s)?\s+A\/c|Current\s+A\/c|Account\s+No\.?|A\/C\s+No\.?)\s*(?:is|:|-)?\s*(\b\d{9,18}\b)/gi,
    captureGroup: 1,
  },
  // 2. Names following formal salutations and bureaucratic headers (Contextual)
  {
    type: "PERSON",
    pattern: /(?:Dear|To,\s*|To:\s*|Shri|Smt\.?|Mr\.?|Mrs\.?|Ms\.?|Dr\.?|Name of Assessee:\s*|Taxpayer Name:\s*|Account Holder:\s*|Customer Name:\s*|Vehicle Owner:\s*)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){1,3})/g,
    captureGroup: 1,
  },
  // 3. Indian Postal PIN Codes preceded by keywords (Contextual)
  {
    type: "PIN",
    pattern: /(?:PIN|Pincode|PIN\s+Code|Postal\s+Code|Zip|Zipcode)[\s:-]*(\b[1-9][0-9]{5}\b)/gi,
    captureGroup: 1,
  },
  // 4. Physical address lines (Contextual)
  {
    type: "ADDRESS",
    pattern: /(?:Address:\s*|Residing at:\s*|Premises:\s*)([^\n,]+,\s*[^\n,]+(?:,\s*[^\n,]+)?)/gi,
    captureGroup: 1,
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
    captureGroup: 1,
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
  const processedValues = new Set<string>();
  const replacements: Array<{ start: number; end: number; token: string }> = [];

  for (const rule of RULES) {
    const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const captured = rule.captureGroup ? match[rule.captureGroup] : match[0];
      if (!captured) continue;

      const original = captured.trim();
      if (
        original.length <= 1 ||
        original.startsWith("[") ||
        processedValues.has(original)
      ) {
        continue;
      }
      processedValues.add(original);

      let searchFrom = 0;
      let start = text.indexOf(original, searchFrom);
      while (start !== -1) {
        const end = start + original.length;
        const overlaps = replacements.some(
          (replacement) => start < replacement.end && end > replacement.start
        );

        if (!overlaps) {
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

          replacements.push({ start, end, token });
        }

        searchFrom = end;
        start = text.indexOf(original, searchFrom);
      }
    }
  }

  replacements.sort((left, right) => left.start - right.start);
  let cursor = 0;
  const redactedParts: string[] = [];
  for (const replacement of replacements) {
    redactedParts.push(
      text.slice(cursor, replacement.start),
      replacement.token
    );
    cursor = replacement.end;
  }
  redactedParts.push(text.slice(cursor));

  return {
    redactedText: redactedParts.join(""),
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
  let customCount = 1;
  let token = `[CUSTOM_${customCount}]`;
  while (existingTokens.includes(token) || text.includes(token)) {
    customCount += 1;
    token = `[CUSTOM_${customCount}]`;
  }

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
  const entries = Object.entries(tokenMap).filter(([token]) => token.length > 0);
  if (entries.length === 0) return draft;

  const replacements = new Map(entries);
  const tokenPattern = new RegExp(
    entries
      .map(([token]) => token)
      .sort((left, right) => right.length - left.length)
      .map(escapeRegExp)
      .join("|"),
    "g"
  );

  return draft.replace(tokenPattern, (token) => replacements.get(token) ?? token);
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
