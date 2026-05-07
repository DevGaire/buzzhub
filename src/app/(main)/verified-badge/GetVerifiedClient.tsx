"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import kyInstance from "@/lib/ky";
import { useMutation } from "@tanstack/react-query";
import { BadgeCheck, Loader2 } from "lucide-react";

export default function GetVerifiedClient({
  alreadyVerified,
}: {
  alreadyVerified: boolean;
}) {
  const { toast } = useToast();

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      kyInstance.post("/api/billing/checkout").json<{ url: string }>(),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: async (err: any) => {
      const body = await err?.response?.json?.().catch(() => null);
      toast({
        variant: "destructive",
        description:
          body?.error ??
          "Could not start checkout. Subscriptions may not be enabled yet.",
      });
    },
  });

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
      onClick={() => mutate()}
      disabled={isPending}
    >
      {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
      Subscribe for £5/month
    </Button>
  );
}
