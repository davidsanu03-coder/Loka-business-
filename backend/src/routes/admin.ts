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
      if (!supabaseAdmin) throw admin.httpErrors.internalServerError("Server service-role key is not configured");

      const { data: commission, error } = await supabaseAdmin
        .from("commissions")
        .update({ status: "paid", paid_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", p.id)
        .eq("status", "eligible")
        .select("*")
        .single();

      if (error) throw admin.httpErrors.badRequest(error.message);

      await supabaseAdmin.from("notifications").insert({
        user_id: commission.seller_id,
        type: "commission.paid",
        title: "Commission paid",
        body: "Your eligible commission has been marked as paid.",
        data: { commission_id: commission.id, amount: commission.seller_amount }
      });

      return { data: commission };
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

    admin.get("/dashboard", async (request) => {
      const client = getRequestSupabase(request);
      const now = new Date();
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [orders, users, sellers, products, commissions, refunds, disputes] = await Promise.all([
        client.from("orders").select("id, seller_id, status, total, created_at").gte("created_at", start).order("created_at", { ascending: true }),
        client.from("profiles").select("id, created_at").gte("created_at", start),
        client.from("seller_profiles").select("user_id, status, created_at").gte("created_at", start),
        client.from("products").select("id, status, created_at").gte("created_at", start),
        client.from("commissions").select("commission_amount, seller_amount, status, created_at").gte("created_at", start),
        client.from("payment_refunds").select("amount, status, created_at").gte("created_at", start),
        client.from("disputes").select("id, status, created_at").gte("created_at", start)
      ]);

      for (const result of [orders, users, sellers, products, commissions, refunds, disputes]) {
        if (result.error) throw admin.httpErrors.internalServerError(result.error.message);
      }

      const revenueOrders = (orders.data ?? []).filter((o: any) => ["confirmed", "processing", "shipped", "delivered"].includes(o.status));
      const grossRevenue = revenueOrders.reduce((n: number, o: any) => n + Number(o.total ?? 0), 0);
      const processedRefunds = (refunds.data ?? []).filter((r: any) => r.status === "processed").reduce((n: number, r: any) => n + Number(r.amount ?? 0), 0);
      const byStatus = (orders.data ?? []).reduce((acc: Record<string, number>, row: any) => {
        acc[row.status] = (acc[row.status] ?? 0) + 1;
        return acc;
      }, {});

      return {
        data: {
          periodDays: 30,
          users: users.data?.length ?? 0,
          sellers: {
            new: sellers.data?.length ?? 0,
            approved: sellers.data?.filter((s: any) => s.status === "approved").length ?? 0
          },
          products: products.data?.length ?? 0,
          orders: { total: orders.data?.length ?? 0, byStatus },
          revenue: { gross: grossRevenue, processedRefunds, net: grossRevenue - processedRefunds },
          commissions: {
            accrued: (commissions.data ?? []).reduce((n: number, c: any) => n + Number(c.commission_amount ?? 0), 0),
            sellerNet: (commissions.data ?? []).reduce((n: number, c: any) => n + Number(c.seller_amount ?? 0), 0),
            pending: (commissions.data ?? []).filter((c: any) => c.status === "pending").length,
            eligible: (commissions.data ?? []).filter((c: any) => c.status === "eligible").length
          },
          disputes: {
            total: disputes.data?.length ?? 0,
            open: disputes.data?.filter((d: any) => d.status === "open" || d.status === "under_review").length ?? 0,
            resolved: disputes.data?.filter((d: any) => d.status === "resolved").length ?? 0
          }
        }
      };
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