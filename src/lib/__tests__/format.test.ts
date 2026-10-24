import { describe, expect, it } from "vitest";
import { carPath, idFromSlug } from "../car-url";
import { whatsappHref } from "../contact";
import { formatKm, formatOwners, formatPrice, formatPriceShort } from "../format";

describe("prices", () => {
  it("uses Indian digit grouping", () => {
    expect(formatPrice(420000)).toBe("₹4,20,000");
    expect(formatPrice(16500000)).toBe("₹1,65,00,000");
  });

  it("speaks in lakh and crore", () => {
    expect(formatPriceShort(420000)).toBe("₹4.2 Lakh");
    expect(formatPriceShort(925000)).toBe("₹9.25 Lakh");
    expect(formatPriceShort(1000000)).toBe("₹10 Lakh");
    expect(formatPriceShort(16500000)).toBe("₹1.65 Cr");
    expect(formatPriceShort(85000)).toBe("₹85,000");
  });
});

describe("car details", () => {
  it("formats km and owners", () => {
    expect(formatKm(42000)).toBe("42,000 km");
    expect(formatOwners(1)).toBe("1st owner");
    expect(formatOwners(2)).toBe("2nd owner");
    expect(formatOwners(4)).toBe("4th owner");
  });
});

describe("car urls", () => {
  const car = { id: 12, year: 2018, brand: { name: "Maruti Suzuki", slug: "maruti-suzuki" }, model: { name: "Swift", slug: "swift", category: "hatchback" as const }, variant: "VXI (O)" };

  it("builds a readable path ending in the id", () => {
    expect(carPath(car)).toBe("/cars/2018-maruti-suzuki-swift-vxi-o-12");
  });

  it("reads the id back from the slug", () => {
    expect(idFromSlug("2018-maruti-suzuki-swift-vxi-o-12")).toBe(12);
    expect(idFromSlug("12")).toBe(12);
    expect(idFromSlug("2020-bmw-3-series-320d-7")).toBe(7);
    expect(idFromSlug("bmw-3-series")).toBeNull();
    expect(idFromSlug("swift")).toBeNull();
    expect(idFromSlug("swift-0")).toBeNull();
  });
});

describe("whatsapp", () => {
  it("encodes the message", () => {
    expect(whatsappHref("Hi, CAR-0012 & price?", "919876543210")).toBe(
      "https://wa.me/919876543210?text=Hi%2C%20CAR-0012%20%26%20price%3F",
    );
  });
});
