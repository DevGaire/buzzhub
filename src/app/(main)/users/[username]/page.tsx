import { validateRequest } from "@/auth";
import FollowButton from "@/components/FollowButton";
import FollowerCount from "@/components/FollowerCount";
import Linkify from "@/components/Linkify";
import TrendsSidebar from "@/components/TrendsSidebar";
import UserAvatar from "@/components/UserAvatar";
import prisma from "@/lib/prisma";
import { FollowerInfo, getUserDataSelect, UserData } from "@/lib/types";
import { formatNumber } from "@/lib/utils";
import { formatDate } from "date-fns";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import EditProfileButton from "./EditProfileButton";
import UserPosts from "./UserPosts";
import { CalendarDays } from "lucide-react";

interface PageProps {
  params: { username: string };
}

const getUser = cache(async (username: string, loggedInUserId: string) => {
  const user = await prisma.user.findFirst({
    where: {
      username: {
        equals: username,
        mode: "insensitive",
      },
    },
    select: getUserDataSelect(loggedInUserId),
  });

  if (!user) notFound();

  return user;
});

export async function generateMetadata({
  params: { username },
}: PageProps): Promise<Metadata> {
  const { user: loggedInUser } = await validateRequest();

  if (!loggedInUser) return {};

  const user = await getUser(username, loggedInUser.id);

  return {
    title: `${user.displayName} (@${user.username})`,
  };
}

export default async function Page({ params: { username } }: PageProps) {
  const { user: loggedInUser } = await validateRequest();

  if (!loggedInUser) {
    return (
      <p className="text-destructive">
        You&apos;re not authorized to view this page.
      </p>
    );
  }

  const user = await getUser(username, loggedInUser.id);

  return (
    <main className="mx-auto flex w-full max-w-screen-xl min-w-0 gap-3 px-2 sm:gap-5 sm:px-4">
      <div className="w-full min-w-0 space-y-5">
        <UserProfile user={user} loggedInUserId={loggedInUser.id} />
        <div className="rounded-2xl bg-card p-5 shadow-sm">
          <h2 className="text-center text-2xl font-bold">
            {user.displayName}&apos;s posts
          </h2>
        </div>
        <UserPosts userId={user.id} />
      </div>
      <TrendsSidebar />
    </main>
  );
}

interface UserProfileProps {
  user: UserData;
  loggedInUserId: string;
}

async function UserProfile({ user, loggedInUserId }: UserProfileProps) {
  const followerInfo: FollowerInfo = {
    followers: user._count.followers,
    isFollowedByUser: user.followers.some(
      ({ followerId }) => followerId === loggedInUserId,
    ),
  };

  return (
    <div className="overflow-hidden rounded-2xl bg-card shadow-sm">
      <div className="h-24 w-full bg-gradient-to-r from-primary/10 via-transparent to-secondary/10" />
      <div className="-mt-12 flex flex-col gap-4 p-5 sm:flex-row sm:items-end">
        <UserAvatar
          avatarUrl={user.avatarUrl}
          size={128}
          className="rounded-full ring-2 ring-primary/30 ring-offset-2 ring-offset-background shadow-md"
        />
        <div className="flex w-full flex-col sm:flex-1">
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-2xl font-extrabold leading-tight">{user.displayName}</h1>
              <div className="text-muted-foreground">@{user.username}</div>
            </div>
            <div className="ms-auto">
              {user.id === loggedInUserId ? (
                <EditProfileButton user={user} />
              ) : (
                <FollowButton userId={user.id} initialState={followerInfo} />
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
    </div>
  );
}