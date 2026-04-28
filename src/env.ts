/**
 * Runtime environment validation.
 *
 * Imported from server-side modules that need typed/validated env vars.
 * In production, missing required keys throw at import time so the app
 * fails fast instead of crashing on first request. In dev we log a
 * warning so local development doesn't grind to a halt.
 */

const required = [
    "POSTGRES_PRISMA_URL",
    "POSTGRES_URL_NON_POOLING",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "UPLOADTHING_SECRET",
    "NEXT_PUBLIC_UPLOADTHING_APP_ID",
    "NEXT_PUBLIC_STREAM_KEY",
    "STREAM_SECRET",
    "CRON_SECRET",
    "NEXT_PUBLIC_BASE_URL",
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASS",
    "MAIL_FROM",
] as const;

const optional = [
    "STREAM_WEBHOOK_SECRET",
] as const;

type Required = (typeof required)[number];
type Optional = (typeof optional)[number];

const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
    const message = `Missing required environment variables: ${missing.join(", ")}`;
    if (process.env.NODE_ENV === "production") {
        throw new Error(message);
    } else {
        // eslint-disable-next-line no-console
        console.warn(`[env] ${message} — using empty strings (dev only)`);
    }
}

export const env: Record<Required, string> & Partial<Record<Optional, string>> = {
    POSTGRES_PRISMA_URL: process.env.POSTGRES_PRISMA_URL ?? "",
    POSTGRES_URL_NON_POOLING: process.env.POSTGRES_URL_NON_POOLING ?? "",
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? "",
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ?? "",
    UPLOADTHING_SECRET: process.env.UPLOADTHING_SECRET ?? "",
    NEXT_PUBLIC_UPLOADTHING_APP_ID: process.env.NEXT_PUBLIC_UPLOADTHING_APP_ID ?? "",
    NEXT_PUBLIC_STREAM_KEY: process.env.NEXT_PUBLIC_STREAM_KEY ?? "",
    STREAM_SECRET: process.env.STREAM_SECRET ?? "",
    CRON_SECRET: process.env.CRON_SECRET ?? "",
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL ?? "",
    SMTP_HOST: process.env.SMTP_HOST ?? "",
    SMTP_PORT: process.env.SMTP_PORT ?? "",
    SMTP_USER: process.env.SMTP_USER ?? "",
    SMTP_PASS: process.env.SMTP_PASS ?? "",
    MAIL_FROM: process.env.MAIL_FROM ?? "",
    STREAM_WEBHOOK_SECRET: process.env.STREAM_WEBHOOK_SECRET,
};
