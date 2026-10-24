import { describe, expect, it } from "vitest";
import { parseAmount, toUnit } from "../amount";

describe("parseAmount", () => {
  it("reads exact numbers, with or without Indian commas", () => {
    expect(parseAmount("450000")).toBe(450000);
    expect(parseAmount("4,50,000")).toBe(450000);
    expect(parseAmount("₹ 4,50,000")).toBe(450000);
  });

  it("reads typed shorthands", () => {
    expect(parseAmount("4.5 lakh")).toBe(450000);
    expect(parseAmount("4.5L")).toBe(450000);
    expect(parseAmount("12 lakhs")).toBe(1200000);
    expect(parseAmount("45k")).toBe(45000);
    expect(parseAmount("1.2 cr")).toBe(12000000);
  });

  it("scales a bare number by the chosen unit", () => {
    expect(parseAmount("4.5", "lakh")).toBe(450000);
    expect(parseAmount("45", "thousand")).toBe(45000);
    expect(parseAmount("45k", "lakh")).toBe(45000);
  });

  it("refuses junk", () => {
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("abc")).toBeNull();
    expect(parseAmount("4.5 miles")).toBeNull();
    expect(parseAmount("-5")).toBeNull();
  });

  it("shows exact values back in a unit", () => {
    expect(toUnit(450000, "lakh")).toBe("4.5");
    expect(toUnit(45000, "thousand")).toBe("45");
    expect(toUnit(1650000, "lakh")).toBe("16.5");
  });
});
