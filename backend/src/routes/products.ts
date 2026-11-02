import type { FastifyInstance } from "fastify";
import { supabase } from "../lib/supabase.js";

const productSelect = "id, seller_id, store_id, category_id, name, slug, description, price, compare_at_price, currency, status, metadata, created_at, updated_at, product_images(id, url, alt_text, sort_order), inventory(quantity, reserved_quantity), stores(id, name, slug, logo_url)";

export async function productRoutes(app: FastifyInstance) {
  app.get("/api/products", async (request) => {
    const query = request.query as { q?: string; categoryId?: string; category?: string; page?: string; limit?: string; sort?: string };
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(48, Math.max(1, Number(query.limit) || 24));
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    let builder = supabase.from("products").select(productSelect, { count: "exact" }).eq("status", "active").order("created_at", { ascending: false }).range(from, to);
    if (query.q?.trim()) builder = builder.ilike("name", "%" + query.q.trim().replace(/[%_]/g, "") + "%");
    if (query.categoryId) builder = builder.eq("category_id", query.categoryId);
    if (query.category) {
      const { data: category, error: categoryError } = await supabase.from("categories").select("id").eq("slug", query.category).eq("is_active", true).maybeSingle();
      if (categoryError) throw app.httpErrors.internalServerError(categoryError.message);
      if (!category) return { data: [], meta: { page, limit, total: 0, pages: 0 } };
      builder = builder.eq("category_id", category.id);
    }
    if (query.sort === "price_asc") builder = builder.order("price", { ascending: true });
    if (query.sort === "price_desc") builder = builder.order("price", { ascending: false });
    const { data, error, count } = await builder;
    if (error) throw app.httpErrors.internalServerError(error.message);
    return { data: data ?? [], meta: { page, limit, total: count ?? 0, pages: Math.ceil((count ?? 0) / limit) } };
  });
  app.get("/api/products/:slug", async (request) => {
    const params = request.params as { slug: string };
    const { data, error } = await supabase.from("products").select(productSelect).eq("slug", params.slug).eq("status", "active").maybeSingle();
    if (error) throw app.httpErrors.internalServerError(error.message);
    if (!data) throw app.httpErrors.notFound("Product not found");
    return { data };
  });
}
