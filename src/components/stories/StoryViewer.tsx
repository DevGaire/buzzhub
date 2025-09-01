"use client";

import { useSession } from "@/app/(main)/SessionProvider";
import UserAvatar from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import kyInstance from "@/lib/ky";
import { StoryData } from "@/lib/types";
import { formatRelativeDate } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, MoreHorizontal, Pause, Play, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

interface StoryViewerProps {
    stories: StoryData[];
    initialStoryIndex: number;
    isOpen: boolean;
    onClose: () => void;
}

export default function StoryViewer({
    stories,
    initialStoryIndex,
    isOpen,
    onClose,
}: StoryViewerProps) {
    const { user } = useSession();
    const queryClient = useQueryClient();

    const [currentStoryIndex, setCurrentStoryIndex] = useState(initialStoryIndex);
    const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [progress, setProgress] = useState(0);

    const videoRef = useRef<HTMLVideoElement>(null);
    const timerRef = useRef<NodeJS.Timeout>();
    const progressRef = useRef<NodeJS.Timeout>();

    const currentStory = stories[currentStoryIndex];
    const currentMedia = currentStory?.items[currentMediaIndex];
    const isVideo = currentMedia?.media.type === "VIDEO";
    const isLastStory = currentStoryIndex === stories.length - 1;
    const isLastMedia = currentMediaIndex === (currentStory?.items.length || 0) - 1;

    // Mark story as viewed
    const markAsViewedMutation = useMutation({
        mutationFn: (storyId: string) =>
            kyInstance.post(`/api/stories/${storyId}/view`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["stories"] });
        },
    });

    // Auto-advance timer
    const startTimer = useCallback(() => {
        if (isPaused) return;

        const duration = isVideo ? 15000 : 5000; // 15s for video, 5s for image
        let startTime = Date.now();

        // Progress animation
        progressRef.current = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progressPercent = Math.min((elapsed / duration) * 100, 100);
            setProgress(progressPercent);
        }, 50);

        // Auto advance
        timerRef.current = setTimeout(() => {
            nextMedia();
        }, duration);
    }, [isPaused, isVideo]);

    const clearTimers = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (progressRef.current) clearInterval(progressRef.current);
        setProgress(0);
    }, []);

    const nextMedia = useCallback(() => {
        clearTimers();

        if (isLastMedia) {
            if (isLastStory) {
                onClose();
                return;
            }
            // Next story
            setCurrentStoryIndex(prev => prev + 1);
            setCurrentMediaIndex(0);
        } else {
            // Next media in current story
            setCurrentMediaIndex(prev => prev + 1);
        }
    }, [isLastMedia, isLastStory, clearTimers, onClose]);

    const prevMedia = useCallback(() => {
        clearTimers();

        if (currentMediaIndex === 0) {
            if (currentStoryIndex === 0) return;
            // Previous story (last media)
            const prevStory = stories[currentStoryIndex - 1];
            setCurrentStoryIndex(prev => prev - 1);
            setCurrentMediaIndex(prevStory.items.length - 1);
        } else {
            // Previous media in current story
            setCurrentMediaIndex(prev => prev - 1);
        }
    }, [currentMediaIndex, currentStoryIndex, stories, clearTimers]);

    const togglePause = useCallback(() => {
        setIsPaused(prev => !prev);
        if (isVideo && videoRef.current) {
            if (isPaused) {
                videoRef.current.play();
            } else {
                videoRef.current.pause();
            }
        }
    }, [isPaused, isVideo]);

    // Mark current story as viewed
    useEffect(() => {
        if (currentStory && (currentStory as any).views && !(currentStory as any).views.some((v: any) => v.userId === user.id)) {
            markAsViewedMutation.mutate(currentStory.id);
        }
    }, [currentStory, user.id, markAsViewedMutation]);

    // Reset media index when story changes
    useEffect(() => {
        setCurrentMediaIndex(0);
        clearTimers();
    }, [currentStoryIndex, clearTimers]);

    // Start timer when media changes or pause state changes
    useEffect(() => {
        if (isOpen && currentMedia) {
            clearTimers();
            startTimer();
        }
        return clearTimers;
    }, [isOpen, currentMedia, isPaused, startTimer, clearTimers]);

    // Cleanup on unmount
    useEffect(() => {
        return clearTimers;
    }, [clearTimers]);

    // Handle video events
    const handleVideoLoadedData = () => {
        if (videoRef.current && !isPaused) {
            videoRef.current.play();
        }
    };

    if (!currentStory || !currentMedia) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="h-screen w-screen max-w-none border-0 bg-black/95 p-0">
                <div className="relative flex h-full w-full items-center justify-center p-4">
                    {/* Story Card Container - Instagram-like dimensions */}
                    <div className="relative mx-auto h-[85vh] w-full max-w-[380px] overflow-hidden rounded-3xl bg-black shadow-2xl" style={{ aspectRatio: '9/16' }}>
                        {/* Progress bars */}
                        <div className="absolute top-4 left-4 right-4 z-30 flex gap-1">
                            {currentStory.items.map((_, index) => (
                                <div
                                    key={index}
                                    className="h-1 flex-1 overflow-hidden rounded-full bg-white/30"
                                >
                                    <div
                                        className="h-full bg-white transition-all duration-100"
                                        style={{
                                            width:
                                                index < currentMediaIndex
                                                    ? "100%"
                                                    : index === currentMediaIndex
                                                        ? `${progress}%`
                                                        : "0%"
                                        }}
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Header */}
                        <div className="absolute top-6 left-4 right-4 z-30 mt-6 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <UserAvatar avatarUrl={currentStory.user.avatarUrl} size={36} />
                                <div>
                                    <p className="text-sm font-medium text-white">{currentStory.user.displayName}</p>
                                    <p className="text-xs text-white/70">
                                        {formatRelativeDate(currentStory.createdAt)}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={togglePause}
                                    className="h-8 w-8 p-0 text-white hover:bg-white/20"
                                >
                                    {isPaused ? <Play className="size-3" /> : <Pause className="size-3" />}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-white hover:bg-white/20"
                                >
                                    <MoreHorizontal className="size-3" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onClose}
                                    className="h-8 w-8 p-0 text-white hover:bg-white/20"
                                >
                                    <X className="size-3" />
                                </Button>
                            </div>
                        </div>

                        {/* Media content - Card format with proper scaling */}
                        <div className="relative h-full w-full overflow-hidden rounded-3xl">
                            {isVideo ? (
                                <video
                                    ref={videoRef}
                                    src={currentMedia.media.url}
                                    className="h-full w-full object-cover"
                                    onLoadedData={handleVideoLoadedData}
                                    muted
                                    playsInline
                                    style={{ objectPosition: 'center' }}
                                />
                            ) : (
                                <Image
                                    src={currentMedia.media.url}
                                    alt="Story content"
                                    fill
                                    className="object-cover"
                                    priority
                                    sizes="(max-width: 640px) 100vw, 380px"
                                    style={{ objectPosition: 'center' }}
                                />
                            )}
                        </div>

                        {/* Navigation areas - Left and Right tap zones */}
                        <button
                            onClick={prevMedia}
                            className="absolute left-0 top-0 z-20 h-full w-1/2 bg-transparent"
                            disabled={currentStoryIndex === 0 && currentMediaIndex === 0}
                            aria-label="Previous story"
                        />
                        <button
                            onClick={nextMedia}
                            className="absolute right-0 top-0 z-20 h-full w-1/2 bg-transparent"
                            aria-label="Next story"
                        />

                        {/* Story viewers count (for own stories) */}
                        {currentStory.user.id === user.id && (
                            <div className="absolute bottom-4 left-4 z-30">
                                <p className="text-xs text-white/70">
                                    {(currentStory as any)._count?.views || 0} views
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Navigation arrows - Outside the card */}
                    {!(currentStoryIndex === 0 && currentMediaIndex === 0) && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={prevMedia}
                            className="absolute left-2 top-1/2 z-40 -translate-y-1/2 h-10 w-10 rounded-full bg-black/50 p-0 text-white hover:bg-black/70 md:left-8"
                        >
                            <ChevronLeft className="size-5" />
                        </Button>
                    )}

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={nextMedia}
                        className="absolute right-2 top-1/2 z-40 -translate-y-1/2 h-10 w-10 rounded-full bg-black/50 p-0 text-white hover:bg-black/70 md:right-8"
                    >
                        <ChevronRight className="size-5" />
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}