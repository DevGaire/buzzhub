"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import kyInstance from "@/lib/ky";
import { useMutation } from "@tanstack/react-query";
import { Ban, Check, EyeOff, Loader2, Trash2, User as UserIcon, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ReportRowProps {
  report: {
    id: string;
    targetType: "POST" | "USER" | "COMMENT";
    targetId: string;
    reason: string;
    createdAt: string;
    reporter: { id: string; username: string; displayName: string };
  };
  target: {
    kind: "POST" | "USER" | "COMMENT";
    label: string;
    ownerUserId?: string;
    ownerUsername?: string;
    suspended?: boolean;
  } | null;
}

export default function ReportRow({ report, target }: ReportRowProps) {
  const { toast } = useToast();
  const router = useRouter();

  const decideMutation = useMutation({
    mutationFn: (action: "RESOLVE" | "REJECT") =>
      kyInstance
        .post(`/api/admin/reports/${report.id}`, { json: { action } })
        .json(),
    onSuccess: (_, action) => {
      toast({
        description:
          action === "RESOLVE"
            ? "Report resolved — content hidden."
            : "Report rejected.",
      });
      router.refresh();
    },
    onError: () =>
      toast({ variant: "destructive", description: "Action failed" }),
  });

  const suspendMutation = useMutation({
    mutationFn: () =>
      kyInstance
        .post(`/api/admin/users/${target?.ownerUserId}/suspend`, {
          json: { reason: report.reason },
        })
        .json<{ suspended: boolean }>(),
    onSuccess: (data) => {
      toast({
        description: data.suspended ? "User suspended" : "User reinstated",
      });
      router.refresh();
    },
    onError: () =>
      toast({ variant: "destructive", description: "Action failed" }),
  });

  const hidePostsMutation = useMutation({
    mutationFn: () =>
      kyInstance
        .post(`/api/admin/users/${target?.ownerUserId}/hide-posts`)
        .json<{ hidden: number }>(),
    onSuccess: (data) => {
      toast({ description: `Hidden ${data.hidden} post${data.hidden === 1 ? "" : "s"}` });
      router.refresh();
    },
    onError: () =>
      toast({ variant: "destructive", description: "Action failed" }),
  });

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
        <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium uppercase">
          {report.targetType}
        </span>
        <span className="font-medium">{target?.label ?? "(target missing)"}</span>
        {target?.suspended && (
          <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-xs font-medium text-destructive">
            already suspended
          </span>
        )}
      </div>

      <p className="text-sm">
        <span className="text-muted-foreground">Reason: </span>
        {report.reason}
      </p>

      <p className="text-xs text-muted-foreground">
        Reported by{" "}
        <Link href={`/users/${report.reporter.username}`} className="hover:underline">
          @{report.reporter.username}
        </Link>{" "}
        · {new Date(report.createdAt).toLocaleString()}
      </p>

      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          size="sm"
          onClick={() => decideMutation.mutate("RESOLVE")}
          disabled={decideMutation.isPending}
        >
          {decideMutation.isPending && decideMutation.variables === "RESOLVE" ? (
            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
          ) : report.targetType === "USER" ? (
            <Check className="mr-1.5 size-3.5" />
          ) : (
            <Trash2 className="mr-1.5 size-3.5" />
          )}
          {report.targetType === "USER" ? "Resolve" : "Resolve & hide"}
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => decideMutation.mutate("REJECT")}
          disabled={decideMutation.isPending}
        >
          <X className="mr-1.5 size-3.5" />
          Reject
        </Button>

        {target?.ownerUserId && (
          <>
            <Button
              size="sm"
              variant={target.suspended ? "outline" : "destructive"}
              onClick={() => suspendMutation.mutate()}
              disabled={suspendMutation.isPending}
            >
              {suspendMutation.isPending ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <Ban className="mr-1.5 size-3.5" />
              )}
              {target.suspended ? "Unsuspend user" : "Suspend user"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => hidePostsMutation.mutate()}
              disabled={hidePostsMutation.isPending}
            >
              {hidePostsMutation.isPending ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <EyeOff className="mr-1.5 size-3.5" />
              )}
              Hide all posts
            </Button>
          </>
        )}

        {target?.ownerUsername && (
          <Button asChild size="sm" variant="ghost">
            <Link href={`/users/${target.ownerUsername}`}>
              <UserIcon className="mr-1.5 size-3.5" /> View profile
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
