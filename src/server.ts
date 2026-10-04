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

const app = Fastify({ logger: true });

await app.register(helmet);
await app.register(cors, {
  origin: env.CORS_ORIGIN,
  credentials: true
});
await app.register(sensible);

await app.register(healthRoutes);
await app.register(authRoutes);
await app.register(categoryRoutes);
await app.register(userRoutes);
await app.register(sellerRoutes);
await app.register(adminRoutes);
await app.register(sellerApplicationRoutes);

app.setErrorHandler((error, request, reply) => {
  request.log.error(error);

  let statusCode = 500;
  let message = "Internal Server Error";

  if (error instanceof Error) {
    message = error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof error.statusCode === "number" &&
    error.statusCode >= 400
  ) {
    statusCode = error.statusCode;
  }

  return reply.status(statusCode).send({
    error: statusCode === 500 ? "Internal Server Error" : message
  });
});

try {
  await app.listen({ port: env.PORT, host: env.HOST });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
