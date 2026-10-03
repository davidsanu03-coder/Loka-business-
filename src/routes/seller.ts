import type { FastifyInstance } from "fastify";
import { requireRole } from "../plugins/auth.js";
import { supabase } from "../lib/supabase.js";

export async function sellerRoutes(app: FastifyInstance) {
  app.register(async (seller) => {
    seller.addHook("preHandler", requireRole("seller", "admin"));

    seller.get("/profile", async (request) => {
      const { data, error } = await supabase
        .from("seller_profiles")
        .select("*")
        .eq("user_id", request.user!.id)
        .single();

      if (error) throw seller.httpErrors.internalServerError(error.message);
      return { data };
    });

    seller.get("/products", async (request) => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("seller_id", request.user!.id)
        .order("created_at", { ascending: false });

      if (error) throw seller.httpErrors.internalServerError(error.message);
      return { data };
    });

    seller.get("/orders", async (request) => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("seller_id", request.user!.id)
        .order("created_at", { ascending: false });

      if (error) throw seller.httpErrors.internalServerError(error.message);
      return { data };
    });
  }, { prefix: "/api/seller" });
}
