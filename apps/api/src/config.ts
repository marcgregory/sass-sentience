import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().default("postgres://sentience:sentience@localhost:5432/sentience"),
  JWT_SECRET: z.string().min(8, "JWT_SECRET must be at least 8 characters"),
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default("0.0.0.0"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RENDER_API_KEY: z.string().optional(),
  RENDER_SIMULATOR_SERVICE_ID: z.string().optional(),
});

export const env = envSchema.parse(process.env);
