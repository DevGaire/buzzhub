"use client";

import { useSession } from "@/app/(main)/SessionProvider";
import { PostData, CommentData, PostsPage } from "@/lib/types";
import { cn, formatRelativeDate } from "@/lib/utils";
import { MessageSquare, Repeat, Share2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Comments from "../comments/Comments";
import CommentsSheet from "../comments/CommentsSheet";
import Linkify from "../Linkify";
import UserAvatar from "../UserAvatar";
import UserTooltip from "../UserTooltip";
import VerifiedBadge from "../VerifiedBadge";
import BookmarkButton from "./BookmarkButton";
import LikeButton from "./LikeButton";
import PostMoreButton from "./PostMoreButton";
import PollDisplay from "./PollDisplay";
import QuotePostDisplay from "./QuotePostDisplay";
import { useMutation, useQueryClient, QueryFilters, InfiniteData } from "@tanstack/react-query";
import { useToast } from "../ui/use-toast";
import { repostPost } from "./actions";
import MediaCarousel from "./MediaCarousel";

interface PostProps {
  post: PostData;
}

export default function Post({ post }: PostProps) {
  const { user } = useSession();

  const [showComments, setShowComments] = useState(false);
  const [expandedCommentId, setExpandedCommentId] = useState<string | null>(null);
  const articleRef = useRef<HTMLElement | null>(null);

  const handleCommentPreviewClick = (commentId: string) => {
    setShowComments(true);
    setExpandedCommentId(commentId);
  };

  useImpressionBeacon(articleRef, post.id, post.user.id === user.id);

  return (
    <article ref={articleRef} className="group/post space-y-3 rounded-2xl bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <UserTooltip user={post.user}>
            <Link href={`/users/${post.user.username}`}>
              <UserAvatar avatarUrl={post.user.avatarUrl} />
            </Link>
          </UserTooltip>
          <div>
            <UserTooltip user={post.user}>
              <Link
                href={`/users/${post.user.username}`}
                className="flex items-center gap-1 font-medium hover:underline"
              >
                {post.user.displayName}
                {post.user.isVerified && <VerifiedBadge size="sm" />}
              </Link>
            </UserTooltip>
            <Link
              href={`/posts/${post.id}`}
              className="block text-sm text-muted-foreground hover:underline"
              suppressHydrationWarning
            >
              {formatRelativeDate(post.createdAt)}
            </Link>
          </div>
        </div>
        {post.user.id === user.id && (
          <PostMoreButton
            post={post}
            className="opacity-0 transition-opacity group-hover/post:opacity-100"
          />
        )}
      </div>
      <Linkify>
        <div className="whitespace-pre-line break-words">{post.content}</div>
      </Linkify>
      {!!post.attachments.length && (
        <MediaCarousel attachments={post.attachments} />
      )}
      {post.poll && (
        <PollDisplay poll={post.poll as any} postId={post.id} />
      )}
      {post.quotedPost && (
        <QuotePostDisplay post={post.quotedPost as any} />
      )}
      {!!post.comments?.length && (
        <LatestCommentPreview 
          comment={post.comments[0]} 
          postId={post.id}
          onClick={() => handleCommentPreviewClick(post.comments[0].id)}
        />
      )}
      <hr className="text-muted-foreground" />
      <div className="flex justify-between gap-5">
        <div className="flex items-center gap-5">
          <LikeButton
            postId={post.id}
            initialState={{
              likes: post._count.likes,
              isLikedByUser: post.likes.some((like) => like.userId === user.id),
            }}
          />
          <CommentButton
            post={post}
            onClick={() => setShowComments(!showComments)}
          />
          <RepostButton post={post} />
          <ShareButton postId={post.id} />
        </div>
        <BookmarkButton
          postId={post.id}
          initialState={{
            isBookmarkedByUser: post.bookmarks.some(
              (bookmark) => bookmark.userId === user.id,
            ),
          }}
        />
      </div>
      {/* Desktop: inline thread under the post. */}
      {showComments && (
        <div className="hidden lg:block">
          <Comments
            post={post}
            initialExpandedCommentId={expandedCommentId}
          />
        </div>
      )}
      {/* Mobile/tablet: bottom-sheet so long threads don't bury the next post. */}
      <div className="lg:hidden">
        <CommentsSheet
          post={post}
          open={showComments}
          onOpenChange={setShowComments}
          initialExpandedCommentId={expandedCommentId}
        />
      </div>
    </article>
  );
}

// Module-scoped per page-view dedupe. Reset on a hard nav; same-tab SPA
// nav keeps it warm so we don't double-count a post the user just saw.
const firedImpressions = new Set<string>();

function useImpressionBeacon(
  ref: React.RefObject<HTMLElement>,
  postId: string,
  isOwn: boolean,
) {
  useEffect(() => {
    if (isOwn) return;
    if (firedImpressions.has(postId)) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          // Only count when the post lingers ≥ 700ms — scroll-past doesn't.
          if (!timer) {
            timer = setTimeout(() => {
              if (firedImpressions.has(postId)) return;
              firedImpressions.add(postId);
              fetch(`/api/posts/${postId}/impression`, {
                method: "POST",
                keepalive: true,
              }).catch(() => {
                // Allow a retry on the next mount if the call failed.
                firedImpressions.delete(postId);
              });
              io.disconnect();
            }, 700);
          }
        } else if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      },
      { threshold: [0, 0.5, 1] },
    );
    io.observe(el);
    return () => {
      if (timer) clearTimeout(timer);
      io.disconnect();
    };
  }, [ref, postId, isOwn]);
}

