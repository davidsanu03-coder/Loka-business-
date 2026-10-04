import type { FastifyInstance } from "fastify";
import { authenticate } from "../plugins/auth.js";
import { getRequestSupabase } from "../lib/request-supabase.js";

export async function userRoutes(app: FastifyInstance) {
  app.register(async (user) => {
    user.addHook("preHandler", authenticate);

    user.get("/profile", async (request) => {
      const { data, error } = await getRequestSupabase(request).from("profiles").select("*").eq("id", request.user!.id).single();
      if (error) throw user.httpErrors.internalServerError(error.message);
      return { data };
    });

    user.get("/orders", async (request) => {
      const { data, error } = await getRequestSupabase(request).from("orders").select("*, order_items(*), payments(*)").eq("buyer_id", request.user!.id).order("created_at", { ascending: false });
      if (error) throw user.httpErrors.internalServerError(error.message);
      return { data };
    });

    user.get("/notifications", async (request) => {
      const { data, error } = await getRequestSupabase(request)
        .from("notifications")
        .select("*")
        .eq("user_id", request.user!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw user.httpErrors.internalServerError(error.message);
      return { data };
    });

    user.patch("/notifications/:id/read", async (request) => {
      const p = request.params as { id: string };
      const { data, error } = await getRequestSupabase(request)
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", p.id)
        .eq("user_id", request.user!.id)
        .select("*")
        .single();
      if (error) throw user.httpErrors.badRequest(error.message);
      return { data };
    });

    user.post("/notifications/read-all", async (request) => {
      const { error } = await getRequestSupabase(request)
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", request.user!.id)
        .is("read_at", null);
      if (error) throw user.httpErrors.badRequest(error.message);
      return { message: "Notifications marked as read" };
    });

    user.get("/wishlist", async (request) => {
      const { data, error } = await getRequestSupabase(request).from("wishlists").select("*, products(*)").eq("user_id", request.user!.id);
      if (error) throw user.httpErrors.internalServerError(error.message);
      return { data };
    });
  }, { prefix: "/api/user" });
}
