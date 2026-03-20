import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ACCESS_TOKEN_EXPIRES_MIN: z.coerce.number().default(15),
  REFRESH_TOKEN_EXPIRES_DAYS: z.coerce.number().default(7),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  COOKIE_SECURE: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  UPLOAD_DIR: z.string().default("./uploads"),
  API_PUBLIC_URL: z.string().default("http://localhost:4000"),
});

export type Env = z.infer<typeof envSchema>;

/** Origins must match the browser's `Origin` header exactly (no trailing slash). */
export function parseCorsOrigins(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

let cached: Env | null = null;

export function loadEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment", parsed.error.flatten());
    throw new Error("Invalid environment variables");
  }
  cached = parsed.data;
  return parsed.data;
}
