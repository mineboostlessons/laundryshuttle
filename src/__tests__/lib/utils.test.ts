import { describe, it, expect } from "vitest";
import {
  cn,
  generateOrderNumber,
  formatCurrency,
  formatPhone,
} from "@/lib/utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("px-4", "py-2")).toBe("px-4 py-2");
  });

  it("deduplicates conflicting Tailwind classes", () => {
    expect(cn("px-4", "px-6")).toBe("px-6");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible");
  });

  it("handles undefined and null values", () => {
    expect(cn("base", undefined, null, "end")).toBe("base end");
  });
});

describe("generateOrderNumber", () => {
  it("generates order number with correct format", () => {
    const result = generateOrderNumber("FFL", 142);
    const year = new Date().getFullYear();
    expect(result).toBe(`FFL-${year}-00142`);
  });

  it("pads sequence to 5 digits", () => {
    const year = new Date().getFullYear();
    expect(generateOrderNumber("LS", 1)).toBe(`LS-${year}-00001`);
    expect(generateOrderNumber("LS", 99999)).toBe(`LS-${year}-99999`);
  });

  it("uppercases prefix", () => {
    const result = generateOrderNumber("abc", 1);
    expect(result).toMatch(/^ABC-/);
  });
});

describe("formatCurrency", () => {
  it("formats USD by default", () => {
    expect(formatCurrency(19.99)).toBe("$19.99");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("formats large numbers with commas", () => {
    expect(formatCurrency(1234.56)).toBe("$1,234.56");
  });

  it("rounds to two decimal places", () => {
    expect(formatCurrency(10.999)).toBe("$11.00");
  });
});

describe("formatPhone", () => {
  it("formats 10-digit phone number", () => {
    expect(formatPhone("2125551234")).toBe("(212) 555-1234");
  });

  it("formats 11-digit phone number with country code", () => {
    expect(formatPhone("12125551234")).toBe("+1 (212) 555-1234");
  });

  it("handles already formatted phone numbers", () => {
    expect(formatPhone("(212) 555-1234")).toBe("(212) 555-1234");
  });

  it("strips non-digit characters before formatting", () => {
    expect(formatPhone("212-555-1234")).toBe("(212) 555-1234");
  });

  it("returns original string for unrecognized formats", () => {
    expect(formatPhone("123")).toBe("123");
    expect(formatPhone("+44 20 1234 5678")).toBe("+44 20 1234 5678");
  });
});
