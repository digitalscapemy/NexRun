import { z } from "zod";

const httpUrlSchema = z
  .string()
  .url()
  .refine((value) => ["http:", "https:"].includes(new URL(value).protocol), {
    message: "must use http or https",
  });

const optionalSecretSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().min(32).optional(),
);

const integerFromEnvironment = (fallback: number, minimum: number, maximum: number) =>
  z.preprocess(
    (value) => (value === undefined || value === "" ? fallback : Number(value)),
    z.number().int().min(minimum).max(maximum),
  );

export const serverEnvironmentSchema = z.object({
  DATABASE_URL: z.string().min(1).refine((value) => /^postgres(?:ql)?:\/\//i.test(value), {
    message: "must be a PostgreSQL connection URL",
  }),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: httpUrlSchema,
  NEXT_PUBLIC_APP_URL: httpUrlSchema,
  UPLOADTHING_TOKEN: z.string().min(32),
  CRON_SECRET: optionalSecretSchema,
  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_FROM_EMAIL: z.string().email().optional().default("noreply@nexrun.my"),
  MOCK_PAYMENT_MODE: z.enum(["true", "false"]).default("true").transform((value) => value === "true"),
  TRUST_PROXY_HEADERS: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  DATABASE_POOL_MAX: integerFromEnvironment(10, 1, 50),
  DATABASE_POOL_IDLE_TIMEOUT_MS: integerFromEnvironment(30_000, 1_000, 300_000),
  DATABASE_CONNECTION_TIMEOUT_MS: integerFromEnvironment(10_000, 1_000, 60_000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

export function parseServerEnvironment(
  values: Record<string, string | undefined>,
): ServerEnvironment {
  const parsed = serverEnvironmentSchema.safeParse(values);
  if (parsed.success) return parsed.data;

  const fields = [...new Set(parsed.error.issues.map((issue) => issue.path.join(".") || "environment"))];
  throw new Error(`Invalid server environment configuration: ${fields.join(", ")}`);
}
