import { describe, expect, it } from "vitest";
import { DEFAULT_PRICES, NEW_MEMBER_PERCENT, calculateDiscount, newMemberDiscount, priceFor } from "@/lib/catalog";

describe("promo rules", () => {
  it("New Member promo is 10% off", () => {
    expect(NEW_MEMBER_PERCENT).toBe(10);
    expect(newMemberDiscount(100_000)).toBe(10_000);
  });

  it("percent voucher respects max discount", () => {
    expect(calculateDiscount({ type: "percent", value: 20, maxDiscount: 5_000, minOrder: 0 }, 100_000)).toBe(5_000);
  });

  it("voucher gives no discount below its minimum order", () => {
    expect(calculateDiscount({ type: "fixed", value: 10_000, maxDiscount: null, minOrder: 50_000 }, 40_000)).toBe(0);
  });

  it("fixed voucher never exceeds the subtotal", () => {
    expect(calculateDiscount({ type: "fixed", value: 99_000, maxDiscount: null, minOrder: 0 }, 30_000)).toBe(30_000);
  });

  it("price uses the per-category price per 100 units", () => {
    const prices = { ...DEFAULT_PRICES, followers: [12_000, 30_000, 55_000] as [number, number, number] };
    expect(priceFor(prices, "followers", "B", 200)).toBe(60_000);
  });
});

import { parseNominalList, nominalsFor } from "@/lib/catalog";

describe("nominal options set by admin", () => {
  it("reads '100, 200, 1.000' with dot as thousands separator, sorted and unique", () => {
    expect(parseNominalList("1.000, 200 100,200")).toEqual({ ok: true, values: [100, 200, 1000] });
  });

  it("rejects text that is not a number", () => {
    expect(parseNominalList("100, abc").ok).toBe(false);
  });

  it("falls back to the default list when a service has no saved nominals", () => {
    expect(nominalsFor(undefined, "views")[0]).toBe(1000);
  });
});
