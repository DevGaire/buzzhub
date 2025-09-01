"use client";

import { useQuery } from "@tanstack/react-query";
import kyInstance from "@/lib/ky";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import UserAvatar from "@/components/UserAvatar";
import Link from "next/link";
import { formatRelativeDate } from "@/lib/utils";
import { Loader2, Eye, Users } from "lucide-react";
import FollowButton from "@/components/FollowButton";
import { useSession } from "@/app/(main)/SessionProvider";

interface StoryViewersListProps {
  storyId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface StoryViewer {
  id: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    followers: { followerId: string }[];
    _count: { followers: number };
  };
  viewedAt: string;
}

export default function StoryViewersList({
  storyId,
  isOpen,
  onClose,
}: StoryViewersListProps) {
  const { user: currentUser } = useSession();

  const { data, isLoading } = useQuery({
    queryKey: ["story-viewers", storyId],
    queryFn: () =>
      kyInstance.get(`/api/stories/${storyId}/viewers`).json<{
        viewers: StoryViewer[];
        totalCount: number;
      }>(),
    enabled: isOpen && !!storyId,
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Story Views
            {data && (
              <span className="text-sm font-normal text-muted-foreground">
                ({data.totalCount} {data.totalCount === 1 ? "view" : "views"})
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : data?.viewers.length === 0 ? (
            <div className="py-8 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                No views yet
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {data?.viewers.map((viewer) => (
                <div
                  key={viewer.id}
                  className="flex items-center justify-between gap-3 rounded-lg p-2 hover:bg-muted/50"
                >
                  <Link
                    href={`/users/${viewer.user.username}`}
                    className="flex items-center gap-3 flex-1 min-w-0"
                    onClick={onClose}
                  >
                    <UserAvatar
                      avatarUrl={viewer.user.avatarUrl}
                      size={40}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {viewer.user.displayName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        @{viewer.user.username} • {formatRelativeDate(new Date(viewer.viewedAt))}
                      </p>
                    </div>
                  </Link>
                  {viewer.user.id !== currentUser.id && (
                    <FollowButton
                      userId={viewer.user.id}
                      initialState={{
                        followers: viewer.user._count.followers,
                        isFollowedByUser: viewer.user.followers.some(
                          (f) => f.followerId === currentUser.id
                        ),
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}