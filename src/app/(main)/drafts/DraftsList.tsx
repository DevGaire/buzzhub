"use client";

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
import { Loader2 } from "lucide-react";
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

  const drafts = data?.pages.flatMap((p) => p.posts) || [];

  if (status === "pending") return <PostsLoadingSkeleton />;
  if (status === "error") {
    return (
      <p className="text-center text-destructive">
        Couldn&apos;t load your drafts.
      </p>
    );
  }
  if (!drafts.length) {
    return (
      <p className="rounded-2xl bg-card p-8 text-center text-muted-foreground">
        No drafts yet. Use &quot;Save as draft&quot; in the composer to park a post here.
      </p>
    );
  }

  return (
    <InfiniteScrollContainer
      className="space-y-3"
      onBottomReached={() => hasNextPage && !isFetching && fetchNextPage()}
    >
      {drafts.map((d) => (
        <DraftRow key={d.id} draft={d} />
      ))}
      {isFetchingNextPage && <Loader2 className="mx-auto my-3 animate-spin" />}
    </InfiniteScrollContainer>
  );
}

function DraftRow({ draft }: { draft: PostData }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(draft.content);

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
      toast({ description: "Draft published." });
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
      queryClient.setQueryData<InfiniteData<PostsPage, string | null>>(
        QUERY_KEY,
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((p) => ({
              ...p,
              posts: p.posts.map((x) => (x.id === draft.id ? updated : x)),
            })),
          };
        },
      );
      setEditing(false);
      toast({ description: "Draft saved." });
    },
    onError: () => {
      toast({ variant: "destructive", description: "Couldn't save." });
    },
  });

  const remove = useMutation({
    mutationFn: () => kyInstance.delete(`/api/drafts/${draft.id}`),
    onSuccess: () => {
      removeFromCache();
      toast({ description: "Draft deleted." });
    },
    onError: () => {
      toast({ variant: "destructive", description: "Couldn't delete." });
    },
  });

  return (
    <div className="rounded-2xl bg-card p-4 shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-3 text-xs text-muted-foreground">
        <span>Last edited {formatRelativeDate(draft.updatedAt)}</span>
        <span className="rounded-full bg-muted px-2 py-0.5 uppercase tracking-wide">
          Draft
        </span>
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
              onClick={() => {
                if (
                  confirm(
                    "Delete this draft? This can't be undone.",
                  )
                ) {
                  remove.mutate();
                }
              }}
              disabled={remove.isPending}
              className="text-destructive hover:text-destructive"
            >
              Delete
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              Edit
            </Button>
            <LoadingButton
              loading={publish.isPending}
              onClick={() => publish.mutate()}
              disabled={!draft.content.trim()}
              className="h-8"
            >
              Publish
            </LoadingButton>
          </>
        )}
      </div>
    </div>
  );
}
