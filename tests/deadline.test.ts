import { describe, it, expect } from "vitest";
import { extractDeadline } from "@/lib/signals";

describe("Deadline Extraction & Days Remaining Math (lib/signals.ts)", () => {
  const mockNow = new Date("2026-10-15T00:00:00Z");

  it("extracts 'within 24 hours' and calculates 1 day remaining", () => {
    const text = "Notice demands full settlement within 24 hours or face penalty.";
    const deadline = extractDeadline(text, mockNow);

    expect(deadline).toBeDefined();
    expect(deadline?.rawPhrase).toBe("within 24 hours");
    expect(deadline?.daysRemaining).toBe(1);
    expect(deadline?.isExpired).toBe(false);
  });

  it("extracts relative 'within X days' properly", () => {
    const text = "Please file your response within 15 days of receiving this notice.";
    const deadline = extractDeadline(text, mockNow);

    expect(deadline).toBeDefined();
    expect(deadline?.rawPhrase).toBe("within 15 days");
    expect(deadline?.daysRemaining).toBe(15);
    expect(deadline?.isExpired).toBe(false);
  });

  it("extracts future DD/MM/YYYY dates and calculates accurate days remaining", () => {
    // 10 days after Oct 15, 2026 is Oct 25, 2026
    const text = "Submit your response on or before 25/10/2026 to avoid penalty.";
    const deadline = extractDeadline(text, mockNow);

    expect(deadline).toBeDefined();
    expect(deadline?.extractedDate).toBe("25/10/2026");
    expect(deadline?.daysRemaining).toBe(10);
    expect(deadline?.isExpired).toBe(false);
  });

  it("identifies past dates as expired with negative daysRemaining", () => {
    // 5 days before Oct 15, 2026 is Oct 10, 2026
    const text = "Submit your response by 10/10/2026 to the assessing officer.";
    const deadline = extractDeadline(text, mockNow);

    expect(deadline).toBeDefined();
    expect(deadline?.extractedDate).toBe("10/10/2026");
    expect(deadline?.daysRemaining).toBeLessThan(0);
    expect(deadline?.isExpired).toBe(true);
  });
});
