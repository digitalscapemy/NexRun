import { describe, it, expect } from "vitest";
import { cn, formatCurrency } from "../utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1");
  });

  it("resolves conflicts", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "extra")).toBe("base extra");
  });
});

describe("formatCurrency", () => {
  it("formats sen to RM", () => {
    expect(formatCurrency(5000)).toBe("RM 50.00");
  });

  it("formats with cents", () => {
    expect(formatCurrency(5150)).toBe("RM 51.50");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("RM 0.00");
  });

  it("formats large amounts", () => {
    expect(formatCurrency(1500000)).toBe("RM 15000.00");
  });
});
