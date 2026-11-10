import { BaseService } from "./base.service";

export class BrandService extends BaseService {
  async getActive() {
    return this.success([]);
  }
  async getBySlug(_slug: string) {
    return this.failure("یافت نشد");
  }
}
