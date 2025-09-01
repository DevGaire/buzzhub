"use client";

import { ComponentErrorBoundary } from "@/components/ErrorBoundary";
import UserAvatar from "@/components/UserAvatar";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useChatContext, useTypingContext } from "stream-chat-react";

interface TypingUser {
    id: string;
    name: string;
    avatar?: string;
}

interface EnhancedTypingIndicatorProps {
    channelId?: string;
    className?: string;
    showAvatars?: boolean;
    maxVisible?: number;
}

export default function EnhancedTypingIndicator({
    channelId,
    className,
    showAvatars = true,
    maxVisible = 3
}: EnhancedTypingIndicatorProps) {
    const { client } = useChatContext();
    const typing = useTypingContext();
    const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);

    useEffect(() => {
        if (!typing || !Object.keys(typing).length) {
            setTypingUsers([]);
            return;
        }

        // Convert typing object to array of users
        const users: TypingUser[] = Object.keys(typing)
            .filter(userId => userId !== client.userID)
            .map(userId => {
                const user = client.state.users[userId];
                return {
                    id: userId,
                    name: user?.name || user?.username || `User ${userId.substring(0, 8)}`,
                    avatar: user?.image
                };
            })
            .filter(user => user.name !== `User ${user.id.substring(0, 8)}`); // Only show users with proper names

        setTypingUsers(users);
    }, [typing, client]);

    if (typingUsers.length === 0) return null;

    const visibleUsers = typingUsers.slice(0, maxVisible);
    const hiddenCount = typingUsers.length - maxVisible;

    const getTypingText = () => {
        if (typingUsers.length === 0) return "";

        if (typingUsers.length === 1) {
            return `${visibleUsers[0].name} is typing...`;
        } else if (typingUsers.length === 2) {
            return `${visibleUsers[0].name} and ${visibleUsers[1].name} are typing...`;
        } else if (typingUsers.length <= maxVisible) {
            const names = visibleUsers.slice(0, -1).map(u => u.name).join(', ');
            return `${names} and ${visibleUsers[visibleUsers.length - 1].name} are typing...`;
        } else {
            return `${visibleUsers[0].name} and ${typingUsers.length - 1} others are typing...`;
        }
    };

    return (
        <ComponentErrorBoundary componentName="Enhanced Typing Indicator">
            <div className={cn(
                "flex items-center gap-2 px-3 py-1 animate-fade-in",
                className
            )}>
                {/* User Avatars */}
                {showAvatars && (
                    <div className="flex -space-x-1">
                        {visibleUsers.map((user, index) => (
                            <div
                                key={user.id}
                                className="relative"
                                style={{
                                    animationDelay: `${index * 100}ms`,
                                    zIndex: maxVisible - index
                                }}
                            >
                                <UserAvatar
                                    avatarUrl={user.avatar}
                                    size={20}
                                    className="border border-background animate-bounce-subtle"
                                />
                                {/* Typing pulse animation */}
                                <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-pulse border border-background" />
                            </div>
                        ))}

                        {/* Show count if more users */}
                        {hiddenCount > 0 && (
                            <div className="flex items-center justify-center w-5 h-5 bg-muted text-xs font-medium rounded-full border border-background">
                                +{hiddenCount}
                            </div>
                        )}
                    </div>
                )}

                {/* Typing Text */}
                <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">
                        {getTypingText()}
                    </span>

                    {/* Animated dots */}
                    <div className="flex gap-0.5">
                        {[0, 1, 2].map((i) => (
                            <div
                                key={i}
                                className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce"
                                style={{
                                    animationDelay: `${i * 200}ms`,
                                    animationDuration: '1s'
                                }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </ComponentErrorBoundary>
    );
}

// Typing indicator for message input area
interface MessageInputTypingProps {
    className?: string;
}

export function MessageInputTyping({ className }: MessageInputTypingProps) {
    return (
        <div className={cn("px-3 py-0.5", className)}>
            <EnhancedTypingIndicator
                showAvatars={true}
                maxVisible={2}
                className="py-0.5"
            />
        </div>
    );
}

// Compact typing indicator for chat header
interface HeaderTypingProps {
    className?: string;
}

export function HeaderTyping({ className }: HeaderTypingProps) {
    const { client } = useChatContext();
    const typing = useTypingContext();
    const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);

    useEffect(() => {
        if (!typing || !Object.keys(typing).length || !client) {
            setTypingUsers([]);
            return;
        }

        const users = Object.keys(typing)
            .filter(userId => userId !== client.userID)
            .map(userId => {
                const user = client.state.users[userId];
                return {
                    id: userId,
                    name: user?.name || user?.username || `User ${userId.substring(0, 8)}`,
                    avatar: user?.image
                };
            })
            .filter(user => user.name && !user.name.startsWith('User ')); // Only show users with proper names

        setTypingUsers(users);
    }, [typing, client]);

    if (typingUsers.length === 0) return null;

    return (
        <div className={cn("flex items-center gap-1 text-xs text-green-500", className)}>
            <div className="flex gap-0.5">
                {[0, 1, 2].map((i) => (
                    <div
                        key={i}
                        className="w-1 h-1 bg-green-500 rounded-full animate-bounce"
                        style={{
                            animationDelay: `${i * 200}ms`,
                            animationDuration: '1s'
                        }}
                    />
                ))}
            </div>
            <span className="text-xs">
                typing...
            </span>
        </div>
    );
}