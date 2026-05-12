"use client";

import ConfirmDialog from "@/components/ConfirmDialog";
import EmptyState from "@/components/EmptyState";
import InfiniteScrollContainer from "@/components/InfiniteScrollContainer";
import LoadingButton from "@/components/LoadingButton";
import PostsLoadingSkeleton from "@/components/posts/PostsLoadingSkeleton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import kyInstance from "@/lib/ky";
import { PostData, PostsPage } from "@/lib/types";
import { formatRelativeDate } from "@/lib/utils";
import {
  InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { CalendarClock, Loader2 } from "lucide-react";
import { useState } from "react";

const QUERY_KEY = ["drafts"];

export default function DraftsList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery({
    queryKey: QUERY_KEY,
    queryFn: ({ pageParam }) =>
      kyInstance
        .get("/api/drafts", {
          searchParams: pageParam ? { cursor: pageParam } : {},
        })
        .json<PostsPage>(),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });

  const items = data?.pages.flatMap((p) => p.posts) || [];

  if (status === "pending") return <PostsLoadingSkeleton />;
  if (status === "error") {
    return (
      <p className="text-center text-destructive">
        Couldn&apos;t load your drafts.
      </p>
    );
  }
  if (!items.length) {
    return (
      <EmptyState
        emoji="📝"
        title="No drafts or scheduled posts"
        description={'Use "Save as draft" or "Schedule" in the composer to park a post here.'}
      />
    );
  }

  return (
    <InfiniteScrollContainer
      className="space-y-3"
      onBottomReached={() => hasNextPage && !isFetching && fetchNextPage()}
    >
      {items.map((d) => (
        <DraftRow key={d.id} draft={d} />
      ))}
      {isFetchingNextPage && <Loader2 className="mx-auto my-3 animate-spin" />}
    </InfiniteScrollContainer>
  );
}

