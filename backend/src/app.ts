import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import sensible from "@fastify/sensible";
import { env } from "./config.js";
import { healthRoutes } from "./routes/health.js";
import { userRoutes } from "./routes/user.js";
import { sellerRoutes } from "./routes/seller.js";
import { adminRoutes, sellerApplicationRoutes } from "./routes/admin.js";
import { authRoutes } from "./routes/auth.js";
import { categoryRoutes } from "./routes/categories.js";
import { commerceRoutes } from "./routes/commerce.js";
import { paymentRoutes } from "./routes/payments.js";
import { reviewRoutes } from "./routes/reviews.js";
import { productRoutes } from "./routes/products.js";
import { disputeRoutes } from "./routes/disputes.js";

export async function buildApp() {
  const app = Fastify({ logger: false });

  app.removeContentTypeParser("application/json");
  app.addContentTypeParser("application/json", { parseAs: "string" }, (request, body, done) => {
    const rawBody = typeof body === "string" ? body : body.toString("utf8");
    request.rawBody = rawBody;
    try {
      done(null, JSON.parse(rawBody));
    } catch {
      const error = new Error("Invalid JSON body");
      (error as Error & { statusCode?: number }).statusCode = 400;
      done(error);
    }
  });

  await app.register(helmet);
  const allowedOrigins = env.CORS_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean);
  await app.register(cors, {
    credentials: true,
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      let hostname = "";
      try { hostname = new URL(origin).hostname; } catch { return callback(new Error("Origin not allowed"), false); }
      const isLokaPreview = hostname.startsWith("loka-business-") &&
        hostname.endsWith("-davidsanu03-4141s-projects.vercel.app");
      if (isLokaPreview) return callback(null, true);
      return callback(new Error("Origin not allowed"), false);
    }
  });
  await app.register(sensible);
  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(categoryRoutes);
  await app.register(productRoutes);
  await app.register(userRoutes);
  await app.register(commerceRoutes);
  await app.register(paymentRoutes);
  await app.register(reviewRoutes);
  await app.register(disputeRoutes);
  await app.register(sellerRoutes);
  await app.register(adminRoutes);
  await app.register(sellerApplicationRoutes);

  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);
    let statusCode = 500;
    let message = "Internal Server Error";
    if (error instanceof Error) message = error.message;
    if (typeof error === "object" && error !== null && "statusCode" in error &&
        typeof error.statusCode === "number" && error.statusCode >= 400) {
      statusCode = error.statusCode;
    }
    return reply.status(statusCode).send({ error: statusCode === 500 ? "Internal Server Error" : message });
  });

  return app;
}
