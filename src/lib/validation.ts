import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2).max(120),
  phone: z.string().min(7).max(30).optional()
});

export const profileSchema = z.object({
  fullName: z.string().min(2).max(120).optional(),
  phone: z.string().min(7).max(30).optional(),
  avatarUrl: z.string().url().optional().nullable()
});

export const sellerApplicationSchema = z.object({
  storeName: z.string().min(2).max(120),
  description: z.string().max(2000).optional()
});

export const storeSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().max(2000).optional(),
  logoUrl: z.string().url().optional().nullable(),
  bannerUrl: z.string().url().optional().nullable()
});

export const productSchema = z.object({
  storeId: z.string().uuid().optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  name: z.string().min(2).max(200),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().max(10000).optional(),
  price: z.number().nonnegative(),
  compareAtPrice: z.number().nonnegative().optional().nullable(),
  currency: z.string().length(3).default("NGN"),
  sku: z.string().max(100).optional().nullable(),
  status: z.enum(["draft","active","archived"]).default("draft"),
  metadata: z.record(z.string(), z.unknown()).default({})
});

export const categorySchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().max(2000).optional(),
  parentId: z.string().uuid().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  isActive: z.boolean().default(true)
});

export const inventorySchema = z.object({
  quantity: z.number().int().nonnegative(),
  reservedQuantity: z.number().int().nonnegative().default(0)
}).refine(v => v.reservedQuantity <= v.quantity, {
  message: "Reserved quantity cannot exceed quantity"
});
