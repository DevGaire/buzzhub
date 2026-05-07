import Stripe from "stripe";

export const VERIFIED_PLAN = "verified-badge";

let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  cached = new Stripe(key, {
    typescript: true,
  });
  return cached;
}

export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_PRICE_ID_VERIFIED &&
      process.env.STRIPE_WEBHOOK_SECRET,
  );
}
