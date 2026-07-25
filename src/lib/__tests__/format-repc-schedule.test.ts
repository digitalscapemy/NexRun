import { describe, expect, it } from "vitest";
import { formatRepcSchedule } from "../format-repc-schedule";

describe("formatRepcSchedule", () => {
  it("preserves the organizer-authored date label and appends its time", () => {
    expect(formatRepcSchedule("8 January 2027", "10:00 AM")).toBe(
      "8 January 2027, 10:00 AM",
    );
  });

  it("does not construct an invalid Date from a display label", () => {
    expect(formatRepcSchedule("8 January 2027", null)).toBe("8 January 2027");
    expect(formatRepcSchedule("  ", "10:00 AM")).toBeUndefined();
  });
});
