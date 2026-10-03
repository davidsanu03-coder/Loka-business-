import type { FastifyInstance } from "fastify";
import { authenticate } from "../plugins/auth.js";
import { supabase } from "../lib/supabase.js";

export async function userRoutes(app: FastifyInstance) {
  app.register(async (user) => {
    user.addHook("preHandler", authenticate);

    user.get("/profile", async (request) => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", request.user!.id)
        .single();

      if (error) throw user.httpErrors.internalServerError(error.message);
      return { data };
    });

    user.get("/orders", async (request) => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("buyer_id", request.user!.id)
        .order("created_at", { ascending: false });

      if (error) throw user.httpErrors.internalServerError(error.message);
      return { data };
    });

    user.get("/wishlist", async (request) => {
      const { data, error } = await supabase
        .from("wishlists")
        .select("*, products(*)")
        .eq("user_id", request.user!.id);

      if (error) throw user.httpErrors.internalServerError(error.message);
      return { data };
    });
  }, { prefix: "/api/user" });
}
