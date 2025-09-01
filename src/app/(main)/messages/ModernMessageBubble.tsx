"use client";

import { ComponentErrorBoundary } from "@/components/ErrorBoundary";
import UserAvatar from "@/components/UserAvatar";
import { cn } from "@/lib/utils";
import { formatRelativeDate } from "@/lib/utils";
import { Check, CheckCheck, Clock, Reply, MoreHorizontal } from "lucide-react";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import MessageReactions, { QuickReactButton } from "./MessageReactions";

export type MessageStatus = "sending" | "sent" | "delivered" | "read" | "failed";

export interface MessageBubbleProps {
    id: string;
    content: string;
    timestamp: Date;
    isOwn: boolean;
    status?: MessageStatus;
    user: {
        id: string;
        name: string;
        avatar?: string;
    };
    reactions?: Array<{
        emoji: string;
        count: number;
        users: Array<{ id: string; name: string }>;
        hasUserReacted: boolean;
    }>;
    replyTo?: {
        id: string;
        content: string;
        user: { name: string };
    };
    onReact?: (emoji: string) => void;
    onRemoveReaction?: (emoji: string) => void;
    onReply?: () => void;
    onMore?: () => void;
    className?: string;
}

export default function ModernMessageBubble({
    id,
    content,
    timestamp,
    isOwn,
    status = "sent",
    user,
    reactions = [],
    replyTo,
    onReact,
    onRemoveReaction,
    onReply,
    onMore,
    className
}: MessageBubbleProps) {
    const [showActions, setShowActions] = useState(false);
    const messageRef = useRef<HTMLDivElement>(null);

    const getStatusIcon = () => {
        switch (status) {
            case "sending":
                return <Clock className="w-3 h-3 text-muted-foreground animate-pulse" />;
            case "sent":
                return <Check className="w-3 h-3 text-muted-foreground" />;
            case "delivered":
                return <CheckCheck className="w-3 h-3 text-muted-foreground" />;
            case "read":
                return <CheckCheck className="w-3 h-3 text-blue-500" />;
            case "failed":
                return <Clock className="w-3 h-3 text-red-500" />;
            default:
                return null;
        }
    };

    const formatTime = (date: Date) => {
        return new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        }).format(date);
    };

    return (
        <ComponentErrorBoundary componentName="Message Bubble">
            <div
                ref={messageRef}
                className={cn(
                    "group flex gap-3 px-4 py-2 hover:bg-muted/20 transition-colors",
                    isOwn ? "flex-row-reverse" : "flex-row",
                    className
                )}
                onMouseEnter={() => setShowActions(true)}
                onMouseLeave={() => setShowActions(false)}
            >
                {/* Avatar - only show for other users and first message in group */}
                {!isOwn && (
                    <div className="flex-shrink-0">
                        <UserAvatar
                            avatarUrl={user.avatar}
                            size={32}
                            className="mt-1"
                        />
                    </div>
                )}

                {/* Message Content */}
                <div className={cn(
                    "flex flex-col max-w-[70%]",
                    isOwn ? "items-end" : "items-start"
                )}>
                    {/* User name for non-own messages */}
                    {!isOwn && (
                        <div className="text-xs text-muted-foreground mb-1 px-3">
                            {user.name}
                        </div>
                    )}

                    {/* Reply indicator */}
                    {replyTo && (
                        <div className={cn(
                            "mb-1 p-2 rounded-lg border-l-2 text-xs",
                            isOwn
                                ? "bg-blue-50 dark:bg-blue-950 border-blue-500 mr-3"
                                : "bg-muted ml-3 border-muted-foreground"
                        )}>
                            <div className="font-medium text-muted-foreground">
                                Replying to {replyTo.user.name}
                            </div>
                            <div className="truncate max-w-48">
                                {replyTo.content}
                            </div>
                        </div>
                    )}

                    {/* Message bubble */}
                    <div className={cn(
                        "relative px-3 py-2 rounded-2xl max-w-full break-words",
                        isOwn
                            ? "bg-blue-500 text-white rounded-br-md"
                            : "bg-muted rounded-bl-md"
                    )}>
                        <div className="whitespace-pre-wrap">{content}</div>

                        {/* Timestamp and status */}
                        <div className={cn(
                            "flex items-center gap-1 mt-1 text-xs",
                            isOwn ? "text-blue-100" : "text-muted-foreground"
                        )}>
                            <span>{formatTime(timestamp)}</span>
                            {isOwn && getStatusIcon()}
                        </div>
                    </div>

                    {/* Reactions */}
                    {(reactions.length > 0 || onReact) && (
                        <div className={cn(
                            "mt-1",
                            isOwn ? "mr-3" : "ml-3"
                        )}>
                            <MessageReactions
                                messageId={id}
                                reactions={reactions}
                                onReact={onReact || (() => { })}
                                onRemoveReaction={onRemoveReaction || (() => { })}
                            />
                        </div>
                    )}
                </div>

                {/* Message Actions */}
                <div className={cn(
                    "flex items-start gap-1 mt-1 transition-opacity",
                    showActions ? "opacity-100" : "opacity-0",
                    isOwn ? "flex-row" : "flex-row-reverse"
                )}>
                    {onReact && (
                        <QuickReactButton
                            onReact={onReact}
                            className="order-1"
                        />
                    )}

                    {onReply && (
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={onReply}
                            className="w-8 h-8 p-0 order-2"
                            title="Reply"
                        >
                            <Reply className="w-4 h-4" />
                        </Button>
                    )}

                    {onMore && (
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={onMore}
                            className="w-8 h-8 p-0 order-3"
                            title="More options"
                        >
                            <MoreHorizontal className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            </div>
        </ComponentErrorBoundary>
    );
}

// Message group component for better organization
interface MessageGroupProps {
    messages: MessageBubbleProps[];
    className?: string;
}

export function MessageGroup({ messages, className }: MessageGroupProps) {
    if (messages.length === 0) return null;

    const firstMessage = messages[0];
    const isOwn = firstMessage.isOwn;

    return (
        <div className={cn("space-y-1", className)}>
            {messages.map((message, index) => (
                <ModernMessageBubble
                    key={message.id}
                    {...message}
                    className={cn(
                        // Hide avatar for subsequent messages in group (except first)
                        index > 0 && !isOwn && "ml-11"
                    )}
                />
            ))}
        </div>
    );
}

// Typing indicator component
interface TypingIndicatorProps {
    users: Array<{ id: string; name: string; avatar?: string }>;
    className?: string;
}

export function TypingIndicator({ users, className }: TypingIndicatorProps) {
    if (users.length === 0) return null;

    return (
        <div className={cn("flex items-center gap-3 px-4 py-2", className)}>
            <div className="flex -space-x-2">
                {users.slice(0, 3).map((user) => (
                    <UserAvatar
                        key={user.id}
                        avatarUrl={user.avatar}
                        size={24}
                        className="border-2 border-background"
                    />
                ))}
            </div>

            <div className="flex items-center gap-2">
                <div className="text-sm text-muted-foreground">
                    {users.length === 1
                        ? `${users[0].name} is typing...`
                        : users.length === 2
                            ? `${users[0].name} and ${users[1].name} are typing...`
                            : `${users[0].name} and ${users.length - 1} others are typing...`
                    }
                </div>

                <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                        <div
                            key={i}
                            className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce"
                            style={{
                                animationDelay: `${i * 0.2}s`,
                                animationDuration: '1s'
                            }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}