import { BaseService } from "./base.service";
import { ProductRepository } from "@/repositories/product.repository";
import { productFilterSchema, type ProductFilterInput } from "@/lib/validation/product";
import type { ApiResponse, PaginatedResponse } from "@/types";
import type { ProductWithRelations } from "@/repositories/product.repository";
import { cacheGetOrSet, CacheKeys, CacheTTL } from "@/lib/cache/redis";
import { createHash } from "crypto";

export class ProductService extends BaseService {
  private repo = new ProductRepository();

  async getPublishedProducts(
    rawFilters?: unknown
  ): Promise<ApiResponse<PaginatedResponse<ProductWithRelations>>> {
    try {
      const parsed = productFilterSchema.safeParse(rawFilters ?? {});
      if (!parsed.success) {
        return this.failure("پارامترهای فیلتر نامعتبر است");
      }
      const filters = parsed.data as ProductFilterInput;
      const hash = createHash("sha256")
        .update(JSON.stringify(filters))
        .digest("hex")
        .slice(0, 16);

      const result = await cacheGetOrSet(
        CacheKeys.productsList(hash),
        () => this.repo.findPublished(filters),
        CacheTTL.productList
      );
      return this.success(result);
    } catch (e) {
      const dig = e && typeof e === "object" && "digest" in e ? String((e as { digest?: string }).digest || "") : "";
      if (dig !== "DYNAMIC_SERVER_USAGE") console.error("[ProductService.getPublishedProducts]", e);
      return this.failure("خطا در دریافت محصولات");
    }
  }

  async getProductBySlug(
    slug: string
  ): Promise<ApiResponse<ProductWithRelations>> {
    try {
      const product = await this.repo.findBySlug(slug);
      if (!product) return this.failure("محصول یافت نشد");
      return this.success(product);
    } catch (e) {
      console.error("[ProductService.getProductBySlug]", e);
      return this.failure("خطا در دریافت محصول");
    }
  }
}