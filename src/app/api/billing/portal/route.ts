import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

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

    const sub = await prisma.subscription.findUnique({
      where: { userId: user.id },
    });
    if (!sub) {
      return Response.json({ error: "No subscription" }, { status: 404 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!;
    const session = await getStripe().billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${baseUrl}/settings`,
    });

    return Response.json({ url: session.url });
  } catch (err) {
    console.error("portal failed", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
