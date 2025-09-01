"use client";

import { useSession } from "@/app/(main)/SessionProvider";
import kyInstance from "@/lib/ky";
import { StoryData } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import { QueryWrapper } from "@/components/ui/query-states";
import { LoadingSpinner, EmptyState } from "@/components/ui/loading-states";
import { ComponentErrorBoundary } from "@/components/ErrorBoundary";
import { Users, Plus } from "lucide-react";
import { useState } from "react";
import StoryCircle from "./StoryCircle";
import StoryCreateModal from "./StoryCreateModal";
import StoryViewer from "./StoryViewer";

interface StoriesBarProps {
    className?: string;
}

export default function StoriesBar({ className }: StoriesBarProps) {
    const { user } = useSession();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showViewer, setShowViewer] = useState(false);
    const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);

    const { data, isLoading, error } = useQuery<{ stories: StoryData[] }>({
        queryKey: ["stories"],
        queryFn: () => kyInstance.get("/api/stories").json(),
        refetchInterval: 60_000, // Refresh every minute
        staleTime: 30_000, // Consider data stale after 30 seconds
    });

    const stories = data?.stories || [];

    // Separate current user's stories from others
    const userStories = stories.filter(story => story.user.id === user.id);
    const otherStories = stories.filter(story => story.user.id !== user.id);

    // Sort other stories: unviewed first, then by creation time
    const sortedOtherStories = otherStories.sort((a, b) => {
        const aViewed = (a as any).views && (a as any).views.some((v: any) => v.userId === user.id);
        const bViewed = (b as any).views && (b as any).views.some((v: any) => v.userId === user.id);

        if (aViewed !== bViewed) {
            return aViewed ? 1 : -1; // Unviewed first
        }

        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Combine: user's stories first, then sorted others
    const allStories = [...userStories, ...sortedOtherStories];

    const handleStoryClick = (index: number) => {
        setSelectedStoryIndex(index);
        setShowViewer(true);
    };

    const handleAddStoryClick = () => {
        if (userStories.length > 0) {
            // If user already has stories, view them
            const userStoryIndex = allStories.findIndex(story => story.user.id === user.id);
            handleStoryClick(userStoryIndex);
        } else {
            // If no stories, open create modal
            setShowCreateModal(true);
        }
    };

    if (isLoading) {
        return (
            <div className={`flex items-center justify-center p-4 ${className}`}>
                <LoadingSpinner className="text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading stories...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`p-4 ${className}`}>
                <ComponentErrorBoundary componentName="Stories">
                    <div className="text-center text-muted-foreground">
                        <p className="text-sm">Unable to load stories</p>
                    </div>
                </ComponentErrorBoundary>
            </div>
        );
    }

    if (stories.length === 0) {
        return (
            <ComponentErrorBoundary componentName="Stories">
                <div className={`flex items-center gap-4 overflow-x-auto p-4 ${className}`}>
                    <StoryCircle
                        isAddStory
                        onClick={() => setShowCreateModal(true)}
                    />
                    <EmptyState
                        title="No stories yet"
                        description="Be the first to share a story!"
                        className="flex-1 py-4"
                        icon={<Users className="size-8" />}
                    />
                    <StoryCreateModal
                        isOpen={showCreateModal}
                        onClose={() => setShowCreateModal(false)}
                    />
                </div>
            </ComponentErrorBoundary>
        );
    }

    return (
        <ComponentErrorBoundary componentName="Stories">
            <div className={`flex items-center gap-4 overflow-x-auto p-4 ${className}`}>
                {/* Add story button - always show for current user */}
                <StoryCircle
                    isAddStory
                    onClick={handleAddStoryClick}
                />

                {/* Other users' stories */}
                {allStories.map((story: StoryData, index: number) => (
                    <StoryCircle
                        key={story.id}
                        story={story}
                        onClick={() => handleStoryClick(index)}
                    />
                ))}
            </div>

            {/* Modals */}
            <StoryCreateModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
            />

            {showViewer && allStories.length > 0 && (
                <StoryViewer
                    stories={allStories}
                    initialStoryIndex={selectedStoryIndex}
                    isOpen={showViewer}
                    onClose={() => setShowViewer(false)}
                />
            )}
        </ComponentErrorBoundary>
    );
}