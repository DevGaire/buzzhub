"use client";

import { ComponentErrorBoundary } from "@/components/ErrorBoundary";
import UserAvatar from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { X, Reply, MessageSquare, ChevronRight } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface ReplyContext {
    id: string;
    content: string;
    user: {
        id: string;
        name: string;
        avatar?: string;
    };
    timestamp: Date;
}

interface MessageThreadProps {
    replyTo?: ReplyContext;
    onCancelReply?: () => void;
    onSendReply?: (content: string, replyToId: string) => void;
    className?: string;
}

export default function MessageThread({
    replyTo,
    onCancelReply,
    onSendReply,
    className
}: MessageThreadProps) {
    const [replyContent, setReplyContent] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (replyTo && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [replyTo]);

    const handleSendReply = () => {
        if (!replyContent.trim() || !replyTo) return;

        onSendReply?.(replyContent, replyTo.id);
        setReplyContent("");
        onCancelReply?.();
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendReply();
        }
    };

    if (!replyTo) return null;

    return (
        <ComponentErrorBoundary componentName="Message Thread">
            <div className={cn(
                "border-t bg-muted/30 transition-all duration-200",
                className
            )}>
                {/* Reply Context Preview */}
                <div className="flex items-start gap-3 p-3 border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950/20">
                    <Reply className="w-4 h-4 text-blue-500 mt-1 flex-shrink-0" />

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <UserAvatar
                                avatarUrl={replyTo.user.avatar}
                                size={16}
                            />
                            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                Replying to {replyTo.user.name}
                            </span>
                        </div>

                        <div className="text-sm text-muted-foreground truncate">
                            {replyTo.content}
                        </div>
                    </div>

                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={onCancelReply}
                        className="w-6 h-6 p-0 text-muted-foreground hover:text-foreground"
                    >
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                {/* Reply Input */}
                <div className="p-3">
                    <div className="flex gap-3">
                        <textarea
                            ref={textareaRef}
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Write a reply..."
                            className="flex-1 resize-none border-0 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none min-h-[40px] max-h-32"
                            rows={1}
                            style={{
                                height: 'auto',
                                overflow: 'hidden'
                            }}
                            onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement;
                                target.style.height = 'auto';
                                target.style.height = target.scrollHeight + 'px';
                            }}
                        />

                        <Button
                            size="sm"
                            onClick={handleSendReply}
                            disabled={!replyContent.trim()}
                            className="px-4"
                        >
                            Reply
                        </Button>
                    </div>
                </div>
            </div>
        </ComponentErrorBoundary>
    );
}

// Thread View for displaying conversation threads
interface ThreadViewProps {
    thread: Array<{
        id: string;
        content: string;
        user: {
            id: string;
            name: string;
            avatar?: string;
        };
        timestamp: Date;
        replyTo?: string;
    }>;
    onClose?: () => void;
    className?: string;
}

export function ThreadView({ thread, onClose, className }: ThreadViewProps) {
    if (thread.length === 0) return null;

    const rootMessage = thread[0];
    const replies = thread.slice(1);

    return (
        <ComponentErrorBoundary componentName="Thread View">
            <div className={cn(
                "border-l-4 border-blue-500 bg-card rounded-lg shadow-sm",
                className
            )}>
                {/* Thread Header */}
                <div className="flex items-center justify-between p-3 border-b">
                    <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-blue-500" />
                        <span className="font-medium">Thread</span>
                        <span className="text-sm text-muted-foreground">
                            {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                        </span>
                    </div>

                    {onClose && (
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={onClose}
                            className="w-6 h-6 p-0"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    )}
                </div>

                {/* Root Message */}
                <div className="p-3 border-b bg-muted/20">
                    <ThreadMessage message={rootMessage} isRoot />
                </div>

                {/* Replies */}
                <div className="max-h-96 overflow-y-auto">
                    {replies.map((reply) => (
                        <div key={reply.id} className="p-3 border-b last:border-b-0">
                            <ThreadMessage message={reply} />
                        </div>
                    ))}
                </div>
            </div>
        </ComponentErrorBoundary>
    );
}

// Individual message in thread
interface ThreadMessageProps {
    message: {
        id: string;
        content: string;
        user: {
            id: string;
            name: string;
            avatar?: string;
        };
        timestamp: Date;
    };
    isRoot?: boolean;
}

function ThreadMessage({ message, isRoot }: ThreadMessageProps) {
    const formatTime = (date: Date) => {
        return new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            month: 'short',
            day: 'numeric'
        }).format(date);
    };

    return (
        <div className="flex gap-3">
            {!isRoot && (
                <div className="flex items-start mt-1">
                    <ChevronRight className="w-3 h-3 text-muted-foreground" />
                </div>
            )}

            <UserAvatar
                avatarUrl={message.user.avatar}
                size={isRoot ? 36 : 28}
                className="mt-1"
            />

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className={cn(
                        "font-medium",
                        isRoot ? "text-base" : "text-sm"
                    )}>
                        {message.user.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                        {formatTime(message.timestamp)}
                    </span>
                    {isRoot && (
                        <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
                            Original
                        </span>
                    )}
                </div>

                <div className={cn(
                    "break-words",
                    isRoot ? "text-base" : "text-sm"
                )}>
                    {message.content}
                </div>
            </div>
        </div>
    );
}

// Reply button component for message actions
interface ReplyButtonProps {
    onReply: () => void;
    className?: string;
}

export function ReplyButton({ onReply, className }: ReplyButtonProps) {
    return (
        <Button
            size="sm"
            variant="ghost"
            onClick={onReply}
            className={cn("w-8 h-8 p-0", className)}
            title="Reply to message"
        >
            <Reply className="w-4 h-4" />
        </Button>
    );
}