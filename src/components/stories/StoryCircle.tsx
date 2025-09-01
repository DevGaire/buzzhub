"use client";

import { useSession } from "@/app/(main)/SessionProvider";
import UserAvatar from "@/components/UserAvatar";
import UserAvatarWithStory from "@/components/UserAvatarWithStory";
import { Button } from "@/components/ui/button";
import { StoryData } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

interface StoryCircleProps {
    story?: StoryData;
    isAddStory?: boolean;
    onClick: () => void;
    className?: string;
}

/**
 * Unique story tile (not Instagram-like):
 * - Tall rounded card (aspect ~ 9/14) with subtle gradient border when unviewed
 * - Bottom overlay caption
 * - Add-story tile uses dashed outline and subtle glow
 */
export default function StoryCircle({
    story,
    isAddStory = false,
    onClick,
    className,
}: StoryCircleProps) {
    const { user } = useSession();
    const [imageError, setImageError] = useState(false);

    if (isAddStory) {
        return (
            <div className={cn("flex w-20 sm:w-24 flex-col items-center gap-2", className)}>
                <button
                    onClick={onClick}
                    className={cn(
                        "group relative block w-full overflow-hidden rounded-xl p-[2px]",
                        "bg-gradient-to-br from-white/10 via-white/5 to-transparent",
                        "hover:shadow-md transition-shadow"
                    )}
                    title="Create story"
                >
                    <div
                        className={cn(
                            "relative aspect-[9/14] w-full rounded-[0.70rem]",
                            "border border-dashed border-muted/60 bg-muted/10",
                            "grid place-items-center"
                        )}
                    >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                            <Plus className="h-5 w-5" />
                        </div>
                        <div className="pointer-events-none absolute inset-0 rounded-[0.70rem] ring-1 ring-inset ring-white/5" />
                    </div>
                </button>
                <span className="max-w-[86px] truncate text-center text-[11px] font-medium opacity-80">
                    Create Story
                </span>
            </div>
        );
    }

    if (!story) return null;

    const isViewed = (story as any).views && (story as any).views.some((view: any) => view.userId === user.id);
    const firstMedia = story.items[0]?.media;
    const isOwnStory = story.user.id === user.id;

    return (
        <div className={cn("flex w-20 sm:w-24 flex-col items-center gap-2", className)}>
            <button
                onClick={onClick}
                className={cn(
                    "group relative block w-full overflow-hidden rounded-xl p-[2px] transition-shadow hover:shadow-md",
                    isViewed || isOwnStory
                        ? "bg-muted/40"
                        : "bg-gradient-to-br from-primary/70 via-primary/25 to-transparent"
                )}
                title={`${isOwnStory ? "Your" : story.user.displayName + "'s"} story`}
            >
                <div className="relative aspect-[9/14] w-full overflow-hidden rounded-[0.70rem]">
                    {/* Media or fallback */}
                    {firstMedia && !imageError ? (
                        firstMedia.type === "IMAGE" ? (
                            <Image
                                src={firstMedia.url}
                                alt={`${story.user.displayName}'s story`}
                                fill
                                className="object-cover"
                                sizes="96px"
                                priority={false}
                                onError={() => setImageError(true)}
                            />
                        ) : (
                            <video
                                src={firstMedia.url}
                                className="h-full w-full object-cover"
                                muted
                                onError={() => setImageError(true)}
                            />
                        )
                    ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted/40 to-muted/20">
                            <UserAvatar avatarUrl={story.user.avatarUrl} />
                        </div>
                    )}

                    {/* Bottom gradient overlay + caption */}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/65 to-transparent" />
                    <div className="absolute inset-x-1 bottom-1 truncate rounded px-1 text-left text-[11px] font-medium text-white/95 drop-shadow">
                        {isOwnStory ? "Your Story" : story.user.displayName}
                    </div>

                    {/* View count for own story */}
                    {isOwnStory && (story as any)._count?.views > 0 && (
                        <div className="absolute left-1 top-1 rounded-md bg-blue-500/90 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow">
                            {(story as any)._count.views > 99 ? "99+" : (story as any)._count.views}
                        </div>
                    )}

                    {/* Subtle ring on hover */}
                    <div className="pointer-events-none absolute inset-0 rounded-[0.70rem] ring-1 ring-inset ring-white/10 group-hover:ring-white/20" />
                </div>
            </button>
            <span className="max-w-[86px] truncate text-center text-[11px] opacity-80">
                {isOwnStory ? "Your Story" : story.user.displayName}
            </span>
        </div>
    );
}
