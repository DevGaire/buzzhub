"use client";

import UserAvatar from "@/components/UserAvatar";
import VerifiedBadge from "@/components/VerifiedBadge";
import { formatRelativeDate } from "@/lib/utils";
import { Media } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";

interface QuotePostUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isVerified: boolean;
}

interface QuotePostData {
  id: string;
  content: string;
  createdAt: Date;
  user: QuotePostUser;
  attachments: Media[];
}

export default function QuotePostDisplay({ post }: { post: QuotePostData }) {
  return (
    <Link href={`/posts/${post.id}`}>
      <div className="mt-3 rounded-xl border bg-muted/30 p-3 hover:bg-muted/50 transition-colors cursor-pointer space-y-2">
        <div className="flex items-center gap-2">
          <UserAvatar avatarUrl={post.user.avatarUrl} size={20} />
          <span className="text-sm font-semibold hover:underline">{post.user.displayName}</span>
          {post.user.isVerified && <VerifiedBadge size="sm" />}
          <span className="text-xs text-muted-foreground">@{post.user.username}</span>
          <span className="ml-auto text-xs text-muted-foreground">
            {formatRelativeDate(post.createdAt)}
          </span>
        </div>
        <p className="line-clamp-3 text-sm whitespace-pre-line break-words">{post.content}</p>
        {post.attachments.length > 0 && post.attachments[0].type === "IMAGE" && (
          <div className="relative h-32 w-full overflow-hidden rounded-lg">
            <Image
              src={post.attachments[0].url}
              alt="Quoted post media"
              fill
              className="object-cover"
            />
            {post.attachments.length > 1 && (
              <div className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white">
                +{post.attachments.length - 1} more
              </div>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
