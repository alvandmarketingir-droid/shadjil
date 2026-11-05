import { describe, expect, it } from "vitest";
import { filterBlockedBrands, isBlockedBrand } from "@/lib/brands/blocked";

describe("blocked brands", () => {
  it("blocks Tommy by name/slug/logo", () => {
    expect(isBlockedBrand({ name: "تامی هیلفیگر", slug: "تامی-هیلفیگر" })).toBe(true);
    expect(isBlockedBrand({ slug: "tommy-hilfiger" })).toBe(true);
    expect(isBlockedBrand({ logo_url: "/brands/tommy-hilfiger.webp" })).toBe(true);
    expect(isBlockedBrand({ name: "لاکوست", slug: "لاکوست" })).toBe(false);
  });

  it("filters lists", () => {
    const out = filterBlockedBrands([
      { name: "لاکوست", slug: "لاکوست" },
      { name: "تامی هیلفیگر", slug: "تامی-هیلفیگر" },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].slug).toBe("لاکوست");
  });
});
