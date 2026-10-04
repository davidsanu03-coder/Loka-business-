import type { FastifyInstance } from "fastify";
import { requireRole } from "../plugins/auth.js";
import { getRequestSupabase } from "../lib/request-supabase.js";
import { supabaseAdmin } from "../lib/supabase.js";

export async function adminRoutes(app: FastifyInstance) {
  app.register(async (admin) => {
    admin.addHook("preHandler", requireRole("admin"));

    admin.get("/users", async (request) => {
      const { data, error } = await getRequestSupabase(request).from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw admin.httpErrors.internalServerError(error.message);
      return { data };
    });

    admin.get("/sellers", async (request) => {
      const { data, error } = await getRequestSupabase(request).from("seller_profiles").select("*").order("created_at", { ascending: false });
      if (error) throw admin.httpErrors.internalServerError(error.message);
      return { data };
    });

    admin.patch("/sellers/:userId/approve", async (request) => {
      const p = request.params as { userId: string };
      if (!supabaseAdmin) throw admin.httpErrors.internalServerError("Server service-role key is not configured");
      const { data, error } = await supabaseAdmin.from("seller_profiles").update({ status: "approved" }).eq("user_id", p.userId).select("*").single();
      if (!error) {
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(p.userId, { app_metadata: { role: "seller" } });
        if (authError) throw admin.httpErrors.internalServerError(authError.message);
        await supabaseAdmin.from("profiles").update({ role: "seller" }).eq("id", p.userId);
      }
      if (error) throw admin.httpErrors.badRequest(error.message);
      return { data, message: "Seller approved" };
    });

    admin.patch("/sellers/:userId/reject", async (request) => {
      const p = request.params as { userId: string };
      if (!supabaseAdmin) throw admin.httpErrors.internalServerError("Server service-role key is not configured");
      const { data, error } = await supabaseAdmin.from("seller_profiles").update({ status: "rejected" }).eq("user_id", p.userId).select("*").single();
      if (error) throw admin.httpErrors.badRequest(error.message);
      return { data, message: "Seller rejected" };
    });

    admin.patch("/sellers/:userId/suspend", async (request) => {
      const p = request.params as { userId: string };
      if (!supabaseAdmin) throw admin.httpErrors.internalServerError("Server service-role key is not configured");
      const { data, error } = await supabaseAdmin.from("seller_profiles").update({ status: "suspended" }).eq("user_id", p.userId).select("*").single();
      if (!error) {
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(p.userId, { app_metadata: { role: "user" } });
        if (authError) throw admin.httpErrors.internalServerError(authError.message);
        await supabaseAdmin.from("profiles").update({ role: "user" }).eq("id", p.userId);
      }
      if (error) throw admin.httpErrors.badRequest(error.message);
      return { data, message: "Seller suspended" };
    });

    admin.get("/commissions", async (request) => {
      const { data, error } = await getRequestSupabase(request)
        .from("commissions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw admin.httpErrors.internalServerError(error.message);
      return { data };
    });

    admin.patch("/commissions/:id/paid", async (request) => {
      const p = request.params as { id: string };
      const { data, error } = await getRequestSupabase(request).rpc("mark_commission_paid", {
        p_commission_id: p.id
      });
      if (error) throw admin.httpErrors.badRequest(error.message);
      return { data };
    });

    admin.get("/analytics", async (request) => {
      const client = getRequestSupabase(request);
      const [
        users,
        sellers,
        orders,
        revenue,
        commissions,
        refunds,
        pendingOrders
      ] = await Promise.all([
        client.from("profiles").select("id", { count: "exact", head: true }),
        client.from("seller_profiles").select("user_id", { count: "exact", head: true }).eq("status", "approved"),
        client.from("orders").select("id", { count: "exact", head: true }),
        client.from("orders").select("total").in("status", ["confirmed", "processing", "shipped", "delivered"]),
        client.from("commissions").select("commission_amount"),
        client.from("payment_refunds").select("amount").eq("status", "processed"),
        client.from("orders").select("id", { count: "exact", head: true }).in("status", ["pending", "confirmed", "processing", "shipped"])
      ]);

      const sum = (rows: any[] | null | undefined) => (rows ?? []).reduce((n, row) => n + Number(row.total ?? row.commission_amount ?? row.amount ?? 0), 0);

      return {
        data: {
          users: users.count ?? 0,
          approvedSellers: sellers.count ?? 0,
          orders: orders.count ?? 0,
          pendingOrActiveOrders: pendingOrders.count ?? 0,
          grossOrderValue: sum(revenue.data),
          commissions: sum(commissions.data),
          processedRefunds: sum(refunds.data)
        }
      };
    });

    admin.get("/orders", async (request) => {
      const { data, error } = await getRequestSupabase(request).from("orders").select("*, order_items(*)").order("created_at", { ascending: false });
      if (error) throw admin.httpErrors.internalServerError(error.message);
      return { data };
    });
  }, { prefix: "/api/admin" });
}

export async function sellerApplicationRoutes(app: FastifyInstance) {
  app.post("/api/sellers/apply", { preHandler: requireRole("user") }, async (request, reply) => {
    const body = (await import("../lib/validation.js")).sellerApplicationSchema.parse(request.body);
    const slug = body.storeName.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const { data, error } = await getRequestSupabase(request).from("seller_profiles").insert({
      user_id: request.user!.id, store_name: body.storeName, slug, description: body.description
    }).select("*").single();
    if (error) throw app.httpErrors.badRequest(error.message);
    return reply.code(201).send({ data, message: "Seller application submitted for approval." });
  });
}