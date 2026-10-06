import type { FastifyInstance } from "fastify";

import { authenticate } from "../plugins/auth.js";
import { getRequestSupabase } from "../lib/request-supabase.js";

export async function userRoutes(app: FastifyInstance) {
  app.register(
    async (user) => {
      user.addHook("preHandler", authenticate);

      // Get the current user's profile
      user.get("/profile", async (request) => {
        const client = getRequestSupabase(request);

        const { data, error } = await client
          .from("profiles")
          .select("*")
          .eq("id", request.user!.id)
          .single();

        if (error) {
          throw user.httpErrors.notFound("Profile not found");
        }

        return { data };
      });

      // Get the user's order history
      user.get("/orders", async (request) => {
        const client = getRequestSupabase(request);

        const { data, error } = await client
          .from("orders")
          .select(
            `
              *,
              order_items (
                *,
                products (
                  id,
                  name,
                  slug,
                  price,
                  currency
                )
              ),
              payments (
                id,
                amount,
                currency,
                status,
                provider,
                reference,
                paid_at,
                created_at
              )
            `,
          )
          .eq("buyer_id", request.user!.id)
          .order("created_at", { ascending: false });

        if (error) {
          throw user.httpErrors.internalServerError(error.message);
        }

        return { data };
      });

      // Get notifications
      user.get("/notifications", async (request) => {
        const client = getRequestSupabase(request);

        const { data, error } = await client
          .from("notifications")
          .select("*")
          .eq("user_id", request.user!.id)
          .order("created_at", { ascending: false });

        if (error) {
          throw user.httpErrors.internalServerError(error.message);
        }

        return { data };
      });

      // Mark one notification as read
      user.patch("/notifications/:id/read", async (request) => {
        const { id } = request.params as {
          id: string;
        };

        const client = getRequestSupabase(request);

        const { data, error } = await client
          .from("notifications")
          .update({
            read_at: new Date().toISOString(),
          })
          .eq("id", id)
          .eq("user_id", request.user!.id)
          .select("*")
          .single();

        if (error) {
          throw user.httpErrors.notFound("Notification not found");
        }

        return { data };
      });

      // Mark all notifications as read
      user.post("/notifications/read-all", async (request) => {
        const client = getRequestSupabase(request);

        const { data, error } = await client
          .from("notifications")
          .update({
            read_at: new Date().toISOString(),
          })
          .eq("user_id", request.user!.id)
          .is("read_at", null)
          .select("*");

        if (error) {
          throw user.httpErrors.internalServerError(error.message);
        }

        return {
          data,
          message: "All notifications marked as read",
        };
      });

      // Get the user's wishlist
      user.get("/wishlist", async (request) => {
        const client = getRequestSupabase(request);

        const { data, error } = await client
          .from("wishlists")
          .select(
            `
              id,
              product_id,
              created_at,
              products (
                id,
                name,
                slug,
                description,
                price,
                compare_at_price,
                currency,
                status,
                seller_id,
                store_id,
                category_id
              )
            `,
          )
          .eq("user_id", request.user!.id)
          .order("created_at", { ascending: false });

        if (error) {
          throw user.httpErrors.internalServerError(error.message);
        }

        return { data };
      });
    },
    {
      prefix: "/api/user",
    },
  );
}