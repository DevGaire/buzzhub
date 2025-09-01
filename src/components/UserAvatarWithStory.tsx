import avatarPlaceholder from "@/assets/avatar-placeholder.png";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import kyInstance from "@/lib/ky";
import { StoryData } from "@/lib/types";
import { useSession } from "@/app/(main)/SessionProvider";

interface UserAvatarWithStoryProps {
  userId?: string;
  username?: string;
  avatarUrl: string | null | undefined;
  size?: number;
  className?: string;
  showStoryRing?: boolean;
  onClick?: () => void;
}

export default function UserAvatarWithStory({
  userId,
  username,
  avatarUrl,
  size = 48,
  className,
  showStoryRing = true,
  onClick,
}: UserAvatarWithStoryProps) {
  const { user: currentUser } = useSession();

  // Fetch stories to check if this user has an active story
  const { data: storiesData } = useQuery<{ stories: StoryData[] }>({
    queryKey: ["stories"],
    queryFn: () => kyInstance.get("/api/stories").json(),
    enabled: showStoryRing && !!userId,
    refetchInterval: 60_000,
    retry: false,
    staleTime: 30_000,
  });

  const stories = storiesData?.stories || [];
  const userHasStory = stories.some(story => story.user.id === userId);
  
  // Check if current user has viewed this user's story
  const userStory = stories.find(story => story.user.id === userId);
  const hasViewed = userStory && (userStory as any).views?.some((view: any) => view.userId === currentUser.id);
  const isOwnStory = userId === currentUser.id;

  const showRing = showStoryRing && userHasStory;

  return (
    <div
      className={cn(
        "relative inline-block",
        showRing && "cursor-pointer",
        className
      )}
      onClick={showRing ? onClick : undefined}
    >
      {/* Story ring indicator */}
      {showRing && (
        <div
          className={cn(
            "absolute inset-0 rounded-full p-[2px]",
            hasViewed || isOwnStory
              ? "bg-gradient-to-tr from-gray-400 to-gray-600" // Viewed story - gray ring
              : "bg-gradient-to-tr from-green-400 to-green-600 animate-pulse" // Unviewed story - green ring with pulse
          )}
          style={{
            width: size + 8,
            height: size + 8,
            transform: "translate(-4px, -4px)",
          }}
        >
          <div className="h-full w-full rounded-full bg-background" />
        </div>
      )}

      {/* Avatar */}
      <Image
        src={avatarUrl || avatarPlaceholder}
        alt="User avatar"
        width={size}
        height={size}
        className={cn(
          "relative rounded-full bg-card object-cover",
          showRing && "ring-2 ring-background"
        )}
      />

      {/* Story indicator dot */}
      {showRing && !hasViewed && !isOwnStory && (
        <div className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-background">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
        </div>
      )}
    </div>
  );
}