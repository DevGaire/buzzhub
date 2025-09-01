"use client";

import { useSession } from "@/app/(main)/SessionProvider";
import UserAvatar from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { StoryData } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import Image from "next/image";

interface StoryCircleProps {
    story?: StoryData;
    isAddStory?: boolean;
    onClick: () => void;
    className?: string;
}

export default function StoryCircle({
    story,
    isAddStory = false,
    onClick,
    className,
}: StoryCircleProps) {
    const { user } = useSession();

    if (isAddStory) {
        return (
            <div className={cn("flex flex-col items-center gap-2", className)}>
                <Button
                    onClick={onClick}
                    className="relative size-16 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 p-0.5 hover:from-yellow-500 hover:via-red-600 hover:to-purple-700 transition-all hover:scale-105"
                >
                    <div className="flex size-full items-center justify-center rounded-full bg-background">
                        <Plus className="size-6 text-muted-foreground" />
                    </div>
                </Button>
                <span className="text-xs font-medium text-center max-w-[64px] truncate">
                    Your Story
                </span>
            </div>
        );
    }

    if (!story) return null;

    const isViewed = (story as any).views && (story as any).views.some((view: any) => view.userId === user.id);
    const firstMedia = story.items[0]?.media;
    const isOwnStory = story.user.id === user.id;

    return (
        <div className={cn("flex flex-col items-center gap-2", className)}>
            <button
                onClick={onClick}
                className={cn(
                    "relative size-16 rounded-full p-0.5 transition-all hover:scale-105",
                    isViewed || isOwnStory
                        ? "bg-gray-300 dark:bg-gray-600"
                        : "bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600"
                )}
            >
                {/* Story preview image */}
                <div className="relative size-full overflow-hidden rounded-full bg-background p-0.5">
                    {firstMedia ? (
                        firstMedia.type === "IMAGE" ? (
                            <Image
                                src={firstMedia.url}
                                alt={`${story.user.displayName}'s story`}
                                fill
                                className="rounded-full object-cover"
                                style={{ objectPosition: 'center' }}
                            />
                        ) : (
                            <video
                                src={firstMedia.url}
                                className="h-full w-full rounded-full object-cover"
                                muted
                                style={{ objectPosition: 'center' }}
                            />
                        )
                    ) : (
                        <UserAvatar
                            avatarUrl={story.user.avatarUrl}
                            size={60}
                            className="border-2 border-background"
                        />
                    )}
                </div>

                {/* View count indicator for own stories */}
                {isOwnStory && (story as any)._count?.views > 0 && (
                    <div className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white border border-background">
                        {(story as any)._count.views > 99 ? "99+" : (story as any)._count.views}
                    </div>
                )}
            </button>

            <span className="text-xs font-medium text-center max-w-[64px] truncate">
                {isOwnStory ? "Your Story" : story.user.displayName}
            </span>
        </div>
    );
}