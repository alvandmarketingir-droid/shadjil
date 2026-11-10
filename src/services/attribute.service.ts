import { BaseService } from "./base.service";

export class AttributeService extends BaseService {
  async getFilterableFacets(_params?: any) {
    return this.success([]);
  }
}
