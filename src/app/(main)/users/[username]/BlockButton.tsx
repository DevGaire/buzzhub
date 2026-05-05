"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { BlockInfo } from "@/lib/types";
import kyInstance from "@/lib/ky";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldBan, ShieldCheck } from "lucide-react";

export default function BlockButton({ userId }: { userId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["block-info", userId],
    queryFn: () => kyInstance.get(`/api/users/${userId}/block`).json<BlockInfo>(),
    staleTime: Infinity,
  });

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      kyInstance.post(`/api/users/${userId}/block`).json<BlockInfo>(),
    onSuccess: (updated) => {
      queryClient.setQueryData(["block-info", userId], updated);
      toast({
        description: updated.isBlockedByUser
          ? "User blocked"
          : "User unblocked",
      });
    },
    onError: () => toast({ variant: "destructive", description: "Action failed" }),
  });

  const isBlocked = data?.isBlockedByUser ?? false;

  return (
    <Button
      variant={isBlocked ? "destructive" : "outline"}
      size="sm"
      onClick={() => mutate()}
      disabled={isPending}
      className="gap-1.5"
    >
      {isBlocked ? (
        <>
          <ShieldBan className="size-4" /> Blocked
        </>
      ) : (
        <>
          <ShieldCheck className="size-4" /> Block
        </>
      )}
    </Button>
  );
}
