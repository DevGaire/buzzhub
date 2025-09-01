"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import { Heart, Smile, ThumbsUp, Laugh, Angry, Frown, Plus } from "lucide-react";
import { ComponentErrorBoundary } from "@/components/ErrorBoundary";
import { toast } from "@/components/ui/use-toast";

// Popular emoji reactions
const QUICK_REACTIONS = [
    { emoji: "❤️", icon: Heart, label: "Love" },
    { emoji: "👍", icon: ThumbsUp, label: "Like" },
    { emoji: "😂", icon: Laugh, label: "Laugh" },
    { emoji: "😮", icon: null, label: "Wow", text: "😮" },
    { emoji: "😢", icon: Frown, label: "Sad" },
    { emoji: "😡", icon: Angry, label: "Angry" },
];

const EXTENDED_EMOJIS = [
    "❤️", "👍", "👎", "😂", "😮", "😢", "😡", "🥰", "😘", "😊",
    "😎", "🤔", "😴", "🤗", "🙄", "😏", "🤯", "🔥", "💯", "✨",
    "👏", "🙌", "💪", "🤝", "👌", "✌️", "🤞", "🙏", "💀", "🎉"
];

interface MessageReactionsProps {
    messageId: string;
    reactions?: Array<{
        emoji: string;
        count: number;
        users: Array<{ id: string; name: string }>;
        hasUserReacted: boolean;
    }>;
    onReact: (emoji: string) => void;
    onRemoveReaction: (emoji: string) => void;
    className?: string;
}

