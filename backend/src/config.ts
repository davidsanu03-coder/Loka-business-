import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default("0.0.0.0"),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  PAYSTACK_SECRET_KEY: z.string().min(1).optional(),
  PAYSTACK_CALLBACK_URL: z.string().url().optional()
});

export const env = envSchema.parse(process.env);
