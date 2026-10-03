import type { FastifyInstance } from "fastify";
import { supabase } from "../lib/supabase.js";
import { authenticate } from "../plugins/auth.js";
import { registerSchema, profileSchema } from "../lib/validation.js";

export async function authRoutes(app: FastifyInstance) {
  app.post("/api/auth/register", async (request, reply) => {
    const body = registerSchema.parse(request.body);
    const { data, error } = await supabase.auth.signUp({
      email: body.email,
      password: body.password,
      options: { data: { full_name: body.fullName, phone: body.phone } }
    });

    if (error) throw app.httpErrors.badRequest(error.message);
    return reply.code(201).send({
      user: data.user,
      session: data.session
    });
  });

  app.post("/api/auth/login", async (request) => {
    const body = registerSchema.pick({ email: true, password: true }).parse(request.body);
    const { data, error } = await supabase.auth.signInWithPassword(body);
    if (error) throw app.httpErrors.unauthorized(error.message);
    return { user: data.user, session: data.session };
  });

  app.post("/api/auth/logout", { preHandler: authenticate }, async () => {
    return { message: "Signed out. The client should discard its access token." };
  });

  app.get("/api/auth/me", { preHandler: authenticate }, async (request) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", request.user!.id)
      .single();

    if (error) throw app.httpErrors.internalServerError(error.message);
    return { user: request.user, profile: data };
  });

  app.patch("/api/user/profile", { preHandler: authenticate }, async (request) => {
    const body = profileSchema.parse(request.body);
    const update = {
      full_name: body.fullName,
      phone: body.phone,
      avatar_url: body.avatarUrl
    };

    const { data, error } = await supabase
      .from("profiles")
      .update(update)
      .eq("id", request.user!.id)
      .select("*")
      .single();

    if (error) throw app.httpErrors.badRequest(error.message);
    return { data };
  });
}
