#!/usr/bin/env node
// One-shot: creates the BuzzHub Verified Badge product + £5/month recurring price,
// then writes STRIPE_PRICE_ID_VERIFIED back into .env. Idempotent — re-running
// reuses the existing product/price by lookup_key.
import fs from "node:fs";
import path from "node:path";
import Stripe from "stripe";

const ENV_PATH = path.resolve(".env");
const LOOKUP_KEY = "buzzhub_verified_monthly_gbp";
const PRODUCT_NAME = "BuzzHub Verified Badge";
const UNIT_AMOUNT = 500; // pence
const CURRENCY = "gbp";
const INTERVAL = "month";

function loadEnv() {
  const raw = fs.readFileSync(ENV_PATH, "utf8");
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
  }
  return { raw, parsed: out };
}

function setEnvVar(raw, key, value) {
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(raw)) return raw.replace(re, `${key}=${value}`);
  return raw.endsWith("\n") ? raw + `${key}=${value}\n` : raw + `\n${key}=${value}\n`;
}

async function main() {
  const { raw, parsed } = loadEnv();
  if (!parsed.STRIPE_SECRET_KEY) {
    console.error(
      "STRIPE_SECRET_KEY is empty in .env. Paste your sk_test_... key first.",
    );
    process.exit(1);
  }

  const stripe = new Stripe(parsed.STRIPE_SECRET_KEY);

  // Reuse an existing price if we've run this before.
  const existing = await stripe.prices.list({
    lookup_keys: [LOOKUP_KEY],
    expand: ["data.product"],
    limit: 1,
  });

  let priceId;
  if (existing.data[0]) {
    priceId = existing.data[0].id;
    console.log(`Reusing existing price ${priceId} (lookup_key=${LOOKUP_KEY})`);
  } else {
    const product = await stripe.products.create({
      name: PRODUCT_NAME,
      description: "Monthly subscription for the BuzzHub blue verified badge.",
    });
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: UNIT_AMOUNT,
      currency: CURRENCY,
      recurring: { interval: INTERVAL },
      lookup_key: LOOKUP_KEY,
    });
    priceId = price.id;
    console.log(`Created product ${product.id} and price ${priceId}`);
  }

  const next = setEnvVar(raw, "STRIPE_PRICE_ID_VERIFIED", priceId);
  if (next !== raw) {
    fs.writeFileSync(ENV_PATH, next);
    console.log("Updated .env with STRIPE_PRICE_ID_VERIFIED");
  }

  console.log("\nNext step: in a separate terminal run");
  console.log(
    "  stripe listen --forward-to localhost:3000/api/billing/webhook",
  );
  console.log("Copy the printed whsec_... into STRIPE_WEBHOOK_SECRET in .env.");
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