export default function MessageReactions({
    messageId,
    reactions = [],
    onReact,
    onRemoveReaction,
    className
}: MessageReactionsProps) {
    const [showPicker, setShowPicker] = useState(false);
    const [showQuickReactions, setShowQuickReactions] = useState(false);
    const pickerRef = useRef<HTMLDivElement>(null);
    const quickRef = useRef<HTMLDivElement>(null);

    // Close pickers when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                setShowPicker(false);
            }
            if (quickRef.current && !quickRef.current.contains(event.target as Node)) {
                setShowQuickReactions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleReaction = (emoji: string) => {
        // Check if user has already reacted with this emoji
        const existingReaction = reactions.find(r => r.emoji === emoji);
        
        if (existingReaction?.hasUserReacted) {
            // If clicking the same emoji, remove it
            onRemoveReaction(emoji);
        } else {
            // Check if user has any other reaction on this message
            const userCurrentReaction = reactions.find(r => r.hasUserReacted);
            
            if (userCurrentReaction) {
                // Remove the existing reaction first
                onRemoveReaction(userCurrentReaction.emoji);
            }
            
            // Add the new reaction
            onReact(emoji);
        }

        setShowPicker(false);
        setShowQuickReactions(false);
    };

    const handleQuickReact = (emoji: string) => {
        handleReaction(emoji);
        toast({
            description: `Reacted with ${emoji}`,
            duration: 1000,
        });
    };

    return (
        <ComponentErrorBoundary componentName="Message Reactions">
            <div className={cn("relative", className)}>
                {/* Existing Reactions */}
                {reactions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                        {reactions.map((reaction) => (
                            <button
                                key={reaction.emoji}
                                onClick={() => handleReaction(reaction.emoji)}
                                className={cn(
                                    "flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all hover:scale-105",
                                    reaction.hasUserReacted
                                        ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 ring-1 ring-blue-300"
                                        : "bg-muted hover:bg-muted/80"
                                )}
                                title={`${reaction.users.map(u => u.name).join(", ")} reacted with ${reaction.emoji}`}
                            >
                                <span className="text-sm">{reaction.emoji}</span>
                                <span className="font-medium">{reaction.count}</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Quick Reactions (shown on hover/long press) */}
                {showQuickReactions && (
                    <div
                        ref={quickRef}
                        className="absolute bottom-full left-0 mb-2 flex gap-1 p-2 bg-card border rounded-lg shadow-lg z-50 animate-in slide-in-from-bottom-2"
                    >
                        {QUICK_REACTIONS.map((reaction) => {
                            const Icon = reaction.icon;
                            const isCurrentReaction = reactions.find(r => r.hasUserReacted && r.emoji === reaction.emoji);
                            return (
                                <button
                                    key={reaction.emoji}
                                    onClick={() => handleQuickReact(reaction.emoji)}
                                    className={cn(
                                        "flex items-center justify-center w-8 h-8 rounded-full transition-colors",
                                        isCurrentReaction 
                                            ? "bg-blue-100 dark:bg-blue-900 ring-1 ring-blue-300" 
                                            : "hover:bg-muted"
                                    )}
                                    title={reaction.label}
                                >
                                    {Icon ? (
                                        <Icon className="w-4 h-4" />
                                    ) : (
                                        <span className="text-lg">{reaction.text || reaction.emoji}</span>
                                    )}
                                </button>
                            );
                        })}
                        <button
                            onClick={() => {
                                setShowQuickReactions(false);
                                setShowPicker(true);
                            }}
                            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-muted transition-colors"
                            title="More reactions"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Extended Emoji Picker */}
                {showPicker && (
                    <div
                        ref={pickerRef}
                        className="absolute bottom-full left-0 mb-2 p-3 bg-card border rounded-lg shadow-lg z-50 animate-in slide-in-from-bottom-2"
                    >
                        <div className="grid grid-cols-8 gap-1 max-w-64">
                            {EXTENDED_EMOJIS.map((emoji) => {
                                const isCurrentReaction = reactions.find(r => r.hasUserReacted && r.emoji === emoji);
                                return (
                                    <button
                                        key={emoji}
                                        onClick={() => handleQuickReact(emoji)}
                                        className={cn(
                                            "flex items-center justify-center w-8 h-8 rounded transition-colors text-lg",
                                            isCurrentReaction 
                                                ? "bg-blue-100 dark:bg-blue-900 ring-1 ring-blue-300" 
                                                : "hover:bg-muted"
                                        )}
                                        title={isCurrentReaction ? "Remove reaction" : "React with " + emoji}
                                    >
                                        {emoji}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Add Reaction Button */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowQuickReactions(!showQuickReactions)}
                        onMouseEnter={() => setShowQuickReactions(true)}
                        className="flex items-center gap-1 px-2 py-1 rounded-full text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                        <Smile className="w-3 h-3" />
                        <span>React</span>
                    </button>

                    <button
                        onClick={() => setShowPicker(!showPicker)}
                        className="flex items-center gap-1 px-2 py-1 rounded-full text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                        <Plus className="w-3 h-3" />
                        <span>More</span>
                    </button>
                </div>
            </div>
        </ComponentErrorBoundary>
    );
}

// Quick reaction button for message hover
interface QuickReactButtonProps {
    onReact: (emoji: string) => void;
    currentUserReaction?: string;
    className?: string;
}

export function QuickReactButton({ onReact, currentUserReaction, className }: QuickReactButtonProps) {
    const [showReactions, setShowReactions] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setShowReactions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={ref} className={cn("relative", className)}>
            <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowReactions(!showReactions)}
                className="w-8 h-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <Smile className="w-4 h-4" />
            </Button>

            {showReactions && (
                <div className="absolute top-full left-0 mt-1 flex gap-1 p-2 bg-card border rounded-lg shadow-lg z-50 animate-in slide-in-from-top-2">
                    {QUICK_REACTIONS.slice(0, 4).map((reaction) => {
                        const Icon = reaction.icon;
                        return (
                            <button
                                key={reaction.emoji}
                                onClick={() => {
                                    onReact(reaction.emoji);
                                    setShowReactions(false);
                                    toast({
                                        description: `Reacted with ${reaction.emoji}`,
                                        duration: 1000,
                                    });
                                }}
                                className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-muted transition-colors"
                                title={reaction.label}
                            >
                                {Icon ? (
                                    <Icon className="w-4 h-4" />
                                ) : (
                                    <span className="text-lg">{reaction.text || reaction.emoji}</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}