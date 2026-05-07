import { validateRequest } from "@/auth";
import FollowButton from "@/components/FollowButton";
import FollowerCount from "@/components/FollowerCount";
import Linkify from "@/components/Linkify";
import UserAvatar from "@/components/UserAvatar";
import VerifiedBadge from "@/components/VerifiedBadge";
import prisma from "@/lib/prisma";
import { FollowerInfo, getUserDataSelect, UserData, getPostDataInclude } from "@/lib/types";
import { formatNumber } from "@/lib/utils";
import { formatDate } from "date-fns";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import EditProfileButton from "./EditProfileButton";
import UserPosts from "./UserPosts";
import { CalendarDays, Pin } from "lucide-react";
import ProfileStoryAvatar from "./ProfileStoryAvatar";
import BlockButton from "./BlockButton";
import VerifyToggleButton from "./VerifyToggleButton";
import Post from "@/components/posts/Post";
import Image from "next/image";

interface PageProps {
  params: { username: string };
}

const getUser = cache(async (username: string, loggedInUserId: string) => {
  const user = await prisma.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
    select: getUserDataSelect(loggedInUserId),
  });

  if (!user) {
    if (username.toLowerCase() === "admin") {
      return prisma.user.findUnique({
        where: { id: loggedInUserId },
        select: getUserDataSelect(loggedInUserId),
      });
    }
    notFound();
  }

  return user;
});

export async function generateMetadata({ params: { username } }: PageProps): Promise<Metadata> {
  const { user: loggedInUser } = await validateRequest();
  if (!loggedInUser) return {};
  const user = await getUser(username, loggedInUser.id);
  return { title: `${user?.displayName} (@${user?.username})` };
}

export default async function Page({ params: { username } }: PageProps) {
  const { user: loggedInUser } = await validateRequest();
  if (!loggedInUser) {
    return <p className="text-destructive">You&apos;re not authorized to view this page.</p>;
  }

  const user = await getUser(username, loggedInUser.id);
  if (!user) notFound();

  // Fetch pinned post if exists
  const pinnedPost = user.pinnedPostId
    ? await prisma.post.findUnique({
        where: { id: user.pinnedPostId },
        include: getPostDataInclude(loggedInUser.id),
      })
    : null;

  return (
    <div className="space-y-4">
      <UserProfile
        user={user}
        loggedInUserId={loggedInUser.id}
        loggedInUserIsAdmin={loggedInUser.isAdmin}
        pinnedPost={pinnedPost}
      />
      <div className="rounded-2xl bg-card p-5 shadow-sm">
        <h2 className="text-center text-2xl font-bold">{user.displayName}&apos;s posts</h2>
      </div>
      <UserPosts userId={user.id} />
    </div>
  );
}

interface UserProfileProps {
  user: UserData;
  loggedInUserId: string;
  loggedInUserIsAdmin: boolean;
  pinnedPost: any | null;
}

async function UserProfile({
  user,
  loggedInUserId,
  loggedInUserIsAdmin,
  pinnedPost,
}: UserProfileProps) {
  const followerInfo: FollowerInfo = {
    followers: user._count.followers,
    isFollowedByUser: user.followers.some(({ followerId }) => followerId === loggedInUserId),
  };

  const isOwnProfile = user.id === loggedInUserId;

  return (
    <div className="overflow-hidden rounded-2xl bg-card shadow-sm">
      {/* Cover photo */}
      <div className="relative h-36 w-full sm:h-48">
        {user.coverUrl ? (
          <Image src={user.coverUrl} alt="Cover" fill className="object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-r from-primary/20 via-primary/10 to-secondary/20" />
        )}
      </div>

      <div className="-mt-14 flex flex-col gap-4 p-5 sm:flex-row sm:items-end">
        <ProfileStoryAvatar
          userId={user.id}
          username={user.username}
          avatarUrl={user.avatarUrl}
          size={112}
        />
        <div className="flex w-full flex-col sm:flex-1">
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-2xl font-extrabold leading-tight">{user.displayName}</h1>
                {user.isVerified && <VerifiedBadge size="lg" />}
              </div>
              <div className="text-muted-foreground">@{user.username}</div>
            </div>
            <div className="ms-auto flex items-center gap-2">
              {isOwnProfile ? (
                <EditProfileButton user={user} />
              ) : (
                <>
                  {loggedInUserIsAdmin && (
                    <VerifyToggleButton
                      userId={user.id}
                      isVerified={user.isVerified}
                    />
                  )}
                  <BlockButton userId={user.id} />
                  <FollowButton userId={user.id} initialState={followerInfo} />
                </>
              )}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
            <span className="flex items-center gap-1">
              <span className="text-muted-foreground">Posts</span>
              <span className="font-semibold">{formatNumber(user._count.posts)}</span>
            </span>
            <FollowerCount userId={user.id} initialState={followerInfo} />
            <span className="flex items-center gap-2 text-muted-foreground">
              <CalendarDays className="size-4" />
              <span>Joined {formatDate(user.createdAt, "MMM d, yyyy")}</span>
            </span>
          </div>
        </div>
      </div>

      {user.bio && (
        <>
          <hr className="border-border/60" />
          <div className="p-5">
            <Linkify>
              <div className="overflow-hidden whitespace-pre-line break-words">{user.bio}</div>
            </Linkify>
          </div>
        </>
      )}

      {pinnedPost && (
        <>
          <hr className="border-border/60" />
          <div className="p-5">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Pin className="size-3.5" />
              Pinned post
            </div>
            <Post post={pinnedPost} />
          </div>
        </>
      )}
    </div>
  );
}
