import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import sensible from "@fastify/sensible";
import { env } from "./config.js";
import { healthRoutes } from "./routes/health.js";
import { userRoutes } from "./routes/user.js";
import { sellerRoutes } from "./routes/seller.js";
import { adminRoutes } from "./routes/admin.js";

const app = Fastify({ logger: true });

await app.register(helmet);
await app.register(cors, {
  origin: env.CORS_ORIGIN,
  credentials: true
});
await app.register(sensible);

await app.register(healthRoutes);
await app.register(userRoutes);
await app.register(sellerRoutes);
await app.register(adminRoutes);

app.setErrorHandler((error, request, reply) => {
  request.log.error(error);
  const statusCode = error.statusCode && error.statusCode >= 400 ? error.statusCode : 500;
  return reply.status(statusCode).send({
    error: statusCode === 500 ? "Internal Server Error" : error.message
  });
});

try {
  await app.listen({ port: env.PORT, host: env.HOST });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
