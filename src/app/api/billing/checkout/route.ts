import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { getStripe, isStripeConfigured, VERIFIED_PLAN } from "@/lib/stripe";

export async function POST() {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isStripeConfigured()) {
      return Response.json(
        { error: "Subscriptions are not enabled yet" },
        { status: 503 },
      );
    }

    const stripe = getStripe();

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { subscription: true },
    });
    if (!dbUser) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    let stripeCustomerId = dbUser.subscription?.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: dbUser.email ?? undefined,
        name: dbUser.displayName,
        metadata: { userId: dbUser.id, plan: VERIFIED_PLAN },
      });
      stripeCustomerId = customer.id;
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [
        { price: process.env.STRIPE_PRICE_ID_VERIFIED!, quantity: 1 },
      ],
      success_url: `${baseUrl}/verified-badge?status=success`,
      cancel_url: `${baseUrl}/verified-badge?status=cancelled`,
      subscription_data: {
        metadata: { userId: dbUser.id, plan: VERIFIED_PLAN },
      },
      metadata: { userId: dbUser.id, plan: VERIFIED_PLAN },
    });

    if (!session.url) {
      return Response.json(
        { error: "Stripe did not return a checkout URL" },
        { status: 500 },
      );
    }

    return Response.json({ url: session.url });
  } catch (err) {
    console.error("checkout failed", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
