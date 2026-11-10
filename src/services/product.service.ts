import { BaseService } from "./base.service";

export class ProductService extends BaseService {
  async getPublishedProducts(_params?: any) {
    return this.success({ items: [], total: 0, page: 1, pageSize: 12 });
  }
}
