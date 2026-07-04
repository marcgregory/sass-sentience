import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().default("postgres://sentience:sentience@localhost:5432/sentience"),
  JWT_SECRET: z.string().default("change-me-to-a-random-secret-in-production"),
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default("0.0.0.0"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RENDER_API_KEY: z.string().optional(),
  RENDER_SIMULATOR_SERVICE_ID: z.string().optional(),
});

export const env = envSchema.parse(process.env);

// Check for default/placeholder secrets at startup
const DEFAULT_SECRETS = [
  "change-me-to-a-random-secret-in-production",
  "sentience-dev-jwt-secret-do-not-use-in-production",
];
if (DEFAULT_SECRETS.includes(env.JWT_SECRET)) {
  console.warn(
    "\n⚠️  WARNING: Using default JWT_SECRET. Set JWT_SECRET in your .env file",
    "\n   for a secure production deployment.\n",
  );
}
