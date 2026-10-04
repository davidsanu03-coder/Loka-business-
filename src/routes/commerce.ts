import type { FastifyInstance } from "fastify";
import { authenticate } from "../plugins/auth.js";
import { getRequestSupabase } from "../lib/request-supabase.js";
import {
  addressSchema,
  cartItemSchema,
  checkoutSchema
} from "../lib/validation.js";

async function getOrCreateCart(request: any) {
  const client = getRequestSupabase(request);
  const userId = request.user!.id;

  const { data: existing, error: readError } = await client
    .from("carts")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (readError) throw request.server.httpErrors.internalServerError(readError.message);
  if (existing) return existing.id as string;

  const { data, error } = await client
    .from("carts")
    .insert({ user_id: userId })
    .select("id")
    .single();

  if (error) throw request.server.httpErrors.badRequest(error.message);
  return data.id as string;
}

export async function commerceRoutes(app: FastifyInstance) {
  app.register(async (commerce) => {
    commerce.addHook("preHandler", authenticate);

    commerce.get("/cart", async (request) => {
      const client = getRequestSupabase(request);
      const cartId = await getOrCreateCart(request);

      const { data, error } = await client
        .from("cart_items")
        .select("id, product_id, quantity, created_at, products(id, name, slug, price, currency, status, seller_id, store_id, product_images(id, url, alt_text, sort_order))")
        .eq("cart_id", cartId)
        .order("created_at", { ascending: true });

      if (error) throw commerce.httpErrors.internalServerError(error.message);

      const items = (data ?? []).map((item: any) => {
        const product = item.products;
        return {
          id: item.id,
          productId: item.product_id,
          quantity: item.quantity,
          product,
          lineTotal: product ? Number(product.price) * item.quantity : 0
        };
      });

      const subtotal = items.reduce((sum: number, item: any) => sum + item.lineTotal, 0);

      return {
        cartId,
        items,
        itemCount: items.reduce((sum: number, item: any) => sum + item.quantity, 0),
        subtotal,
        shippingFee: 0,
        total: subtotal,
        currency: "NGN"
      };
    });

    commerce.put("/cart/items/:productId", async (request, reply) => {
      const params = request.params as { productId: string };
      const body = cartItemSchema.omit({ productId: true }).parse(request.body);
      const client = getRequestSupabase(request);
      const cartId = await getOrCreateCart(request);

      const { data: product, error: productError } = await client
        .from("products")
        .select("id, status, currency")
        .eq("id", params.productId)
        .single();

      if (productError || !product) throw commerce.httpErrors.notFound("Product not found");
      if (product.status !== "active") throw commerce.httpErrors.badRequest("Product is not available");
      if (product.currency !== "NGN") throw commerce.httpErrors.badRequest("Only NGN products can be added to cart");

      const { data: inventory, error: inventoryError } = await client
        .from("inventory")
        .select("quantity, reserved_quantity")
        .eq("product_id", params.productId)
        .maybeSingle();

      if (inventoryError) throw commerce.httpErrors.internalServerError(inventoryError.message);
      if (!inventory) throw commerce.httpErrors.badRequest("Product inventory is not configured");

      const available = inventory.quantity - inventory.reserved_quantity;
      if (body.quantity > available) {
        throw commerce.httpErrors.badRequest(`Only ${available} item(s) are available`);
      }

      const { data, error } = await client
        .from("cart_items")
        .upsert(
          { cart_id: cartId, product_id: params.productId, quantity: body.quantity },
          { onConflict: "cart_id,product_id" }
        )
        .select("id, product_id, quantity, created_at")
        .single();

      if (error) throw commerce.httpErrors.badRequest(error.message);
      return reply.send({ data });
    });

    commerce.delete("/cart/items/:productId", async (request) => {
      const params = request.params as { productId: string };
      const client = getRequestSupabase(request);
      const cartId = await getOrCreateCart(request);

      const { error } = await client
        .from("cart_items")
        .delete()
        .eq("cart_id", cartId)
        .eq("product_id", params.productId);

      if (error) throw commerce.httpErrors.badRequest(error.message);
      return { message: "Cart item removed" };
    });

    commerce.delete("/cart", async (request) => {
      const client = getRequestSupabase(request);
      const cartId = await getOrCreateCart(request);

      const { error } = await client.from("cart_items").delete().eq("cart_id", cartId);
      if (error) throw commerce.httpErrors.badRequest(error.message);

      return { message: "Cart cleared" };
    });

    commerce.get("/addresses", async (request) => {
      const { data, error } = await getRequestSupabase(request)
        .from("addresses")
        .select("*")
        .eq("user_id", request.user!.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw commerce.httpErrors.internalServerError(error.message);
      return { data };
    });

    commerce.post("/addresses", async (request, reply) => {
      const body = addressSchema.parse(request.body);
      const client = getRequestSupabase(request);

      if (body.isDefault) {
        await client.from("addresses").update({ is_default: false }).eq("user_id", request.user!.id);
      }

      const { data, error } = await client
        .from("addresses")
        .insert({
          user_id: request.user!.id,
          label: body.label,
          recipient_name: body.recipientName,
          phone: body.phone,
          address_line1: body.addressLine1,
          address_line2: body.addressLine2,
          city: body.city,
          state: body.state,
          country: body.country,
          postal_code: body.postalCode,
          is_default: body.isDefault
        })
        .select("*")
        .single();

      if (error) throw commerce.httpErrors.badRequest(error.message);
      return reply.code(201).send({ data });
    });

    commerce.patch("/addresses/:id", async (request) => {
      const params = request.params as { id: string };
      const body = addressSchema.partial().parse(request.body);
      const client = getRequestSupabase(request);

      if (body.isDefault === true) {
        await client.from("addresses").update({ is_default: false }).eq("user_id", request.user!.id);
      }

      const { data, error } = await client
        .from("addresses")
        .update({
          label: body.label,
          recipient_name: body.recipientName,
          phone: body.phone,
          address_line1: body.addressLine1,
          address_line2: body.addressLine2,
          city: body.city,
          state: body.state,
          country: body.country,
          postal_code: body.postalCode,
          is_default: body.isDefault
        })
        .eq("id", params.id)
        .eq("user_id", request.user!.id)
        .select("*")
        .single();

      if (error) throw commerce.httpErrors.badRequest(error.message);
      return { data };
    });

    commerce.delete("/addresses/:id", async (request) => {
      const params = request.params as { id: string };
      const { error } = await getRequestSupabase(request)
        .from("addresses")
        .delete()
        .eq("id", params.id)
        .eq("user_id", request.user!.id);

      if (error) throw commerce.httpErrors.badRequest(error.message);
      return { message: "Address deleted" };
    });

    commerce.post("/checkout", async (request) => {
      const body = checkoutSchema.parse(request.body);
      const client = getRequestSupabase(request);

      const { data, error } = await client.rpc("checkout_cart", {
        p_address_id: body.addressId ?? null,
        p_notes: body.notes ?? null
      });

      if (error) throw commerce.httpErrors.badRequest(error.message);
      return { data };
    });

    commerce.get("/checkout-sessions/:id", async (request) => {
      const params = request.params as { id: string };
      const client = getRequestSupabase(request);

      const { data, error } = await client
        .from("checkout_sessions")
        .select(
          "*, checkout_session_orders(order_id, seller_id, amount, created_at, orders(id, status, subtotal, shipping_fee, total, currency))"
        )
        .eq("id", params.id)
        .eq("buyer_id", request.user!.id)
        .single();

      if (error || !data) throw commerce.httpErrors.notFound("Checkout session not found");

      if (data.status === "pending" && new Date(data.expires_at).getTime() <= Date.now()) {
        const { error: expireError } = await client.rpc("expire_checkout_sessions");
        if (!expireError) {
          const { data: refreshed } = await client
            .from("checkout_sessions")
            .select(
              "*, checkout_session_orders(order_id, seller_id, amount, created_at, orders(id, status, subtotal, shipping_fee, total, currency))"
            )
            .eq("id", params.id)
            .eq("buyer_id", request.user!.id)
            .single();

          return { data: refreshed ?? data };
        }
      }

      return { data };
    });

    commerce.post("/checkout-sessions/:id/cancel", async (request) => {
      const params = request.params as { id: string };
      const { data, error } = await getRequestSupabase(request).rpc("cancel_checkout_session", {
        p_session_id: params.id
      });

      if (error) throw commerce.httpErrors.badRequest(error.message);
      return { data };
    });

    commerce.get("/orders/:id", async (request) => {
      const params = request.params as { id: string };
      const { data, error } = await getRequestSupabase(request)
        .from("orders")
        .select("*, order_items(*), payments(*)")
        .eq("id", params.id)
        .eq("buyer_id", request.user!.id)
        .single();

      if (error) throw commerce.httpErrors.notFound("Order not found");
      return { data };
    });

    commerce.post("/orders/:id/cancel", async (request) => {
      const params = request.params as { id: string };
      const { data, error } = await getRequestSupabase(request).rpc("cancel_buyer_order", {
        p_order_id: params.id
      });

      if (error) throw commerce.httpErrors.badRequest(error.message);
      return { data };
    });

  }, { prefix: "/api/user" });

}
