import { describe, expect, it } from "vitest";
import { extractDeadline } from "@/lib/deadline";

describe("explicit deadline extraction", () => {
  const mockNow = new Date("2026-10-15T00:00:00Z");

  it("anchors relative day periods to the issue date", () => {
    const deadline = extractDeadline(
      "Date of Issue: 10/10/2026. Please respond within 15 days.",
      mockNow
    );

    expect(deadline).toMatchObject({
      rawPhrase: "within 15 days",
      extractedDate: "25/10/2026",
      daysRemaining: 10,
      isExpired: false,
    });
  });

  it("keeps a relative phrase but omits countdown without an issue date", () => {
    expect(extractDeadline("Please respond within 15 days.", mockNow)).toEqual({
      rawPhrase: "within 15 days",
    });
  });

  it("supports 48-hour periods relative to the issue date", () => {
    const deadline = extractDeadline(
      "Issued on 14/10/2026. Pay within 48 hours.",
      mockNow
    );

    expect(deadline).toMatchObject({
      rawPhrase: "within 48 hours",
      extractedDate: "16/10/2026",
      daysRemaining: 1,
      isExpired: false,
    });
  });

  it.each([
    ["on or before 25/10/2026", "25/10/2026"],
    ["by 25-10-2026", "25-10-2026"],
    ["last date: 25 October 2026", "25 October 2026"],
    ["due date is 25th October 2026", "25th October 2026"],
    ["pay by 25/10/2026", "25/10/2026"],
    ["respond by 25/10/2026", "25/10/2026"],
  ])("extracts explicit due phrase %s", (phrase, date) => {
    expect(extractDeadline(`Submit your response ${phrase}.`, mockNow)).toMatchObject({
      extractedDate: date,
      daysRemaining: 10,
      isExpired: false,
    });
  });

  it("rejects invalid calendar dates instead of normalizing them", () => {
    expect(extractDeadline("Respond by 31/02/2026.", mockNow)).toBeUndefined();
  });

  it("does not treat incidental dates or an issue date as a deadline", () => {
    expect(
      extractDeadline("Date of Issue: 10/10/2026. Issued on 10/10/2026.", mockNow)
    ).toBeUndefined();
  });

  it("reports expired dates with a negative day count", () => {
    expect(
      extractDeadline("Last date for appeal: 10/10/2026.", mockNow)
    ).toMatchObject({
      extractedDate: "10/10/2026",
      daysRemaining: -5,
      isExpired: true,
    });
  });
});
