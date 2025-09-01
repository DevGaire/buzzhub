"use client";

import UserAvatarWithStory from "@/components/UserAvatarWithStory";
import StoryViewer from "@/components/stories/StoryViewer";
import { useQuery } from "@tanstack/react-query";
import kyInstance from "@/lib/ky";
import { StoryData } from "@/lib/types";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface PostUserAvatarProps {
  userId: string;
  username: string;
  avatarUrl: string | null;
  size?: number;
  className?: string;
}

export default function PostUserAvatar({
  userId,
  username,
  avatarUrl,
  size = 48,
  className,
}: PostUserAvatarProps) {
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const router = useRouter();

  // Fetch stories to check if user has active story
  const { data: storiesData } = useQuery<{ stories: StoryData[] }>({
    queryKey: ["stories"],
    queryFn: () => kyInstance.get("/api/stories").json(),
    refetchInterval: 60_000,
    retry: false,
  });

  const stories = storiesData?.stories || [];
  const userStoryIndex = stories.findIndex(s => s.user.id === userId);
  const hasStory = userStoryIndex >= 0;

  const handleClick = (e: React.MouseEvent) => {
    if (hasStory) {
      e.preventDefault();
      e.stopPropagation();
      setShowStoryViewer(true);
    } else {
      // If no story, navigate to profile
      e.preventDefault();
      e.stopPropagation();
      router.push(`/users/${username}`);
    }
  };

  return (
    <>
      <div onClick={handleClick} className="cursor-pointer">
        <UserAvatarWithStory
          userId={userId}
          username={username}
          avatarUrl={avatarUrl}
          size={size}
          className={className}
          showStoryRing={true}
        />
      </div>

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