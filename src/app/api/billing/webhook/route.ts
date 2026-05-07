import prisma from "@/lib/prisma";
import { getStripe, VERIFIED_PLAN } from "@/lib/stripe";
import type Stripe from "stripe";

export const dynamic = "force-dynamic";

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

async function handleSubscriptionEvent(sub: Stripe.Subscription) {
  const userId = (sub.metadata?.userId as string | undefined) ?? null;
  if (!userId) {
    console.warn("subscription event missing userId metadata", sub.id);
    return;
  }

  const isActive = ACTIVE_STATUSES.has(sub.status);
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const periodEnd = sub.current_period_end
    ? new Date(sub.current_period_end * 1000)
    : null;

  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
      status: sub.status,
      plan: VERIFIED_PLAN,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    },
    update: {
      stripeSubscriptionId: sub.id,
      status: sub.status,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    },
  });

  if (isActive) {
    await prisma.user.update({
      where: { id: userId },
      data: { isVerified: true, verificationSource: "PAID" },
    });
    return;
  }

  // Inactive: only revoke if the badge came from this paid subscription.
  // Admin / official grants are preserved.
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { verificationSource: true },
  });
  if (dbUser?.verificationSource === "PAID") {
    await prisma.user.update({
      where: { id: userId },
      data: { isVerified: false, verificationSource: null },
    });
  }
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return Response.json(
      { error: "Webhook not configured" },
      { status: 503 },
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ error: "Missing signature" }, { status: 400 });
  }

  const payload = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (err) {
    console.error("webhook signature failed", err);
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await handleSubscriptionEvent(event.data.object);
        break;
      default:
        // Ignore other events; Stripe will retry if we 500.
        break;
    }
    return Response.json({ received: true });
  } catch (err) {
    console.error("webhook handler failed", event.type, err);
    return Response.json({ error: "Handler failed" }, { status: 500 });
  }
}
