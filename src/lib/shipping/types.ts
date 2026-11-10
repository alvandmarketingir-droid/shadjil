export type PricingType = "fixed" | "api" | "negotiable";

export type ShippingMethodRow = {
  id: string;
  title: string;
  description: string | null;
  fee: number;
  is_active: boolean;
  sort_order: number;
  provider_code: string | null;
  pricing_type: PricingType;
  api_config: Record<string, unknown> | null;
};

export type QuoteInput = {
  providerCode: string;
  apiConfig: Record<string, unknown>;
  /** وزن به گرم */
  weightGrams: number;
  /** شهر مقصد (نام یا کد) */
  destCity?: string;
  destProvince?: string;
  /** ارزش کالا به تومان */
  parcelValueToman?: number;
  /** ابعاد سانتی‌متر (اختیاری) */
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
};

export type QuoteResult =
  | { ok: true; fee: number; currency: "IRR"; source: "api" | "table" | "fixed" | "negotiable"; note?: string }
  | { ok: false; error: string; fee?: number };
