"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { BadgeCheck } from "lucide-react";

export default function GetVerifiedClient({
  alreadyVerified,
}: {
  alreadyVerified: boolean;
}) {
  const { toast } = useToast();

  if (alreadyVerified) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-blue-500/10 px-4 py-3 text-sm">
        <BadgeCheck className="size-5 text-blue-500" />
        <span>Your account is already verified.</span>
      </div>
    );
  }

  return (
    <Button
      size="lg"
      className="w-full"
      onClick={() =>
        toast({
          description:
            "Subscriptions aren't enabled yet. Check back soon — we're plugging in the payment provider.",
        })
      }
    >
      Subscribe for £5/month
    </Button>
  );
}
