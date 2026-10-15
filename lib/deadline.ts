export interface DeadlineInfo {
  extractedDate?: string;
  daysRemaining?: number;
  isExpired?: boolean;
  rawPhrase?: string;
}

const MONTHS: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

const DATE_SOURCE =
  String.raw`(?:\d{1,2}[/-]\d{1,2}[/-]\d{4}|\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+\s+\d{4})`;
const DAYS_IN_MS = 24 * 60 * 60 * 1000;

/**
 * Finds only dates attached to an explicit due-date phrase. Standalone issue
 * dates are read separately and are used only as anchors for relative periods.
 */
export function extractDeadline(
  text: string,
  referenceDate: Date = new Date()
): DeadlineInfo | undefined {
  const relativePattern = /\bwithin\s+(\d{1,4})\s+(days?|hours?)\b/gi;
  const relativeMatch = relativePattern.exec(text);
  const absolutePattern = new RegExp(
    String.raw`\b(?:on\s+or\s+before|last\s+date(?:\s+for\b[^:,\n]{0,40})?|due\s+date(?:\s+is)?|pay\s+by|respond\s+by|by)\s*[:,-]?\s*(${DATE_SOURCE})`,
    "gi"
  );
  const dateMatch = absolutePattern.exec(text);

  if (relativeMatch && (!dateMatch || relativeMatch.index <= dateMatch.index)) {
    const issueDate = extractIssueDate(text);
    if (!issueDate) return { rawPhrase: relativeMatch[0] };

    const amount = Number(relativeMatch[1]);
    const unit = relativeMatch[2].toLowerCase();
    const deadlineTime =
      issueDate.getTime() + amount * (unit.startsWith("hour") ? 60 * 60 * 1000 : DAYS_IN_MS);
    const daysRemaining = Math.ceil(
      (startOfUtcDay(deadlineTime).getTime() -
        startOfReferenceDay(referenceDate).getTime()) /
        DAYS_IN_MS
    );

    return {
      extractedDate: formatDate(new Date(deadlineTime)),
      daysRemaining,
      isExpired: daysRemaining < 0,
      rawPhrase: relativeMatch[0],
    };
  }

  if (!dateMatch) return undefined;

  const targetDate = parseCalendarDate(dateMatch[1]);
  if (!targetDate) return undefined;

  const daysRemaining = Math.round(
    (targetDate.getTime() - startOfReferenceDay(referenceDate).getTime()) /
      DAYS_IN_MS
  );
  return {
    extractedDate: dateMatch[1],
    daysRemaining,
    isExpired: daysRemaining < 0,
    rawPhrase: dateMatch[0],
  };
}

function extractIssueDate(text: string): Date | undefined {
  const issuePattern = new RegExp(
    String.raw`\b(?:date\s+of\s+issue|issue\s+date|issued\s+on|notice\s+date|communication\s+date)\s*[:,-]?\s*(${DATE_SOURCE})`,
    "i"
  );
  const match = issuePattern.exec(text);
  return match ? parseCalendarDate(match[1]) : undefined;
}

function parseCalendarDate(value: string): Date | undefined {
  const numericDate = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(value.trim());
  if (numericDate) {
    return makeUtcDate(
      Number(numericDate[3]),
      Number(numericDate[2]) - 1,
      Number(numericDate[1])
    );
  }

  const namedDate = /^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})$/i.exec(
    value.trim()
  );
  if (!namedDate) return undefined;

  const month = MONTHS[namedDate[2].toLowerCase()];
  if (month === undefined) return undefined;
  return makeUtcDate(Number(namedDate[3]), month, Number(namedDate[1]));
}

function makeUtcDate(year: number, month: number, day: number): Date | undefined {
  const date = new Date(Date.UTC(year, month, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month ||
    date.getUTCDate() !== day
  ) {
    return undefined;
  }
  return date;
}

function startOfUtcDay(date: Date | number): Date {
  const value = new Date(date);
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())
  );
}

function startOfReferenceDay(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

function formatDate(date: Date): string {
  return `${String(date.getUTCDate()).padStart(2, "0")}/${String(
    date.getUTCMonth() + 1
  ).padStart(2, "0")}/${date.getUTCFullYear()}`;
}
