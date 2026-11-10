import { BaseService } from "./base.service";
import { CategoryRepository } from "@/repositories/category.repository";
import { cacheGetOrSet, CacheKeys, CacheTTL } from "@/lib/cache/redis";
import type { ApiResponse } from "@/types";
import type { Category } from "@/types/database";

export class CategoryService extends BaseService {
  private repo = new CategoryRepository();

  async getRoots(): Promise<ApiResponse<Category[]>> {
    try {
      const data = await cacheGetOrSet(
        CacheKeys.categoryRoots(),
        () => this.repo.findRoots(),
        CacheTTL.category
      );
      return this.success(data);
    } catch (e) {
      const dig = e && typeof e === "object" && "digest" in e ? String((e as { digest?: string }).digest || "") : "";
      if (dig !== "DYNAMIC_SERVER_USAGE") console.error("[CategoryService.getRoots]", e);
      return this.failure("خطا در دریافت دسته‌بندی‌ها");
    }
  }

  async getBySlug(slug: string): Promise<ApiResponse<Category>> {
    try {
      const category = await cacheGetOrSet(
        CacheKeys.categoryBySlug(slug),
        () => this.repo.findBySlug(slug),
        CacheTTL.category
      );
      if (!category) return this.failure("دسته‌بندی یافت نشد");
      return this.success(category);
    } catch (e) {
      console.error("[CategoryService.getBySlug]", e);
      return this.failure("خطا در دریافت دسته‌بندی");
    }
  }

  async getChildren(parentId: string): Promise<ApiResponse<Category[]>> {
    try {
      const data = await this.repo.findChildren(parentId);
      return this.success(data);
    } catch (e) {
      console.error("[CategoryService.getChildren]", e);
      return this.failure("خطا در دریافت زیر‌دسته‌ها");
    }
  }
}
