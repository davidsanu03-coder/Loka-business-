import type { FastifyInstance } from "fastify";
import { requireRole } from "../plugins/auth.js";
import { getRequestSupabase } from "../lib/request-supabase.js";
import { storeSchema, productSchema, inventorySchema } from "../lib/validation.js";

export async function sellerRoutes(app: FastifyInstance) {
  app.register(async (seller) => {
    seller.addHook("preHandler", requireRole("seller", "admin"));

    seller.get("/profile", async (request) => {
      const { data, error } = await getRequestSupabase(request).from("seller_profiles").select("*").eq("user_id", request.user!.id).single();
      if (error) throw seller.httpErrors.notFound("Seller profile not found");
      return { data };
    });

    seller.post("/store", async (request, reply) => {
      const body = storeSchema.parse(request.body);
      const { data, error } = await getRequestSupabase(request).from("stores").insert({
        seller_id: request.user!.id, name: body.name, slug: body.slug,
        description: body.description, logo_url: body.logoUrl, banner_url: body.bannerUrl
      }).select("*").single();
      if (error) throw seller.httpErrors.badRequest(error.message);
      return reply.code(201).send({ data });
    });

    seller.patch("/store/:id", async (request) => {
      const body = storeSchema.partial().parse(request.body);
      const p = request.params as { id: string };
      const { data, error } = await getRequestSupabase(request).from("stores").update({
        name: body.name, slug: body.slug, description: body.description,
        logo_url: body.logoUrl, banner_url: body.bannerUrl
      }).eq("id", p.id).eq("seller_id", request.user!.id).select("*").single();
      if (error) throw seller.httpErrors.badRequest(error.message);
      return { data };
    });

    seller.get("/stores", async (request) => {
      const { data, error } = await getRequestSupabase(request).from("stores").select("*").eq("seller_id", request.user!.id);
      if (error) throw seller.httpErrors.internalServerError(error.message);
      return { data };
    });

    seller.post("/products", async (request, reply) => {
      const body = productSchema.parse(request.body);
      const { data, error } = await getRequestSupabase(request).from("products").insert({
        seller_id: request.user!.id, store_id: body.storeId, category_id: body.categoryId,
        name: body.name, slug: body.slug, description: body.description, price: body.price,
        compare_at_price: body.compareAtPrice, currency: body.currency, sku: body.sku,
        status: body.status, metadata: body.metadata
      }).select("*").single();
      if (error) throw seller.httpErrors.badRequest(error.message);
      return reply.code(201).send({ data });
    });

    seller.get("/products", async (request) => {
      const { data, error } = await getRequestSupabase(request).from("products").select("*").eq("seller_id", request.user!.id).order("created_at", { ascending: false });
      if (error) throw seller.httpErrors.internalServerError(error.message);
      return { data };
    });

    seller.get("/products/:id", async (request) => {
      const p = request.params as { id: string };
      const { data, error } = await getRequestSupabase(request).from("products").select("*, product_images(*), inventory(*)").eq("id", p.id).eq("seller_id", request.user!.id).single();
      if (error) throw seller.httpErrors.notFound("Product not found");
      return { data };
    });

    seller.patch("/products/:id", async (request) => {
      const p = request.params as { id: string };
      const body = productSchema.partial().parse(request.body);
      const { data, error } = await getRequestSupabase(request).from("products").update({
        store_id: body.storeId, category_id: body.categoryId, name: body.name, slug: body.slug,
        description: body.description, price: body.price, compare_at_price: body.compareAtPrice,
        currency: body.currency, sku: body.sku, status: body.status, metadata: body.metadata
      }).eq("id", p.id).eq("seller_id", request.user!.id).select("*").single();
      if (error) throw seller.httpErrors.badRequest(error.message);
      return { data };
    });

    seller.delete("/products/:id", async (request) => {
      const p = request.params as { id: string };
      const { error } = await getRequestSupabase(request).from("products").delete().eq("id", p.id).eq("seller_id", request.user!.id);
      if (error) throw seller.httpErrors.badRequest(error.message);
      return { message: "Product deleted" };
    });

    seller.put("/inventory/:productId", async (request) => {
      const p = request.params as { productId: string };
      const body = inventorySchema.parse(request.body);
      const { data: product, error: productError } = await getRequestSupabase(request).from("products").select("id").eq("id", p.productId).eq("seller_id", request.user!.id).single();
      if (productError || !product) throw seller.httpErrors.notFound("Product not found");
      const { data, error } = await getRequestSupabase(request).from("inventory").upsert({
        product_id: p.productId, quantity: body.quantity, reserved_quantity: body.reservedQuantity
      }).select("*").single();
      if (error) throw seller.httpErrors.badRequest(error.message);
      return { data };
    });

    seller.get("/inventory/:productId", async (request) => {
      const p = request.params as { productId: string };
      const { data, error } = await getRequestSupabase(request).from("inventory").select("*").eq("product_id", p.productId).single();
      if (error) throw seller.httpErrors.notFound("Inventory not found");
      return { data };
    });

    seller.get("/commissions", async (request) => {
      const { data, error } = await getRequestSupabase(request)
        .from("commissions")
        .select("*")
        .eq("seller_id", request.user!.id)
        .order("created_at", { ascending: false });
      if (error) throw seller.httpErrors.internalServerError(error.message);
      return { data };
    });

    seller.get("/analytics", async (request) => {
      const client = getRequestSupabase(request);
      const { data: sellerOrders, error: sellerOrdersError } = await client
        .from("orders")
        .select("id")
        .eq("seller_id", request.user!.id);

      if (sellerOrdersError) throw seller.httpErrors.internalServerError(sellerOrdersError.message);

      const orderIds = (sellerOrders ?? []).map((order: any) => order.id);
      const [orders, revenue, commissions, refunds, activeProducts] = await Promise.all([
        Promise.resolve({ count: sellerOrders?.length ?? 0 }),
        client.from("orders").select("total").eq("seller_id", request.user!.id).in("status", ["confirmed", "processing", "shipped", "delivered"]),
        client.from("commissions").select("commission_amount, seller_amount, refunded_amount, status").eq("seller_id", request.user!.id),
        orderIds.length
          ? client.from("payment_refunds").select("amount").eq("status", "processed").in("order_id", orderIds)
          : Promise.resolve({ data: [], error: null }),
        client.from("products").select("id", { count: "exact", head: true }).eq("seller_id", request.user!.id).eq("status", "active")
      ]);

      if (revenue.error) throw seller.httpErrors.internalServerError(revenue.error.message);
      if (commissions.error) throw seller.httpErrors.internalServerError(commissions.error.message);
      if (refunds.error) throw seller.httpErrors.internalServerError(refunds.error.message);
      if (activeProducts.error) throw seller.httpErrors.internalServerError(activeProducts.error.message);

      const sum = (rows: any[] | null | undefined, key: string) =>
        (rows ?? []).reduce((n, row) => n + Number(row[key] ?? 0), 0);

      return {
        data: {
          orders: orders.count ?? 0,
          activeProducts: activeProducts.count ?? 0,
          grossOrderValue: sum(revenue.data, "total"),
          commissionAccrued: sum(commissions.data, "commission_amount"),
          sellerNet: sum(commissions.data, "seller_amount"),
          refunded: sum(refunds.data, "amount")
        }
      };
    });

    seller.get("/orders", async (request) => {
      const { data, error } = await getRequestSupabase(request)
        .from("orders")
        .select("*, order_items(*), payments(*), payment_refunds(*)")
        .eq("seller_id", request.user!.id)
        .order("created_at", { ascending: false });

      if (error) throw seller.httpErrors.internalServerError(error.message);
      return { data };
    });

    seller.patch("/orders/:id/status", async (request) => {
      const p = request.params as { id: string };
      const body = (await import("../lib/validation.js")).sellerOrderStatusSchema.parse(request.body);

      const { data, error } = await getRequestSupabase(request).rpc("seller_update_order_status", {
        p_order_id: p.id,
        p_status: body.status
      });

      if (error) throw seller.httpErrors.badRequest(error.message);
      return { data };
    });

    seller.get("/dashboard", async (request) => {
      const client = getRequestSupabase(request);
      const now = new Date();
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [products, inventory, orders, commissions, refunds] = await Promise.all([
        client.from("products").select("id, status", { count: "exact" }).eq("seller_id", request.user!.id),
        client.from("inventory").select("product_id, quantity, reserved_quantity, products!inner(id, name, seller_id)").eq("products.seller_id", request.user!.id),
        client.from("orders").select("id, status, total, created_at").eq("seller_id", request.user!.id).gte("created_at", start).order("created_at", { ascending: true }),
        client.from("commissions").select("commission_amount, seller_amount, status, created_at").eq("seller_id", request.user!.id).gte("created_at", start),
        Promise.resolve({ data: [], error: null }).then(async () => {
          const sellerOrderIds = (await client.from("orders").select("id").eq("seller_id", request.user!.id)).data?.map((x: any) => x.id) ?? [];
          if (!sellerOrderIds.length) return { data: [], error: null };
          return client.from("payment_refunds").select("amount, status, created_at").in("order_id", sellerOrderIds).gte("created_at", start);
        })
      ]);

      for (const result of [products, inventory, orders, commissions, refunds]) {
        if (result.error) throw seller.httpErrors.internalServerError(result.error.message);
      }

      const orderRows = orders.data ?? [];
      const revenue = orderRows.filter((o: any) => ["confirmed", "processing", "shipped", "delivered"].includes(o.status))
        .reduce((sum: number, o: any) => sum + Number(o.total ?? 0), 0);
      const lowStock = (inventory.data ?? []).filter((row: any) => Number(row.quantity ?? 0) - Number(row.reserved_quantity ?? 0) <= 5);
      const byStatus = orderRows.reduce((acc: Record<string, number>, row: any) => {
        acc[row.status] = (acc[row.status] ?? 0) + 1;
        return acc;
      }, {});

      return {
        data: {
          periodDays: 30,
          products: {
            total: products.count ?? 0,
            active: (products.data ?? []).filter((p: any) => p.status === "active").length,
            lowStock: lowStock.length
          },
          orders: { total: orderRows.length, byStatus },
          revenue: { gross: revenue, refunded: (refunds.data ?? []).filter((r: any) => r.status === "processed").reduce((n: number, r: any) => n + Number(r.amount ?? 0), 0) },
          commissions: {
            accrued: (commissions.data ?? []).reduce((n: number, c: any) => n + Number(c.commission_amount ?? 0), 0),
            sellerNet: (commissions.data ?? []).reduce((n: number, c: any) => n + Number(c.seller_amount ?? 0), 0),
            eligible: (commissions.data ?? []).filter((c: any) => c.status === "eligible").length
          },
          lowStockProducts: lowStock.map((row: any) => ({
            productId: row.product_id,
            name: Array.isArray(row.products) ? row.products[0]?.name : row.products?.name,
            available: Number(row.quantity ?? 0) - Number(row.reserved_quantity ?? 0)
          }))
        }
      };
    });

  }, { prefix: "/api/seller" });
}