import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().default("postgres://sentience:sentience@localhost:5432/sentience"),
  JWT_SECRET: z.string().default("sentience-dev-jwt-secret-do-not-use-in-production"),
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default("0.0.0.0"),
});

export const env = envSchema.parse(process.env);