function DraftRow({ draft }: { draft: PostData }) {
  const isScheduled = draft.status === "SCHEDULED";
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(draft.content);
  const [rescheduling, setRescheduling] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [scheduleAt, setScheduleAt] = useState<string>(
    draft.scheduledFor
      ? toLocalDatetimeInput(new Date(draft.scheduledFor))
      : "",
  );

  const removeFromCache = () => {
    queryClient.setQueryData<InfiniteData<PostsPage, string | null>>(
      QUERY_KEY,
      (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((p) => ({
            ...p,
            posts: p.posts.filter((x) => x.id !== draft.id),
          })),
        };
      },
    );
  };

  const replaceInCache = (next: PostData) => {
    queryClient.setQueryData<InfiniteData<PostsPage, string | null>>(
      QUERY_KEY,
      (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((p) => ({
            ...p,
            posts: p.posts.map((x) => (x.id === draft.id ? next : x)),
          })),
        };
      },
    );
  };

  const publish = useMutation({
    mutationFn: () =>
      kyInstance.post(`/api/drafts/${draft.id}/publish`).json<PostData>(),
    onSuccess: () => {
      removeFromCache();
      queryClient.invalidateQueries({
        queryKey: ["post-feed"],
        predicate: (q) =>
          q.queryKey.includes("for-you") || q.queryKey.includes("user-posts"),
      });
      toast({ description: "Published." });
    },
    onError: () => {
      toast({ variant: "destructive", description: "Couldn't publish." });
    },
  });

  const save = useMutation({
    mutationFn: (next: string) =>
      kyInstance
        .patch(`/api/drafts/${draft.id}`, { json: { content: next } })
        .json<PostData>(),
    onSuccess: (updated) => {
      replaceInCache(updated);
      setEditing(false);
      toast({ description: "Saved." });
    },
    onError: () => {
      toast({ variant: "destructive", description: "Couldn't save." });
    },
  });

  const reschedule = useMutation({
    mutationFn: (iso: string) =>
      kyInstance
        .patch(`/api/drafts/${draft.id}`, { json: { scheduledFor: iso } })
        .json<PostData>(),
    onSuccess: (updated) => {
      replaceInCache(updated);
      setRescheduling(false);
      toast({ description: "Schedule updated." });
    },
    onError: () => {
      toast({ variant: "destructive", description: "Couldn't reschedule." });
    },
  });

  const cancelSchedule = useMutation({
    mutationFn: () =>
      kyInstance
        .patch(`/api/drafts/${draft.id}`, { json: { cancelSchedule: true } })
        .json<PostData>(),
    onSuccess: (updated) => {
      replaceInCache(updated);
      toast({ description: "Moved back to drafts." });
    },
    onError: () => {
      toast({ variant: "destructive", description: "Couldn't cancel schedule." });
    },
  });

  const remove = useMutation({
    mutationFn: () => kyInstance.delete(`/api/drafts/${draft.id}`),
    onSuccess: () => {
      removeFromCache();
      toast({ description: "Deleted." });
    },
    onError: () => {
      toast({ variant: "destructive", description: "Couldn't delete." });
    },
  });

  return (
    <div className="rounded-2xl bg-card p-4 shadow-sm space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3 text-xs text-muted-foreground">
        <span>Last edited {formatRelativeDate(draft.updatedAt)}</span>
        {isScheduled ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 uppercase tracking-wide text-primary">
            <CalendarClock className="size-3" />
            Scheduled · {draft.scheduledFor ? new Date(draft.scheduledFor).toLocaleString() : ""}
          </span>
        ) : (
          <span className="rounded-full bg-muted px-2 py-0.5 uppercase tracking-wide">
            Draft
          </span>
        )}
      </div>
      {editing ? (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={Math.min(10, Math.max(3, content.split("\n").length))}
          className="w-full resize-y rounded-xl border bg-background p-3 text-sm"
        />
      ) : (
        <p className="whitespace-pre-wrap text-sm">
          {draft.content || (
            <span className="italic text-muted-foreground">(empty)</span>
          )}
        </p>
      )}
      {!!draft.attachments.length && (
        <p className="text-xs text-muted-foreground">
          {draft.attachments.length} attachment
          {draft.attachments.length === 1 ? "" : "s"}
        </p>
      )}
      {rescheduling && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/30 p-3 text-xs">
          <CalendarClock className="size-4 text-primary" />
          <label className="font-medium">Publish at</label>
          <input
            type="datetime-local"
            value={scheduleAt}
            min={toLocalDatetimeInput(new Date(Date.now() + 60_000))}
            onChange={(e) => setScheduleAt(e.target.value)}
            className="rounded-md border bg-background px-2 py-1"
          />
          <span className="text-muted-foreground">
            {Intl.DateTimeFormat().resolvedOptions().timeZone}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-7"
            onClick={() => {
              setRescheduling(false);
              setScheduleAt(
                draft.scheduledFor
                  ? toLocalDatetimeInput(new Date(draft.scheduledFor))
                  : "",
              );
            }}
          >
            Cancel
          </Button>
          <LoadingButton
            loading={reschedule.isPending}
            disabled={
              !scheduleAt ||
              new Date(scheduleAt).getTime() - Date.now() < 60_000
            }
            onClick={() =>
              reschedule.mutate(new Date(scheduleAt).toISOString())
            }
            className="h-7"
          >
            Save schedule
          </LoadingButton>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-end gap-2">
        {editing ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setContent(draft.content);
                setEditing(false);
              }}
            >
              Cancel
            </Button>
            <LoadingButton
              loading={save.isPending}
              disabled={!content.trim() || content === draft.content}
              onClick={() => save.mutate(content.trim())}
              className="h-8"
            >
              Save
            </LoadingButton>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmingDelete(true)}
              disabled={remove.isPending}
              className="text-destructive hover:text-destructive"
            >
              Delete
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              Edit
            </Button>
            {isScheduled ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => cancelSchedule.mutate()}
                  disabled={cancelSchedule.isPending}
                >
                  Move to drafts
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRescheduling((s) => !s)}
                >
                  {rescheduling ? "Close" : "Reschedule"}
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRescheduling((s) => !s)}
              >
                {rescheduling ? "Close" : "Schedule"}
              </Button>
            )}
            <LoadingButton
              loading={publish.isPending}
              onClick={() => publish.mutate()}
              disabled={!draft.content.trim()}
              className="h-8"
            >
              Publish now
            </LoadingButton>
          </>
        )}
      </div>
      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title={isScheduled ? "Delete scheduled post?" : "Delete draft?"}
        description="This can't be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          await remove.mutateAsync();
        }}
      />
    </div>
  );
}

function toLocalDatetimeInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}
