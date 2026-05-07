"use client";

import FollowButton from "./FollowButton";
import UserTooltip from "./UserTooltip";
import PostUserAvatar from "./PostUserAvatar";
import VerifiedBadge from "./VerifiedBadge";
import { UserData } from "@/lib/types";
import Link from "next/link";

interface WhoToFollowItemProps {
  user: UserData;
  currentUserId: string;
}

export function WhoToFollowItem({ user, currentUserId }: WhoToFollowItemProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <UserTooltip user={user}>
        <div className="flex min-w-0 items-center gap-2.5">
          <PostUserAvatar
            userId={user.id}
            username={user.username}
            avatarUrl={user.avatarUrl}
            className="flex-shrink-0"
          />
          <Link href={`/users/${user.username}`} className="min-w-0">
            <p className="flex items-center gap-1 truncate text-sm font-semibold leading-tight hover:underline">
              <span className="truncate">{user.displayName}</span>
              {user.isVerified && <VerifiedBadge size="sm" />}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              @{user.username}
            </p>
          </Link>
        </div>
      </UserTooltip>
      <FollowButton
        userId={user.id}
        initialState={{
          followers: user._count.followers,
          isFollowedByUser: user.followers.some(
            ({ followerId }) => followerId === currentUserId,
          ),
        }}
      />
    </div>
  );
}
