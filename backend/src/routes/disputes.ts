import type { FastifyInstance } from "fastify";
import { authenticate, requireRole } from "../plugins/auth.js";
import { getRequestSupabase } from "../lib/request-supabase.js";
import { disputeSchema, disputeResolutionSchema } from "../lib/validation.js";
import { supabaseAdmin } from "../lib/supabase.js";

export async function disputeRoutes(app: FastifyInstance) {
  app.register(async (dispute) => {
    dispute.addHook("preHandler", authenticate);

    dispute.get("/api/user/disputes", async (request) => {
      const { data, error } = await getRequestSupabase(request)
        .from("disputes")
        .select("*, orders(id, buyer_id, seller_id, status, total, currency)")
        .order("created_at", { ascending: false });

      if (error) throw dispute.httpErrors.internalServerError(error.message);
      return { data };
    });

    dispute.post("/api/user/orders/:orderId/disputes", async (request, reply) => {
      const p = request.params as { orderId: string };
      const body = disputeSchema.parse(request.body);
      const client = getRequestSupabase(request);

      const { data: order, error: orderError } = await client
        .from("orders")
        .select("id, buyer_id, seller_id, status")
        .eq("id", p.orderId)
        .or(`buyer_id.eq.${request.user!.id},seller_id.eq.${request.user!.id}`)
        .single();

      if (orderError || !order) throw dispute.httpErrors.notFound("Order not found");
      if (order.status === "cancelled") throw dispute.httpErrors.badRequest("Cancelled orders cannot be disputed");

      const { data, error } = await client
        .from("disputes")
        .insert({
          order_id: p.orderId,
          opened_by: request.user!.id,
          reason: body.reason,
          description: body.description
        })
        .select("*")
        .single();

      if (error) throw dispute.httpErrors.badRequest(error.message);

      await client.from("notifications").insert({
        user_id: order.seller_id === request.user!.id ? order.buyer_id : order.seller_id,
        type: "dispute.opened",
        title: "Order dispute opened",
        body: body.reason,
        data: { dispute_id: data.id, order_id: p.orderId }
      });

      return reply.code(201).send({ data });
    });

    dispute.patch("/api/user/disputes/:id", async (request) => {
      const p = request.params as { id: string };
      const body = disputeSchema.partial().parse(request.body);
      const { data, error } = await getRequestSupabase(request)
        .from("disputes")
        .update({ reason: body.reason, description: body.description })
        .eq("id", p.id)
        .eq("opened_by", request.user!.id)
        .eq("status", "open")
        .select("*")
        .single();

      if (error) throw dispute.httpErrors.badRequest(error.message);
      return { data };
    });

    dispute.register(async (admin) => {
      admin.addHook("preHandler", requireRole("admin"));

      admin.get("/api/admin/disputes", async (request) => {
        const { data, error } = await getRequestSupabase(request)
          .from("disputes")
          .select("*, orders(id, buyer_id, seller_id, status, total, currency)")
          .order("created_at", { ascending: false });

        if (error) throw admin.httpErrors.internalServerError(error.message);
        return { data };
      });

      admin.patch("/api/admin/disputes/:id", async (request) => {
        const p = request.params as { id: string };
        const body = disputeResolutionSchema.parse(request.body);
        if (!supabaseAdmin) throw admin.httpErrors.internalServerError("Server service-role key is not configured");

        const { data, error } = await supabaseAdmin
          .from("disputes")
          .update({
            status: body.status,
            resolution: body.resolution,
            resolved_by: body.status === "resolved" || body.status === "rejected" ? request.user!.id : null,
            resolved_at: body.status === "resolved" || body.status === "rejected" ? new Date().toISOString() : null
          })
          .eq("id", p.id)
          .select("*, orders(id, buyer_id, seller_id)")
          .single();

        if (error) throw admin.httpErrors.badRequest(error.message);

        const order = Array.isArray(data.orders) ? data.orders[0] : data.orders;
        if (order) {
          for (const userId of [order.buyer_id, order.seller_id]) {
            await supabaseAdmin.from("notifications").insert({
              user_id: userId,
              type: "dispute.updated",
              title: "Dispute updated",
              body: body.resolution ?? `Dispute status: ${body.status}`,
              data: { dispute_id: data.id, order_id: order.id, status: body.status }
            });
          }
        }

        return { data };
      });
    });
  });
}
