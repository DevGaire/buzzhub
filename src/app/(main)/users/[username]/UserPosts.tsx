"use client";

import InfiniteScrollContainer from "@/components/InfiniteScrollContainer";
import Post from "@/components/posts/Post";
import PostsLoadingSkeleton from "@/components/posts/PostsLoadingSkeleton";
import kyInstance from "@/lib/ky";
import { PostsPage } from "@/lib/types";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Loader2, LayoutGrid, List, Play } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface UserPostsProps {
  userId: string;
}

export default function UserPosts({ userId }: UserPostsProps) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery({
    queryKey: ["post-feed", "user-posts", userId],
    queryFn: ({ pageParam }) =>
      kyInstance
        .get(
          `/api/users/${userId}/posts`,
          pageParam ? { searchParams: { cursor: pageParam } } : {},
        )
        .json<PostsPage>(),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const [mode, setMode] = useState<"grid" | "list">("grid");

  const posts = data?.pages.flatMap((page) => page.posts) || [];

  if (status === "pending") {
    return <PostsLoadingSkeleton />;
  }

  if (status === "success" && !posts.length && !hasNextPage) {
    return (
      <p className="text-center text-muted-foreground">
        This user hasn&apos;t posted anything yet.
      </p>
    );
  }

  if (status === "error") {
    return (
      <p className="text-center text-destructive">
        An error occurred while loading posts.
      </p>
    );
  }

  return (
    <>
      <div className="mb-2 flex justify-end gap-2">
        <Button
          variant={mode === "grid" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setMode("grid")}
          title="Grid"
        >
          <LayoutGrid className="size-4" />
        </Button>
        <Button
          variant={mode === "list" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setMode("list")}
          title="List"
        >
          <List className="size-4" />
        </Button>
      </div>

      <InfiniteScrollContainer
        className={mode === "grid" ? "" : "space-y-5"}
        onBottomReached={() => hasNextPage && !isFetching && fetchNextPage()}
      >
        {mode === "grid" ? (
          <div className="grid grid-cols-3 gap-1 sm:gap-2">
            {posts.map((p) => {
              const image = p.attachments?.find((a) => a.type === "IMAGE");
              const hasVideo = p.attachments?.some((a) => a.type === "VIDEO");
              const text = !image && !hasVideo ? p.content : "";
              return (
                <Link
                  key={p.id}
                  href={`/posts/${p.id}`}
                  className="relative block aspect-square overflow-hidden bg-muted"
                >
                  {image ? (
                    <Image
                      src={image.url}
                      alt={p.user.displayName + " post"}
                      fill
                      sizes="(max-width: 768px) 33vw, 200px"
                      className="object-cover"
                    />
                  ) : text ? (
                    <div className="h-full w-full p-2 text-xs text-muted-foreground">
                      {text.slice(0, 120)}
                    </div>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <Play className="size-6" />
                    </div>
                  )}
                  {hasVideo && (
                    <div className="pointer-events-none absolute right-1 top-1 rounded bg-black/50 p-1 text-white">
                      <Play className="size-4" />
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        ) : (
          posts.map((post) => <Post key={post.id} post={post} />)
        )}
        {isFetchingNextPage && (
          <Loader2 className="mx-auto my-3 animate-spin" />
        )}
      </InfiniteScrollContainer>
    </>
  );
}
