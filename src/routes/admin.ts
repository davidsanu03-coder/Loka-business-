import type { FastifyInstance } from "fastify";
import { requireRole } from "../plugins/auth.js";
import { supabase } from "../lib/supabase.js";

export async function adminRoutes(app: FastifyInstance) {
  app.register(async (admin) => {
    admin.addHook("preHandler", requireRole("admin"));

    admin.get("/users", async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw admin.httpErrors.internalServerError(error.message);
      return { data };
    });

    admin.get("/sellers", async () => {
      const { data, error } = await supabase
        .from("seller_profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw admin.httpErrors.internalServerError(error.message);
      return { data };
    });

    admin.get("/orders", async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .order("created_at", { ascending: false });

      if (error) throw admin.httpErrors.internalServerError(error.message);
      return { data };
    });
  }, { prefix: "/api/admin" });
}
