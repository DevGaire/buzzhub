"use client";

import Link from "next/link";
import FollowButton from "./FollowButton";
import UserTooltip from "./UserTooltip";
import PostUserAvatar from "./PostUserAvatar";
import { UserData } from "@/lib/types";

interface WhoToFollowItemProps {
  user: UserData;
  currentUserId: string;
}

export function WhoToFollowItem({ user, currentUserId }: WhoToFollowItemProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <UserTooltip user={user}>
        <div className="flex items-center gap-3">
          <PostUserAvatar
            userId={user.id}
            username={user.username}
            avatarUrl={user.avatarUrl}
            className="flex-none"
          />
          <Link
            href={`/users/${user.username}`}
            className="min-w-0"
          >
            <p className="line-clamp-1 break-all font-semibold hover:underline">
              {user.displayName}
            </p>
            <p className="line-clamp-1 break-all text-muted-foreground">
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