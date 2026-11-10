import { BaseService } from "./base.service";

export class CategoryService extends BaseService {
  async getRoots() {
    return this.success([]);
  }

  async getBySlug(_slug: string) {
    return this.failure("یافت نشد");
  }
}
