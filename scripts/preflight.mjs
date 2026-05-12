#!/usr/bin/env node
/**
 * Pre-deploy env sanity check. Reads .env / .env.local / process.env
 * and reports which required vars are missing and which optional ones
 * are present.
 *
 * Usage: node scripts/preflight.mjs
 *
 * Exits non-zero if any required var is missing, so it can gate a
 * Vercel deploy via the `build` script if you want.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// Load .env / .env.local manually — we don't pull dotenv just for this.
for (const f of [".env", ".env.local", ".env.production.local"]) {
  const p = resolve(process.cwd(), f);
  if (!existsSync(p)) continue;
  const text = readFileSync(p, "utf8");
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

const required = [
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL_NON_POOLING",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "UPLOADTHING_SECRET",
  "NEXT_PUBLIC_UPLOADTHING_APP_ID",
  "NEXT_PUBLIC_STREAM_KEY",
  "STREAM_SECRET",
  "NEXT_PUBLIC_BASE_URL",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "MAIL_FROM",
];

const cronSecret = process.env.CRON_SECRET || process.env.CORN_SECRET;

const optional = [
  "STRIPE_SECRET_KEY",
  "STRIPE_PRICE_ID_VERIFIED",
  "STRIPE_WEBHOOK_SECRET",
  "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "SENTRY_DSN",
  "NEXT_PUBLIC_SENTRY_DSN",
  "SENTRY_AUTH_TOKEN",
  "SENTRY_ORG",
  "SENTRY_PROJECT",
  "STREAM_WEBHOOK_SECRET",
];

const missing = required.filter((k) => !process.env[k]);
const present = [
  ...required.filter((k) => !!process.env[k]),
  ...(cronSecret ? ["CRON_SECRET"] : []),
];
const optPresent = optional.filter((k) => !!process.env[k]);
const optMissing = optional.filter((k) => !process.env[k]);

console.log("Required:");
for (const k of required) {
  console.log(`  ${process.env[k] ? "✓" : "✗"} ${k}`);
}
console.log(`  ${cronSecret ? "✓" : "✗"} CRON_SECRET (or CORN_SECRET)`);

console.log("\nOptional:");
for (const k of optional) {
  console.log(`  ${process.env[k] ? "✓" : "·"} ${k}`);
}

// Targeted warnings that would have bitten an operator in prod:
const warnings = [];
if (process.env.CRON_SECRET && process.env.CORN_SECRET) {
  if (process.env.CRON_SECRET !== process.env.CORN_SECRET) {
    warnings.push(
      "CRON_SECRET and CORN_SECRET are both set but don't match — they should be identical, or you should drop CORN_SECRET.",
    );
  }
}
if (
  (process.env.UPSTASH_REDIS_REST_URL && !process.env.UPSTASH_REDIS_REST_TOKEN) ||
  (!process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
) {
  warnings.push(
    "Upstash URL and TOKEN must be set together. The cache layer will no-op until both are present.",
  );
}
if (process.env.SENTRY_AUTH_TOKEN && !process.env.SENTRY_ORG) {
  warnings.push(
    "SENTRY_AUTH_TOKEN is set but SENTRY_ORG is missing — source-map upload will fail.",
  );
}
if (
  (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_WEBHOOK_SECRET) ||
  (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_PRICE_ID_VERIFIED)
) {
  warnings.push(
    "Stripe key present but webhook secret / price ID missing. /api/billing/webhook will reject signed events.",
  );
}

if (warnings.length) {
  console.log("\nWarnings:");
  for (const w of warnings) console.log(`  ! ${w}`);
}

console.log(
  `\n${present.length}/${required.length + 1} required set, ${optPresent.length}/${optional.length} optional set.`,
);

if (missing.length || !cronSecret) {
  process.exit(1);
}
