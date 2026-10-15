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
  excludeContext?: RegExp;
}

// Rules ordered by specificity: contextual patterns first so generic numbers aren't misattributed
const RULES: RedactionRule[] = [
  // 1. Bank Account Numbers preceded by keywords (Contextual - high priority)
  {
    type: "ACCOUNT",
    pattern: /(?:(?:Bank\s+)?A\/C|Account|Acct|Saving(?:s)?\s+A\/c|Current\s+A\/c|Account\s+No\.?|A\/C\s+No\.?)\s*(?:is|:|-)?\s*(\b\d{9,18}\b)/gi,
    captureGroup: 1,
  },
  {
    type: "ACCOUNT",
    pattern:
      /(?:(?:Bank\s+)?A\/C|Account|Acct|Saving(?:s)?\s+A\/c|Current\s+A\/c|Account\s+No\.?|A\/C\s+No\.?)\s*(?:is|:|-)?\s*(\b\d[\d -]{7,25}\d\b)/gi,
    captureGroup: 1,
  },
  // 2. Names following formal salutations and bureaucratic headers (Contextual)
  {
    type: "PERSON",
    pattern:
      /(?:Dear[ \t]+|To,[ \t]*|To:[ \t]*|Shri[ \t]+|Smt\.?[ \t]+|Mr\.?[ \t]+|Mrs\.?[ \t]+|Ms\.?[ \t]+|Dr\.?[ \t]+|திரு\.?[ \t]+|திருமதி[ \t]+|श्री[ \t]+|श्रीमती[ \t]+|सुश्री[ \t]+|श्रीमान[ \t]+|(?:Name(?: of Assessee)?|Applicant Name|Taxpayer Name|Account Holder|Customer Name|Vehicle Owner|Addressed To)[ \t]*:[ \t]*)([\p{L}\p{M}][\p{L}\p{M}'’-]*(?:[ \t]+[\p{L}\p{M}][\p{L}\p{M}'’-]*){0,3})/giu,
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
    pattern:
      /(?:Residential Address|Address|Residing at|Premises)[ \t]*:[ \t]*([^\r\n]+)/gi,
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
  // 8. Aadhaar values: grouped values may be recognized without a label; ungrouped
  // twelve-digit values require an explicit Aadhaar label to avoid masking references.
  {
    type: "AADHAAR",
    pattern: /Aadhaar(?:\s+(?:No\.?|number|card))?[ \t:=-]*(\d{4}(?:[ \t-]?\d{4}){2})\b/gi,
    captureGroup: 1,
  },
  {
    type: "AADHAAR",
    pattern: /\b(\d{4}[ \t-]\d{4}[ \t-]\d{4})\b/g,
    captureGroup: 1,
    excludeContext:
      /\b(?:DIN|document identification number|reference(?:\s+(?:number|no\.?))?|ref(?:\s+no\.?)?|account(?:\s+(?:number|no\.?))?|acct|a\/c|transaction(?:\s+(?:id|reference|ref))?|section|amount|total|issued\s+on|date(?:\s+of\s+issue)?)\s*[:#=-]?\s*$/i,
  },
  // 9. Indian mobile numbers, including common grouped forms and country/trunk prefixes.
  {
    type: "PHONE",
    pattern:
      /(?<!\d)(?:\+91[ \t-]?(?:0[ \t-]?)?|0)?[6-9]\d{4}[ \t-]?\d{5}\b/g,
  },
  // Indian landlines with STD codes, plus a conservative international format.
  {
    type: "PHONE",
    pattern:
      /(?<!\d)(?:\+91[ \t-]?(?:0?[1-9]\d{1,3})|0[1-9]\d{1,3})[ \t-]?\d{3,4}[ \t-]?\d{3,4}\b/g,
  },
  {
    type: "PHONE",
    pattern:
      /(?<!\d)\+[1-9]\d{0,2}[ \t-]?(?:\(\d{1,4}\)|\d{1,4})[ \t-]?\d{3,4}[ \t-]?\d{3,4}\b/g,
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
  const replacements: Array<{ start: number; end: number; token: string }> = [];

  for (const rule of RULES) {
    const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const context = text.slice(Math.max(0, match.index - 60), match.index);
      if (rule.excludeContext?.test(context)) continue;

      const captured = rule.captureGroup ? match[rule.captureGroup] : match[0];
      if (!captured) continue;

      const original = captured.trim();
      if (
        original.length <= 1 ||
        original.startsWith("[") ||
        (rule.type === "PERSON" && !isLikelyPersonName(original)) ||
        (rule.type === "ACCOUNT" &&
          (original.replace(/\D/g, "").length < 9 ||
            original.replace(/\D/g, "").length > 18))
      ) {
        continue;
      }

      const matchStart = match.index + match[0].indexOf(captured);
      const positions: number[] = [matchStart];
      if (rule.type !== "ACCOUNT") {
        let searchFrom = 0;
        let start = text.indexOf(original, searchFrom);
        while (start !== -1) {
          if (start !== matchStart) positions.push(start);
          searchFrom = start + original.length;
          start = text.indexOf(original, searchFrom);
        }
      }

      for (const start of positions) {
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

function isLikelyPersonName(value: string): boolean {
  const normalized = value.toLocaleLowerCase();
  return !new Set([
    "sir",
    "madam",
    "officer",
    "customer",
    "taxpayer",
    "assessee",
    "applicant",
    "account holder",
  ]).has(normalized);
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
