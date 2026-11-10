import { describe, expect, it } from "vitest";
import {
  colorAvailable,
  isVariantAvailable,
  sizeAvailable,
  stockOf,
} from "@/lib/variant-availability";

const variants = [
  { id: "1", weight: "M", roast: "آبی", stock: 2 },
  { id: "2", weight: "L", roast: "آبی", stock: 0 },
  { id: "3", weight: "M", roast: "مشکی", stock: 1 },
];

describe("variant availability", () => {
  it("stockOf", () => {
    expect(stockOf({ id: "x", stock_quantity: 4 })).toBe(4);
  });

  it("sizeAvailable respects roast", () => {
    expect(sizeAvailable("M", variants, "آبی")).toBe(true);
    expect(sizeAvailable("L", variants, "آبی")).toBe(false);
  });

  it("colorAvailable", () => {
    expect(colorAvailable("آبی", variants)).toBe(true);
    expect(colorAvailable("قرمز", variants)).toBe(false);
  });

  it("isVariantAvailable", () => {
    expect(
      isVariantAvailable(
        [{ roast_hex: "1e3a8a", weight: "M", stock: 1 }],
        "1e3a8a",
        "M",
      ),
    ).toBe(true);
    expect(
      isVariantAvailable(
        [{ roast_hex: "1e3a8a", weight: "M", stock: 0 }],
        "1e3a8a",
        "M",
      ),
    ).toBe(false);
  });
});
