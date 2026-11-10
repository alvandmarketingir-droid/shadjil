import { BaseService } from "./base.service";
import { BrandRepository } from "@/repositories/brand.repository";
import type { ApiResponse } from "@/types";
import type { Brand } from "@/types/database";

type PublicBrand = Pick<
  Brand,
  "id" | "name" | "slug" | "logo_url" | "description" | "is_active"
>;

export class BrandService extends BaseService {
  private repo = new BrandRepository();

  async getActive(): Promise<ApiResponse<PublicBrand[]>> {
    try {
      const data = await this.repo.findAllActive();
      return this.success(data);
    } catch (e) {
      const dig = e && typeof e === "object" && "digest" in e ? String((e as { digest?: string }).digest || "") : "";
      if (dig !== "DYNAMIC_SERVER_USAGE") console.error("[BrandService.getActive]", e);
      return this.failure("خطا در دریافت برندها");
    }
  }

  async getBySlug(slug: string): Promise<ApiResponse<PublicBrand>> {
    try {
      const brand = await this.repo.findBySlug(slug);
      if (!brand) return this.failure("برند یافت نشد");
      return this.success(brand);
    } catch (e) {
      console.error("[BrandService.getBySlug]", e);
      return this.failure("خطا در دریافت برند");
    }
  }
}
