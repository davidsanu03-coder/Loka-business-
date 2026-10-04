import type { FastifyInstance } from "fastify";
import { authenticate } from "../plugins/auth.js";
import { getRequestSupabase } from "../lib/request-supabase.js";
import { supabase } from "../lib/supabase.js";
import { reviewSchema } from "../lib/validation.js";

export async function reviewRoutes(app: FastifyInstance) {
  app.get("/api/products/:productId/reviews", async (request) => {
    const p = request.params as { productId: string };
    const { data, error } = await supabase
      .from("reviews")
      .select("id, product_id, order_item_id, rating, title, body, created_at, updated_at")
      .eq("product_id", p.productId)
      .order("created_at", { ascending: false });

    if (error) throw app.httpErrors.internalServerError(error.message);

    const rows = data ?? [];
    const average = rows.length
      ? Number((rows.reduce((sum, row) => sum + row.rating, 0) / rows.length).toFixed(2))
      : 0;

    return {
      data: rows,
      meta: { count: rows.length, averageRating: average }
    };
  });

  app.register(async (review) => {
    review.addHook("preHandler", authenticate);

    review.post("/products/:productId/reviews", async (request, reply) => {
      const p = request.params as { productId: string };
      const body = reviewSchema.parse(request.body);
      const client = getRequestSupabase(request);

      const { data: product, error: productError } = await client
        .from("products")
        .select("id")
        .eq("id", p.productId)
        .single();

      if (productError || !product) throw review.httpErrors.notFound("Product not found");

      const { data: purchases, error: purchaseError } = await client
        .from("order_items")
        .select("id, order_id, orders!inner(id, buyer_id, status)")
        .eq("product_id", p.productId)
        .eq("orders.buyer_id", request.user!.id)
        .eq("orders.status", "delivered");

      if (purchaseError) throw review.httpErrors.internalServerError(purchaseError.message);
      if (!purchases?.length) {
        throw review.httpErrors.forbidden("You can only review products from delivered orders");
      }

      const orderItemId = body.orderItemId ?? purchases[0].id;
      const purchasedItem = purchases.find((item: any) => item.id === orderItemId);
      if (!purchasedItem) {
        throw review.httpErrors.forbidden("The order item is not eligible for this review");
      }

      const { data, error } = await client
        .from("reviews")
        .insert({
          product_id: p.productId,
          buyer_id: request.user!.id,
          order_item_id: orderItemId,
          rating: body.rating,
          title: body.title,
          body: body.body
        })
        .select("*")
        .single();

      if (error) throw review.httpErrors.badRequest(error.message);
      return reply.code(201).send({ data });
    });

    review.patch("/products/:productId/reviews/:id", async (request) => {
      const p = request.params as { productId: string; id: string };
      const body = reviewSchema.partial().omit({ orderItemId: true }).parse(request.body);

      const { data, error } = await getRequestSupabase(request)
        .from("reviews")
        .update({
          rating: body.rating,
          title: body.title,
          body: body.body
        })
        .eq("id", p.id)
        .eq("product_id", p.productId)
        .eq("buyer_id", request.user!.id)
        .select("*")
        .single();

      if (error) throw review.httpErrors.badRequest(error.message);
      return { data };
    });

    review.delete("/products/:productId/reviews/:id", async (request) => {
      const p = request.params as { productId: string; id: string };
      const { error } = await getRequestSupabase(request)
        .from("reviews")
        .delete()
        .eq("id", p.id)
        .eq("product_id", p.productId)
        .eq("buyer_id", request.user!.id);

      if (error) throw review.httpErrors.badRequest(error.message);
      return { message: "Review deleted" };
    });
  });
}
