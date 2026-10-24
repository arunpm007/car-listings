import { describe, expect, it } from "vitest";
import { todayInIndia } from "../format";
import { normalizeIndianPhone, prettyPhone, waNumber } from "../phone";

describe("normalizeIndianPhone", () => {
  it("accepts the ways people type a mobile number", () => {
    for (const input of ["9847012345", "98470 12345", "098470-12345", "919847012345", "+91 98470 12345"]) {
      expect(normalizeIndianPhone(input)).toBe("+919847012345");
    }
  });

  it("rejects landlines, short numbers and junk", () => {
    expect(normalizeIndianPhone("0484 2345678")).toBeNull();
    expect(normalizeIndianPhone("12345")).toBeNull();
    expect(normalizeIndianPhone("5847012345")).toBeNull();
    expect(normalizeIndianPhone("call me")).toBeNull();
  });

  it("formats Indian mobiles for reading", () => {
    expect(prettyPhone("9876543210")).toBe("+91 98765 43210");
    expect(prettyPhone("+919876543210")).toBe("+91 98765 43210");
    expect(prettyPhone(" +44 20 7946 0958 ")).toBe("+44 20 7946 0958");
  });

  it("gives wa.me digits", () => {
    expect(waNumber("+919847012345")).toBe("919847012345");
  });
});

describe("todayInIndia", () => {
  it("rolls over at midnight IST, not UTC", () => {
    expect(todayInIndia(new Date("2026-10-23T18:29:00Z"))).toBe("2026-10-23");
    expect(todayInIndia(new Date("2026-10-23T18:31:00Z"))).toBe("2026-10-24");
  });
});
