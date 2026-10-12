import { createClient } from "@supabase/supabase-js";
import type { FastifyRequest } from "fastify";
import { env } from "../config.js";

export function getRequestSupabase(request: FastifyRequest) {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    throw request.server.httpErrors.unauthorized("Missing bearer token");
  }

  const token = authorization.slice(7).trim();
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
}
