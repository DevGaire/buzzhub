"use client";

import { useToast } from "@/components/ui/use-toast";
import kyInstance from "@/lib/ky";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BarChart2, Clock } from "lucide-react";
import { useState } from "react";

interface PollOption {
  id: string;
  text: string;
  order: number;
  _count: { votes: number };
}

interface PollData {
  id: string;
  expiresAt: Date | null;
  options: PollOption[];
  votes: { optionId: string }[];
  _count: { votes: number };
}

interface PollDisplayProps {
  poll: PollData;
  postId: string;
}

export default function PollDisplay({ poll, postId }: PollDisplayProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [optimisticPoll, setOptimisticPoll] = useState(poll);

  const userVote = optimisticPoll.votes[0]?.optionId ?? null;
  const hasVoted = !!userVote;
  const totalVotes = optimisticPoll._count.votes;
  const isExpired = optimisticPoll.expiresAt
    ? new Date(optimisticPoll.expiresAt) < new Date()
    : false;

  const { mutate: vote, isPending } = useMutation({
    mutationFn: (optionId: string) =>
      kyInstance.post(`/api/posts/${postId}/poll/vote`, { json: { optionId } }).json<PollData>(),
    onMutate: (optionId) => {
      // Optimistic update
      const prev = optimisticPoll;
      const wasVoted = userVote === optionId;
      setOptimisticPoll((p) => {
        const newOptions = p.options.map((o) => ({
          ...o,
          _count: {
            votes:
              o.id === optionId
                ? wasVoted
                  ? o._count.votes - 1
                  : o._count.votes + 1
                : o.id === userVote
                  ? o._count.votes - 1
                  : o._count.votes,
          },
        }));
        const totalDelta = wasVoted ? -1 : userVote ? 0 : 1;
        return {
          ...p,
          options: newOptions,
          votes: wasVoted ? [] : [{ optionId }],
          _count: { votes: p._count.votes + totalDelta },
        };
      });
      return { prev };
    },
    onSuccess: (updated) => {
      setOptimisticPoll(updated);
      queryClient.invalidateQueries({ queryKey: ["post-feed"] });
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) setOptimisticPoll(ctx.prev);
      toast({ variant: "destructive", description: "Failed to vote. Try again." });
    },
  });

  return (
    <div className="mt-3 rounded-2xl border bg-background/50 p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <BarChart2 className="size-4" />
        <span className="font-medium">Poll</span>
        {optimisticPoll.expiresAt && (
          <span className="ml-auto flex items-center gap-1">
            <Clock className="size-3.5" />
            {isExpired
              ? "Ended"
              : `Ends ${new Date(optimisticPoll.expiresAt).toLocaleDateString()}`}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {optimisticPoll.options.map((option) => {
          const pct = totalVotes > 0 ? Math.round((option._count.votes / totalVotes) * 100) : 0;
          const isSelected = userVote === option.id;
          const showResults = hasVoted || isExpired;

          return (
            <button
              key={option.id}
              onClick={() => !isExpired && !isPending && vote(option.id)}
              disabled={isExpired || isPending}
              className={cn(
                "relative w-full overflow-hidden rounded-xl border px-4 py-2.5 text-left transition-all",
                isSelected
                  ? "border-primary bg-primary/10 font-medium text-primary"
                  : "hover:bg-muted/60 disabled:opacity-70",
              )}
            >
              {showResults && (
                <div
                  className={cn(
                    "absolute inset-0 rounded-xl transition-all duration-500",
                    isSelected ? "bg-primary/15" : "bg-muted/50",
                  )}
                  style={{ width: `${pct}%` }}
                />
              )}
              <div className="relative flex items-center justify-between gap-2">
                <span className="text-sm">{option.text}</span>
                {showResults && (
                  <span className="text-xs tabular-nums text-muted-foreground">{pct}%</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
        {!hasVoted && !isExpired && " · Click to vote"}
      </p>
    </div>
  );
}
