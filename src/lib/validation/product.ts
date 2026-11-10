import { z } from "zod";
import { paginationSchema } from "./common";

/** فیلتر لیست محصولات (عمومی + ادمین) */
export const productFilterSchema = paginationSchema.extend({
  categorySlug: z.string().optional(),
  brandSlug: z.string().optional(),
  weightId: z.string().uuid().optional(),
  roastId: z.string().uuid().optional(),
  weightValue: z.string().optional(),
  roastValue: z.string().optional(),
  tagSlug: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  featured: z.coerce.boolean().optional(),
  isNew: z.coerce.boolean().optional(),
  bestseller: z.coerce.boolean().optional(),
  inStock: z.coerce.boolean().optional(),
  q: z.string().trim().min(1).max(100).optional(), // جستجو
  sort: z
    .enum(["newest", "price_asc", "price_desc", "popular"])
    .default("newest")
    .optional(),
  /** فیلتر facet: { "pack-weight": "500g", "roast-type": "salted" } */
  attrs: z.record(z.string(), z.string()).optional(),
});

export type ProductFilterInput = z.infer<typeof productFilterSchema>;

/** ساخت / ویرایش محصول (پنل ادمین) */
export const productCreateSchema = z.object({
  name: z.string().min(2, "نام محصول الزامی است").max(200),
  slug: z
    .string()
    .min(2)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "اسلاگ نامعتبر است"),
  categoryId: z.string().uuid("دسته‌بندی نامعتبر است"),
  brandId: z.string().uuid().optional().nullable(),
  shortDescription: z.string().max(500).optional().nullable(),
  description: z.string().max(10000).optional().nullable(),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  isFeatured: z.boolean().default(false),
  isNew: z.boolean().default(false),
  isBestseller: z.boolean().default(false),
  metaTitle: z.string().max(70).optional().nullable(),
  metaDescription: z.string().max(160).optional().nullable(),
  tagIds: z.array(z.string().uuid()).optional(),
});

export type ProductCreateInput = z.infer<typeof productCreateSchema>;

/** واریانت */
export const variantSchema = z.object({
  weightId: z.string().uuid().optional().nullable(),
  roastId: z.string().uuid().optional().nullable(),
  sku: z.string().max(50).optional().nullable(),
  price: z.number().min(0, "قیمت نامعتبر است"),
  originalPrice: z.number().min(0).optional().nullable(),
  stockQuantity: z.number().int().min(0).default(0),
  lowStockThreshold: z.number().int().min(0).default(5),
  isActive: z.boolean().default(true),
  weightGrams: z.number().int().min(0).optional().nullable(),
});

export type VariantInput = z.infer<typeof variantSchema>;
