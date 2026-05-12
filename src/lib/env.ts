import { z } from "zod";

const schema = z.object({
  POSTGRES_PRISMA_URL: z.string().url(),
  POSTGRES_URL_NON_POOLING: z.string().url(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  UPLOADTHING_SECRET: z.string().min(1),
  NEXT_PUBLIC_UPLOADTHING_APP_ID: z.string().min(1),
  NEXT_PUBLIC_STREAM_KEY: z.string().min(1),
  STREAM_SECRET: z.string().min(1),
  CORN_SECRET: z.string().min(1),
  NEXT_PUBLIC_BASE_URL: z.string().url(),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.string().min(1),
  SMTP_USER: z.string().min(1),
  SMTP_PASS: z.string().min(1),
  MAIL_FROM: z.string().min(1),
  // Optional: Upstash Redis powers the optional cache layer (trending tags,
  // suggestions). Missing → cache helper no-ops and we fall through to DB.
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("\n  ");
    throw new Error(`Invalid environment configuration:\n  ${missing}`);
  }
  cached = parsed.data;
  return cached;
}
