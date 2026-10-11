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

export const cartItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(1000)
});

export const addressSchema = z.object({
  label: z.string().max(80).optional().nullable(),
  recipientName: z.string().min(2).max(120),
  phone: z.string().min(7).max(30),
  addressLine1: z.string().min(3).max(200),
  addressLine2: z.string().max(200).optional().nullable(),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  country: z.string().min(2).max(80).default("Nigeria"),
  postalCode: z.string().max(30).optional().nullable(),
  isDefault: z.boolean().default(false)
});

export const checkoutSchema = z.object({
  addressId: z.string().uuid().nullable().optional(),
  notes: z.string().max(1000).optional().nullable()
});

export const paymentInitializeSchema = z.object({
  checkoutSessionId: z.string().uuid().optional(),
  orderId: z.string().uuid().optional()
}).refine(value => Boolean(value.checkoutSessionId || value.orderId), {
  message: "checkoutSessionId or orderId is required"
});

export const paymentVerifySchema = z.object({
  reference: z.string().min(1).max(100)
});

export const refundSchema = z.object({
  orderId: z.string().uuid(),
  amount: z.number().positive().max(1000000000),
  reason: z.string().max(500).optional().nullable()
});


export const sellerOrderStatusSchema = z.object({
  status: z.enum(["processing", "shipped", "delivered", "cancelled"])
});


export const reviewSchema = z.object({
  orderItemId: z.string().uuid().optional(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(150).optional().nullable(),
  body: z.string().max(3000).optional().nullable()
});

export const disputeSchema = z.object({
  reason: z.string().min(3).max(200),
  description: z.string().max(5000).optional().nullable()
});

export const disputeResolutionSchema = z.object({
  status: z.enum(["open", "under_review", "resolved", "rejected"]),
  resolution: z.string().max(5000).optional().nullable()
});