interface LatestCommentPreviewProps {
  comment: CommentData;
  postId: string;
  onClick: () => void;
}

function LatestCommentPreview({ comment, postId, onClick }: LatestCommentPreviewProps) {
  const replyCount = (comment as any)._count?.replies || 0;
  const likesCount = (comment as any)._count?.likes || 0;
  
  return (
    <div 
      className="rounded-xl bg-muted/40 p-3 cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={onClick}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Latest comment</span>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {likesCount > 0 && (
            <span className="flex items-center gap-1">
              ❤️ {likesCount}
            </span>
          )}
          {replyCount > 0 && (
            <span>
              {replyCount} {replyCount === 1 ? "reply" : "replies"}
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-3">
        <UserTooltip user={comment.user}>
          <Link href={`/users/${comment.user.username}`} onClick={(e) => e.stopPropagation()}>
            <UserAvatar avatarUrl={comment.user.avatarUrl} size={32} />
          </Link>
        </UserTooltip>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm">
            <UserTooltip user={comment.user}>
              <Link 
                href={`/users/${comment.user.username}`} 
                className="font-medium hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {comment.user.displayName}
              </Link>
            </UserTooltip>
            <span className="text-muted-foreground">{formatRelativeDate(comment.createdAt)}</span>
          </div>
          <div className="line-clamp-2 break-words text-sm">{comment.content}</div>
          <button className="mt-1 text-xs font-medium text-primary hover:underline">
            View all comments and replies
          </button>
        </div>
      </div>
    </div>
  );
}

type RepostButtonProps = { post: PostData };

function RepostButton({ post }: RepostButtonProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => repostPost(post.id),
    onSuccess: async (newPost) => {
      const queryFilter: QueryFilters = {
        queryKey: ["post-feed"],
        predicate(query) {
          return (
            query.queryKey.includes("for-you") ||
            (query.queryKey.includes("user-posts") &&
              query.queryKey.some((k) => typeof k === "string" && k.includes(newPost.user.id)))
          );
        },
      };
      await queryClient.cancelQueries(queryFilter);
      queryClient.setQueriesData<InfiniteData<PostsPage, string | null>>(
        queryFilter,
        (oldData) => {
          const firstPage = oldData?.pages[0];
          if (firstPage) {
            return {
              pageParams: oldData.pageParams,
              pages: [
                { posts: [newPost, ...firstPage.posts], nextCursor: firstPage.nextCursor },
                ...oldData.pages.slice(1),
              ],
            };
          }
          return oldData;
        }
      );
      toast({ description: "Reposted" });
    },
    onError(error) {
      console.error(error);
      toast({ variant: "destructive", description: "Failed to repost. Please try again." });
    },
  });
  return (
    <button onClick={() => mutation.mutate()} className="flex items-center gap-2">
      <Repeat className="size-5" />
      <span className="text-sm font-medium hidden sm:inline">Repost</span>
    </button>
  );
}

function ShareButton({ postId }: { postId: string }) {
  const { toast } = useToast();
  async function onShare() {
    try {
      const url = `${window.location.origin}/posts/${postId}`;
      if (navigator.share) {
        await navigator.share({ title: "Buzzhub post", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast({ description: "Link copied to clipboard" });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", description: "Unable to share right now." });
    }
  }
  return (
    <button onClick={onShare} className="flex items-center gap-2">
      <Share2 className="size-5" />
      <span className="text-sm font-medium hidden sm:inline">Share</span>
    </button>
  );
}

interface CommentButtonProps {
  post: PostData;
  onClick: () => void;
}

function CommentButton({ post, onClick }: CommentButtonProps) {
  return (
    <button onClick={onClick} className="flex items-center gap-2">
      <MessageSquare className="size-5" />
      <span className="text-sm font-medium tabular-nums">
        {post._count.comments}{" "}
        <span className="hidden sm:inline">comments</span>
      </span>
    </button>
  );
}