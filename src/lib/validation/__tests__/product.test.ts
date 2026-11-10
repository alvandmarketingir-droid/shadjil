import { describe, it, expect } from "vitest";
import { productFilterSchema, productCreateSchema } from "../product";

describe("productFilterSchema", () => {
  it("accepts empty filters with defaults", () => {
    const result = productFilterSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects invalid page", () => {
    const result = productFilterSchema.safeParse({ page: -1 });
    expect(result.success).toBe(false);
  });

  it("accepts valid categorySlug and sort", () => {
    const result = productFilterSchema.safeParse({
      categorySlug: "dress-shirts",
      sort: "newest",
      page: 1,
      pageSize: 12,
    });
    expect(result.success).toBe(true);
  });
});

describe("productCreateSchema", () => {
  it("requires name and valid slug", () => {
    const result = productCreateSchema.safeParse({
      name: "آجیل رسمی سفید",
      slug: "dress-shirt-white",
      categoryId: "a1000001-0000-4000-8000-000000000011",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid slug", () => {
    const result = productCreateSchema.safeParse({
      name: "تست",
      slug: "Invalid Slug!",
      categoryId: "a1000001-0000-4000-8000-000000000011",
    });
    expect(result.success).toBe(false);
  });
});
