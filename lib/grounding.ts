/**
 * Evidence Grounding Module (lib/grounding.ts)
 *
 * Enforces strict evidence verification:
 * 1. Every cited quote from model flags is tested against the original notice text.
 * 2. Matches are verified with whitespace normalization.
 * 3. Any flag whose quote cannot be found verbatim in the submitted notice is dropped.
 * 4. Model flags and rule-based findings are merged.
 * 5. Overlapping character spans are de-duplicated and segmented for UI rendering.
 */

import { SignalFinding } from "./signals";

export interface GroundedFlag {
  id: string;
  quote: string;
  startIndex: number;
  endIndex: number;
  category: string;
  severity: "critical" | "warning" | "info" | "positive";
  source: "rule" | "model";
  explanation: {
    en: string;
    ta: string;
    hi: string;
  };
}

export interface TextSegment {
  text: string;
  startIndex: number;
  endIndex: number;
  flag?: GroundedFlag;
}

/**
 * Normalizes all contiguous whitespace (spaces, tabs, newlines, non-breaking spaces)
 * into a single space for robust substring matching.
 */
export function normalizeWhitespace(str: string): string {
  return str.replace(/\s+/g, " ").trim();
}

/**
 * Locates the exact character offsets of a quote in the source text.
 * Supports exact match as well as whitespace-normalized fuzzy positioning.
 */
export function findVerbatimQuote(
  fullText: string,
  quote: string
): { found: boolean; startIndex: number; endIndex: number; exactMatch: string } {
  if (!fullText || !quote) {
    return { found: false, startIndex: -1, endIndex: -1, exactMatch: "" };
  }

  const trimmedQuote = quote.trim();
  if (trimmedQuote.length === 0) {
    return { found: false, startIndex: -1, endIndex: -1, exactMatch: "" };
  }

  // 1. Direct exact substring match
  const directIndex = fullText.indexOf(trimmedQuote);
  if (directIndex !== -1) {
    return {
      found: true,
      startIndex: directIndex,
      endIndex: directIndex + trimmedQuote.length,
      exactMatch: fullText.slice(directIndex, directIndex + trimmedQuote.length),
    };
  }

  // 2. Case-insensitive exact substring match
  const lowerFull = fullText.toLowerCase();
  const lowerQuote = trimmedQuote.toLowerCase();
  const caseIndex = lowerFull.indexOf(lowerQuote);
  if (caseIndex !== -1) {
    return {
      found: true,
      startIndex: caseIndex,
      endIndex: caseIndex + trimmedQuote.length,
      exactMatch: fullText.slice(caseIndex, caseIndex + trimmedQuote.length),
    };
  }

  // 3. Whitespace-normalized alignment search
  // Escape regex special characters in each word of quote and join with \s+
  const words = trimmedQuote.split(/\s+/).filter(Boolean);
  if (words.length > 0) {
    const escapedWords = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const regex = new RegExp(escapedWords.join("\\s+"), "i");
    const match = regex.exec(fullText);
    if (match) {
      return {
        found: true,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        exactMatch: match[0],
      };
    }
  }

  return { found: false, startIndex: -1, endIndex: -1, exactMatch: "" };
}

/**
 * Validates an array of model-suggested flags.
 * Any flag failing verbatim quote matching is dropped.
 */
export function groundModelFlags(
  modelFlags: Array<{
    quote: string;
    category: string;
    severity: "critical" | "warning" | "info" | "positive";
    explanation: { en: string; ta: string; hi: string };
  }>,
  fullText: string
): GroundedFlag[] {
  const verifiedFlags: GroundedFlag[] = [];

  for (let i = 0; i < modelFlags.length; i++) {
    const flag = modelFlags[i];
    const match = findVerbatimQuote(fullText, flag.quote);

    if (match.found) {
      verifiedFlags.push({
        id: `model-grounded-${i}`,
        quote: match.exactMatch,
        startIndex: match.startIndex,
        endIndex: match.endIndex,
        category: flag.category,
        severity: flag.severity,
        source: "model",
        explanation: flag.explanation,
      });
    }
    // Note: If match.found is false, the flag is DROPPED.
  }

  return verifiedFlags;
}

/**
 * Merges verified model flags with rule-based signal findings.
 * Removes duplicates and resolves overlapping character ranges.
 */
export function mergeAndDeDuplicateFlags(
  groundedModelFlags: GroundedFlag[],
  ruleFindings: SignalFinding[],
  fullText: string
): GroundedFlag[] {
  const merged: GroundedFlag[] = [...groundedModelFlags];

  // Ground rule findings
  for (let i = 0; i < ruleFindings.length; i++) {
    const rf = ruleFindings[i];
    const match = findVerbatimQuote(fullText, rf.quote);
    if (match.found) {
      // Check if an existing model flag already covers this exact range or quote
      const duplicate = merged.find(
        (m) =>
          m.quote === match.exactMatch ||
          (Math.abs(m.startIndex - match.startIndex) <= 2 &&
            Math.abs(m.endIndex - match.endIndex) <= 2)
      );

      if (!duplicate) {
        merged.push({
          id: `rule-grounded-${i}`,
          quote: match.exactMatch,
          startIndex: match.startIndex,
          endIndex: match.endIndex,
          category: rf.category,
          severity: rf.severity,
          source: "rule",
          explanation: rf.explanation,
        });
      }
    }
  }

  // Sort by start index ascending
  merged.sort((a, b) => a.startIndex - b.startIndex);

  // Filter overlapping ranges (keep higher severity: critical > warning > positive > info)
  const severityRank: Record<string, number> = {
    critical: 4,
    warning: 3,
    positive: 2,
    info: 1,
  };

  const nonOverlapping: GroundedFlag[] = [];
  let lastEnd = -1;

  for (const flag of merged) {
    if (flag.startIndex >= lastEnd) {
      nonOverlapping.push(flag);
      lastEnd = flag.endIndex;
    } else {
      // Overlap detected: compare with previous flag
      const prev = nonOverlapping[nonOverlapping.length - 1];
      const prevRank = severityRank[prev.severity] || 0;
      const currentRank = severityRank[flag.severity] || 0;

      if (currentRank > prevRank) {
        // Replace previous flag with higher-severity flag
        nonOverlapping[nonOverlapping.length - 1] = flag;
        lastEnd = flag.endIndex;
      }
      // Otherwise skip the lower-severity overlapping flag
    }
  }

  return nonOverlapping;
}

/**
 * Slices the full original notice text into sequential rendered segments
 * (plain text and highlighted flag spans) for rendering in DocumentViewer.
 */
export function computeTextSegments(
  fullText: string,
  flags: GroundedFlag[]
): TextSegment[] {
  if (!fullText) return [];
  if (!flags || flags.length === 0) {
    return [{ text: fullText, startIndex: 0, endIndex: fullText.length }];
  }

  const sortedFlags = [...flags].sort((a, b) => a.startIndex - b.startIndex);
  const segments: TextSegment[] = [];
  let cursor = 0;

  for (const flag of sortedFlags) {
    if (flag.startIndex > cursor) {
      segments.push({
        text: fullText.slice(cursor, flag.startIndex),
        startIndex: cursor,
        endIndex: flag.startIndex,
      });
    }

    segments.push({
      text: fullText.slice(flag.startIndex, flag.endIndex),
      startIndex: flag.startIndex,
      endIndex: flag.endIndex,
      flag,
    });

    cursor = flag.endIndex;
  }

  if (cursor < fullText.length) {
    segments.push({
      text: fullText.slice(cursor),
      startIndex: cursor,
      endIndex: fullText.length,
    });
  }

  return segments;
}
