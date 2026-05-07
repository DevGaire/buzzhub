"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import kyInstance from "@/lib/ky";
import { useMutation } from "@tanstack/react-query";
import { BadgeCheck, BadgeMinus } from "lucide-react";
import { useRouter } from "next/navigation";

interface VerifyToggleButtonProps {
  userId: string;
  isVerified: boolean;
}

export default function VerifyToggleButton({
  userId,
  isVerified,
}: VerifyToggleButtonProps) {
  const { toast } = useToast();
  const router = useRouter();

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      kyInstance
        .post(`/api/users/${userId}/verification`)
        .json<{ isVerified: boolean }>(),
    onSuccess: (data) => {
      toast({
        description: data.isVerified
          ? "Verification badge granted"
          : "Verification badge removed",
      });
      router.refresh();
    },
    onError: () =>
      toast({
        variant: "destructive",
        description: "Could not update verification",
      }),
  });

  return (
    <Button
      variant={isVerified ? "destructive" : "default"}
      size="sm"
      onClick={() => mutate()}
      disabled={isPending}
      className="gap-1.5"
      title="Admin only"
    >
      {isVerified ? (
        <>
          <BadgeMinus className="size-4" /> Revoke verification
        </>
      ) : (
        <>
          <BadgeCheck className="size-4" /> Grant verification
        </>
      )}
    </Button>
  );
}
