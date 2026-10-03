import type { FastifyInstance } from "fastify";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async () => ({
    status: "ok",
    service: "loka-business-backend",
    timestamp: new Date().toISOString()
  }));
}
