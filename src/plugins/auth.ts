import type { FastifyRequest } from "fastify";
import { supabase } from "../lib/supabase.js";
import type { AppRole, AuthenticatedUser } from "../types/auth.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

export async function authenticate(request: FastifyRequest) {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    throw request.server.httpErrors.unauthorized("Missing bearer token");
  }

  const token = authorization.slice(7).trim();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    throw request.server.httpErrors.unauthorized("Invalid or expired token");
  }

  const role = (data.user.app_metadata?.role ?? "user") as AppRole;
  if (!["user", "seller", "admin"].includes(role)) {
    throw request.server.httpErrors.forbidden("Invalid account role");
  }

  request.user = {
    id: data.user.id,
    email: data.user.email,
    role
  };
}

export function requireRole(...roles: AppRole[]) {
  return async (request: FastifyRequest) => {
    await authenticate(request);
    if (!request.user || !roles.includes(request.user.role)) {
      throw request.server.httpErrors.forbidden("Insufficient permissions");
    }
  };
}
