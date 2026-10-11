import type { FastifyInstance } from "fastify";
import { supabase } from "../lib/supabase.js";
import { getRequestSupabase } from "../lib/request-supabase.js";
import { requireRole } from "../plugins/auth.js";
import { categorySchema } from "../lib/validation.js";

export async function categoryRoutes(app: FastifyInstance) {
  app.get("/api/categories", async () => {
    const { data, error } = await supabase.from("categories").select("*").eq("is_active", true).order("name");
    if (error) throw app.httpErrors.internalServerError(error.message);
    return { data };
  });

  app.post("/api/admin/categories", { preHandler: requireRole("admin") }, async (request, reply) => {
    const body = categorySchema.parse(request.body);
    const { data, error } = await getRequestSupabase(request).from("categories").insert({
      name: body.name, slug: body.slug, description: body.description, parent_id: body.parentId, image_url: body.imageUrl, is_active: body.isActive
    }).select("*").single();
    if (error) throw app.httpErrors.badRequest(error.message);
    return reply.code(201).send({ data });
  });

  app.patch("/api/admin/categories/:id", { preHandler: requireRole("admin") }, async (request) => {
    const p = request.params as { id: string };
    const body = categorySchema.partial().parse(request.body);
    const { data, error } = await getRequestSupabase(request).from("categories").update({
      name: body.name, slug: body.slug, description: body.description, parent_id: body.parentId, image_url: body.imageUrl, is_active: body.isActive
    }).eq("id", p.id).select("*").single();
    if (error) throw app.httpErrors.badRequest(error.message);
    return { data };
  });

  app.delete("/api/admin/categories/:id", { preHandler: requireRole("admin") }, async (request) => {
    const p = request.params as { id: string };
    const { error } = await getRequestSupabase(request).from("categories").delete().eq("id", p.id);
    if (error) throw app.httpErrors.badRequest(error.message);
    return { message: "Category deleted" };
  });
}
