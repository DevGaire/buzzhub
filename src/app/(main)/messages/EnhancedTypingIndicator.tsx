"use client";

import { ComponentErrorBoundary } from "@/components/ErrorBoundary";
import UserAvatar from "@/components/UserAvatar";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useChatContext, useTypingContext } from "stream-chat-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

// Animated typing dots component
function TypingDots({ className }: { className?: string }) {
    return (
        <div className={cn("flex items-center gap-1", className)}>
            {[0, 1, 2].map((i) => (
                <span
                    key={i}
                    className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"
                    style={{
                        animationDelay: `${i * 150}ms`,
                        animationDuration: '0.6s'
                    }}
                />
            ))}
        </div>
    );
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
            .filter(user => user.name !== `User ${user.id.substring(0, 8)}`);

        setTypingUsers(users);
    }, [typing, client]);

    if (typingUsers.length === 0) return null;

    const visibleUsers = typingUsers.slice(0, maxVisible);
    const hiddenCount = typingUsers.length - maxVisible;

    const getTypingText = () => {
        if (typingUsers.length === 0) return "";

        if (typingUsers.length === 1) {
            return `${visibleUsers[0].name} is typing`;
        } else if (typingUsers.length === 2) {
            return `${visibleUsers[0].name} and ${visibleUsers[1].name} are typing`;
        } else if (typingUsers.length <= maxVisible) {
            const names = visibleUsers.slice(0, -1).map(u => u.name).join(', ');
            return `${names} and ${visibleUsers[visibleUsers.length - 1].name} are typing`;
        } else {
            return `${visibleUsers[0].name} and ${typingUsers.length - 1} others are typing`;
        }
    };

    return (
        <ComponentErrorBoundary componentName="Enhanced Typing Indicator">
            <div className={cn(
                "flex items-center gap-3 px-4 py-2 bg-[#0a0a0b]/50 backdrop-blur-sm",
                "animate-in slide-in-from-bottom-2 duration-200",
                className
            )}>
                {/* User Avatars with typing animation */}
                {showAvatars && (
                    <div className="flex -space-x-2">
                        {visibleUsers.map((user, index) => (
                            <div
                                key={user.id}
                                className="relative animate-in zoom-in-75 duration-200"
                                style={{
                                    animationDelay: `${index * 50}ms`,
                                    zIndex: maxVisible - index
                                }}
                            >
                                <Avatar className="h-6 w-6 ring-2 ring-[#0a0a0b]">
                                    <AvatarImage src={user.avatar} />
                                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-[10px] font-medium">
                                        {user.name?.[0]?.toUpperCase() || '?'}
                                    </AvatarFallback>
                                </Avatar>
                                {/* Green pulse indicator */}
                                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full ring-2 ring-[#0a0a0b] animate-pulse" />
                            </div>
                        ))}

                        {/* Show count if more users */}
                        {hiddenCount > 0 && (
                            <div className="flex items-center justify-center w-6 h-6 bg-blue-500/20 text-blue-400 text-[10px] font-bold rounded-full ring-2 ring-[#0a0a0b]">
                                +{hiddenCount}
                            </div>
                        )}
                    </div>
                )}

                {/* Typing bubble */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1a1b] rounded-full border border-white/5">
                    <span className="text-xs text-muted-foreground">
                        {getTypingText()}
                    </span>
                    <TypingDots />
                </div>
            </div>
        </ComponentErrorBoundary>
    );
}

// Typing indicator for message input area - more compact
interface MessageInputTypingProps {
    className?: string;
}

export function MessageInputTyping({ className }: MessageInputTypingProps) {
    const { client } = useChatContext();
    const typing = useTypingContext();
    const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);

    useEffect(() => {
        if (!typing || !Object.keys(typing).length) {
            setTypingUsers([]);
            return;
        }

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
            .filter(user => !user.name.startsWith('User '));

        setTypingUsers(users);
    }, [typing, client]);

    if (typingUsers.length === 0) return null;

    const displayName = typingUsers.length === 1
        ? typingUsers[0].name
        : typingUsers.length === 2
            ? `${typingUsers[0].name} and ${typingUsers[1].name}`
            : `${typingUsers[0].name} and ${typingUsers.length - 1} others`;

    return (
        <div className={cn(
            "flex items-center gap-2 px-5 py-2 text-sm animate-in fade-in duration-150 bg-black",
            className
        )}>
            <span className="text-white/50">
                {displayName} {typingUsers.length === 1 ? 'is' : 'are'} typing
            </span>
            <TypingDots className="[&>span]:bg-white/50 [&>span]:w-1 [&>span]:h-1" />
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
            .filter(user => user.name && !user.name.startsWith('User '));

        setTypingUsers(users);
    }, [typing, client]);

    if (typingUsers.length === 0) return null;

    return (
        <div className={cn(
            "flex items-center gap-1.5 text-xs text-green-400 animate-in fade-in duration-200",
            className
        )}>
            <TypingDots className="[&>span]:bg-green-400 [&>span]:w-1 [&>span]:h-1" />
            <span>typing...</span>
        </div>
    );
}
