"use client";

import { useSession } from "@/app/(main)/SessionProvider";
import { PostData, CommentData, PostsPage } from "@/lib/types";
import { cn, formatRelativeDate } from "@/lib/utils";
import { Media } from "@prisma/client";
import { MessageSquare, Repeat, Share2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import Comments from "../comments/Comments";
import Linkify from "../Linkify";
import UserAvatar from "../UserAvatar";
import UserTooltip from "../UserTooltip";
import BookmarkButton from "./BookmarkButton";
import LikeButton from "./LikeButton";
import PostMoreButton from "./PostMoreButton";
import { useMutation, useQueryClient, QueryFilters, InfiniteData } from "@tanstack/react-query";
import { useToast } from "../ui/use-toast";
import { repostPost } from "./actions";

interface PostProps {
  post: PostData;
}

export default function Post({ post }: PostProps) {
  const { user } = useSession();

  const [showComments, setShowComments] = useState(false);
  const [expandedCommentId, setExpandedCommentId] = useState<string | null>(null);

  const handleCommentPreviewClick = (commentId: string) => {
    setShowComments(true);
    setExpandedCommentId(commentId);
  };

  return (
    <article className="group/post space-y-3 rounded-2xl bg-card p-5 shadow-sm">
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
                className="block font-medium hover:underline"
              >
                {post.user.displayName}
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
        <MediaPreviews attachments={post.attachments} />
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
      {showComments && (
        <Comments 
          post={post} 
          initialExpandedCommentId={expandedCommentId}
        />
      )}
    </article>
  );
}

interface MediaPreviewsProps {
  attachments: Media[];
}

function MediaPreviews({ attachments }: MediaPreviewsProps) {
  console.log("🖼️ MediaPreviews: Rendering", attachments.length, "attachments");
  
  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        attachments.length > 1 && "sm:grid sm:grid-cols-2",
      )}
    >
      {attachments.map((m) => (
        <MediaPreview key={m.id} media={m} />
      ))}
    </div>
  );
}

interface MediaPreviewProps {
  media: Media;
}

function MediaPreview({ media }: MediaPreviewProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  console.log("🖼️ MediaPreview: Rendering media", {
    id: media.id,
    type: media.type,
    url: media.url,
    urlValid: media.url.startsWith('http')
  });

  if (media.type === "IMAGE") {
    if (imageError) {
      return (
        <div className="mx-auto size-fit max-h-[30rem] rounded-2xl bg-muted flex items-center justify-center p-8">
          <div className="text-center">
            <p className="text-destructive font-medium">❌ Image failed to load</p>
            <p className="text-sm text-muted-foreground mt-2 break-all">URL: {media.url}</p>
            <button 
              onClick={() => {
                setImageError(false);
                setImageLoading(true);
              }}
              className="mt-2 text-xs text-primary hover:underline"
            >
              🔄 Retry
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="relative mx-auto size-fit max-h-[30rem] rounded-2xl overflow-hidden">
        {imageLoading && (
          <div className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Loading image...</p>
          </div>
        )}
        <Image
          src={media.url}
          alt="Attachment"
          width={500}
          height={500}
          className="mx-auto size-fit max-h-[30rem] rounded-2xl"
          onError={(e) => {
            console.error("❌ Image failed to load:", media.url, e);
            setImageError(true);
            setImageLoading(false);
          }}
          onLoad={() => {
            console.log("✅ Image loaded successfully:", media.url);
            setImageLoading(false);
          }}
          onLoadStart={() => {
            console.log("🔄 Image loading started:", media.url);
            setImageLoading(true);
          }}
        />
      </div>
    );
  }

  if (media.type === "VIDEO") {
    return (
      <div className="mx-auto size-fit max-h-[30rem] rounded-2xl overflow-hidden">
        <video
          src={media.url}
          controls
          className="mx-auto size-fit max-h-[30rem] rounded-2xl"
          onError={(e) => {
            console.error("❌ Video failed to load:", media.url, e);
          }}
          onLoadStart={() => {
            console.log("🔄 Video loading started:", media.url);
          }}
          onCanPlay={() => {
            console.log("✅ Video can play:", media.url);
          }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto size-fit max-h-[30rem] rounded-2xl bg-muted flex items-center justify-center p-8">
      <p className="text-destructive">❌ Unsupported media type: {media.type}</p>
    </div>
  );
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