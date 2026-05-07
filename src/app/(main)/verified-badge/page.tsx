import { validateRequest } from "@/auth";
import VerifiedBadge from "@/components/VerifiedBadge";
import prisma from "@/lib/prisma";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import GetVerifiedClient from "./GetVerifiedClient";

export const metadata: Metadata = {
  title: "Get Verified",
};

export default async function VerifiedBadgePage() {
  const { user: loggedInUser } = await validateRequest();
  if (!loggedInUser) redirect("/login");

  const me = await prisma.user.findUnique({
    where: { id: loggedInUser.id },
    select: { isVerified: true },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-2xl bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <VerifiedBadge size="lg" />
          <h1 className="text-2xl font-extrabold">Get verified on BuzzHub</h1>
        </div>
        <p className="mt-3 text-muted-foreground">
          Stand out with a blue checkmark next to your name. The badge tells
          others your account is the real one and helps people trust what you
          post.
        </p>

        <ul className="mt-5 space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <VerifiedBadge size="sm" />
            <span>Blue tick on your profile, posts, and comments</span>
          </li>
          <li className="flex items-center gap-2">
            <VerifiedBadge size="sm" />
            <span>Priority appearance in search and suggestions</span>
          </li>
          <li className="flex items-center gap-2">
            <VerifiedBadge size="sm" />
            <span>Cancel anytime &mdash; the badge stays while your subscription is active</span>
          </li>
        </ul>

        <div className="mt-6 rounded-xl border bg-muted/40 p-4">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-extrabold">£5</span>
            <span className="text-sm text-muted-foreground">/ month</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Billed monthly. Cancel anytime.
          </p>
        </div>

        <div className="mt-6">
          <GetVerifiedClient alreadyVerified={!!me?.isVerified} />
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Celebrities, public figures, and notable creators may be granted a
          badge by the BuzzHub team without a subscription.
        </p>
      </div>
    </div>
  );
}
