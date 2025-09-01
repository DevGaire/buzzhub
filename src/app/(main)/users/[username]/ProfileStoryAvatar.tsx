"use client";

import UserAvatarWithStory from "@/components/UserAvatarWithStory";
import StoryViewer from "@/components/stories/StoryViewer";
import { useQuery } from "@tanstack/react-query";
import kyInstance from "@/lib/ky";
import { StoryData } from "@/lib/types";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ProfileStoryAvatarProps {
  userId: string;
  username: string;
  avatarUrl: string | null;
  size?: number;
  className?: string;
}

export default function ProfileStoryAvatar({
  userId,
  username,
  avatarUrl,
  size = 128,
  className,
}: ProfileStoryAvatarProps) {
  const [showStoryViewer, setShowStoryViewer] = useState(false);

  // Fetch stories to check if user has active story
  const { data: storiesData } = useQuery<{ stories: StoryData[] }>({
    queryKey: ["stories"],
    queryFn: () => kyInstance.get("/api/stories").json(),
    refetchInterval: 60_000,
  });

  const stories = storiesData?.stories || [];
  const userStoryIndex = stories.findIndex(s => s.user.id === userId);
  const hasStory = userStoryIndex >= 0;

  const handleClick = () => {
    if (hasStory) {
      setShowStoryViewer(true);
    }
  };

  return (
    <>
      <UserAvatarWithStory
        userId={userId}
        username={username}
        avatarUrl={avatarUrl}
        size={size}
        className={cn(
          "rounded-full ring-2 ring-primary/30 ring-offset-2 ring-offset-background shadow-md",
          className
        )}
        showStoryRing={true}
        onClick={handleClick}
      />

      {/* Story Viewer Modal */}
      {showStoryViewer && userStoryIndex >= 0 && (
        <StoryViewer
          stories={stories}
          initialStoryIndex={userStoryIndex}
          isOpen={showStoryViewer}
          onClose={() => setShowStoryViewer(false)}
        />
      )}
    </>
  );
}