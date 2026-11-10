import { BaseService } from "./base.service";
import {
  AttributeRepository,
  type AttributeWithOptions,
} from "@/repositories/attribute.repository";
import type { ApiResponse } from "@/types";

export class AttributeService extends BaseService {
  private repo = new AttributeRepository();

  async getFilterableFacets(): Promise<ApiResponse<AttributeWithOptions[]>> {
    try {
      const data = await this.repo.findFilterableWithOptions();
      return this.success(data);
    } catch (e) {
      console.error("[AttributeService.getFilterableFacets]", e);
      return this.failure("خطا در دریافت فیلترها");
    }
  }
}
