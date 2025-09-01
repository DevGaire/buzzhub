"use client";

import { ComponentErrorBoundary } from "@/components/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
    Pin,
    PinOff,
    MailOpen,
    Mail,
    Clock,
    Calendar,
    Send,
    X,
    Check
} from "lucide-react";
import { useState } from "react";

interface QuickChatActionsProps {
    messageId?: string;
    conversationId?: string;
    isPinned?: boolean;
    isRead?: boolean;
    onPin?: (messageId: string) => void;
    onUnpin?: (messageId: string) => void;
    onMarkAsRead?: (conversationId: string) => void;
    onMarkAsUnread?: (conversationId: string) => void;
    onScheduleMessage?: (content: string, scheduledFor: Date) => void;
    className?: string;
}

export default function QuickChatActions({
    messageId,
    conversationId,
    isPinned = false,
    isRead = true,
    onPin,
    onUnpin,
    onMarkAsRead,
    onMarkAsUnread,
    onScheduleMessage,
    className
}: QuickChatActionsProps) {
    const [showScheduler, setShowScheduler] = useState(false);

    const handlePin = () => {
        if (!messageId) return;

        if (isPinned) {
            onUnpin?.(messageId);
            toast({
                description: "Message unpinned",
                duration: 2000,
            });
        } else {
            onPin?.(messageId);
            toast({
                description: "Message pinned",
                duration: 2000,
            });
        }
    };

    const handleReadStatus = () => {
        if (!conversationId) return;

        if (isRead) {
            onMarkAsUnread?.(conversationId);
            toast({
                description: "Marked as unread",
                duration: 2000,
            });
        } else {
            onMarkAsRead?.(conversationId);
            toast({
                description: "Marked as read",
                duration: 2000,
            });
        }
    };

    return (
        <ComponentErrorBoundary componentName="Quick Chat Actions">
            <div className={cn("flex items-center gap-1", className)}>
                {/* Pin/Unpin Message */}
                {messageId && (
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={handlePin}
                        className="w-8 h-8 p-0"
                        title={isPinned ? "Unpin message" : "Pin message"}
                    >
                        {isPinned ? (
                            <PinOff className="w-4 h-4 text-orange-500" />
                        ) : (
                            <Pin className="w-4 h-4" />
                        )}
                    </Button>
                )}

                {/* Mark as Read/Unread */}
                {conversationId && (
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleReadStatus}
                        className="w-8 h-8 p-0"
                        title={isRead ? "Mark as unread" : "Mark as read"}
                    >
                        {isRead ? (
                            <Mail className="w-4 h-4" />
                        ) : (
                            <MailOpen className="w-4 h-4 text-blue-500" />
                        )}
                    </Button>
                )}

                {/* Schedule Message */}
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowScheduler(true)}
                    className="w-8 h-8 p-0"
                    title="Schedule message"
                >
                    <Clock className="w-4 h-4" />
                </Button>

                {/* Message Scheduler Modal */}
                {showScheduler && (
                    <MessageScheduler
                        onSchedule={onScheduleMessage}
                        onClose={() => setShowScheduler(false)}
                    />
                )}
            </div>
        </ComponentErrorBoundary>
    );
}

// Message Scheduler Component
interface MessageSchedulerProps {
    onSchedule?: (content: string, scheduledFor: Date) => void;
    onClose: () => void;
}

function MessageScheduler({ onSchedule, onClose }: MessageSchedulerProps) {
    const [content, setContent] = useState("");
    const [scheduledDate, setScheduledDate] = useState("");
    const [scheduledTime, setScheduledTime] = useState("");

    const handleSchedule = () => {
        if (!content.trim() || !scheduledDate || !scheduledTime) {
            toast({
                variant: "destructive",
                description: "Please fill in all fields",
            });
            return;
        }

        const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);

        if (scheduledDateTime <= new Date()) {
            toast({
                variant: "destructive",
                description: "Scheduled time must be in the future",
            });
            return;
        }

        onSchedule?.(content, scheduledDateTime);

        toast({
            description: `Message scheduled for ${scheduledDateTime.toLocaleString()}`,
            duration: 3000,
        });

        onClose();
    };

    // Quick schedule options
    const quickScheduleOptions = [
        {
            label: "In 1 hour",
            getValue: () => {
                const date = new Date();
                date.setHours(date.getHours() + 1);
                return date;
            }
        },
        {
            label: "Tomorrow 9 AM",
            getValue: () => {
                const date = new Date();
                date.setDate(date.getDate() + 1);
                date.setHours(9, 0, 0, 0);
                return date;
            }
        },
        {
            label: "Next Monday 9 AM",
            getValue: () => {
                const date = new Date();
                const daysUntilMonday = (1 + 7 - date.getDay()) % 7 || 7;
                date.setDate(date.getDate() + daysUntilMonday);
                date.setHours(9, 0, 0, 0);
                return date;
            }
        }
    ];

    const handleQuickSchedule = (getDate: () => Date) => {
        const date = getDate();
        setScheduledDate(date.toISOString().split('T')[0]);
        setScheduledTime(date.toTimeString().slice(0, 5));
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-background rounded-lg shadow-xl max-w-md w-full">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        Schedule Message
                    </h3>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={onClose}
                        className="w-8 h-8 p-0"
                    >
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    {/* Message Content */}
                    <div className="space-y-2">
                        <Label htmlFor="message-content">Message</Label>
                        <textarea
                            id="message-content"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Type your message..."
                            className="w-full min-h-[80px] p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                            maxLength={500}
                        />
                        <div className="text-xs text-muted-foreground text-right">
                            {content.length}/500
                        </div>
                    </div>

                    {/* Quick Schedule Options */}
                    <div className="space-y-2">
                        <Label>Quick Schedule</Label>
                        <div className="flex flex-wrap gap-2">
                            {quickScheduleOptions.map((option) => (
                                <Button
                                    key={option.label}
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleQuickSchedule(option.getValue)}
                                    className="text-xs"
                                >
                                    {option.label}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Custom Date & Time */}
                    <div className="space-y-3">
                        <Label>Custom Schedule</Label>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label htmlFor="schedule-date" className="text-sm">Date</Label>
                                <Input
                                    id="schedule-date"
                                    type="date"
                                    value={scheduledDate}
                                    onChange={(e) => setScheduledDate(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="schedule-time" className="text-sm">Time</Label>
                                <Input
                                    id="schedule-time"
                                    type="time"
                                    value={scheduledTime}
                                    onChange={(e) => setScheduledTime(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-4 border-t bg-muted/20">
                    <div className="text-sm text-muted-foreground">
                        {scheduledDate && scheduledTime && (
                            <>
                                Scheduled for {new Date(`${scheduledDate}T${scheduledTime}`).toLocaleString()}
                            </>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={onClose}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSchedule}
                            disabled={!content.trim() || !scheduledDate || !scheduledTime}
                            className="gap-2"
                        >
                            <Send className="w-4 h-4" />
                            Schedule
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Pinned Messages Display Component
interface PinnedMessagesProps {
    pinnedMessages: Array<{
        id: string;
        content: string;
        user: {
            name: string;
            avatar?: string;
        };
        timestamp: Date;
    }>;
    onUnpin?: (messageId: string) => void;
    onJumpToMessage?: (messageId: string) => void;
    className?: string;
}

export function PinnedMessages({
    pinnedMessages,
    onUnpin,
    onJumpToMessage,
    className
}: PinnedMessagesProps) {
    if (pinnedMessages.length === 0) return null;

    return (
        <ComponentErrorBoundary componentName="Pinned Messages">
            <div className={cn(
                "border-b bg-orange-50 dark:bg-orange-950/20 p-3",
                className
            )}>
                <div className="flex items-center gap-2 mb-2">
                    <Pin className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                        Pinned Messages ({pinnedMessages.length})
                    </span>
                </div>

                <div className="space-y-2 max-h-32 overflow-y-auto">
                    {pinnedMessages.map((message) => (
                        <div
                            key={message.id}
                            className="flex items-start gap-2 p-2 bg-background/50 rounded-md hover:bg-background/80 transition-colors cursor-pointer"
                            onClick={() => onJumpToMessage?.(message.id)}
                        >
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">
                                    {message.user.name}
                                </div>
                                <div className="text-sm text-muted-foreground truncate">
                                    {message.content}
                                </div>
                            </div>

                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onUnpin?.(message.id);
                                }}
                                className="w-6 h-6 p-0 text-orange-500 hover:text-orange-600"
                            >
                                <PinOff className="w-3 h-3" />
                            </Button>
                        </div>
                    ))}
                </div>
            </div>
        </ComponentErrorBoundary>
    );
}

// Scheduled Messages Display Component
interface ScheduledMessagesProps {
    scheduledMessages: Array<{
        id: string;
        content: string;
        scheduledFor: Date;
        status: 'pending' | 'sent' | 'failed';
    }>;
    onCancel?: (messageId: string) => void;
    onEdit?: (messageId: string) => void;
    className?: string;
}

export function ScheduledMessages({
    scheduledMessages,
    onCancel,
    onEdit,
    className
}: ScheduledMessagesProps) {
    const pendingMessages = scheduledMessages.filter(msg => msg.status === 'pending');

    if (pendingMessages.length === 0) return null;

    return (
        <ComponentErrorBoundary componentName="Scheduled Messages">
            <div className={cn(
                "border-b bg-blue-50 dark:bg-blue-950/20 p-3",
                className
            )}>
                <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                        Scheduled Messages ({pendingMessages.length})
                    </span>
                </div>

                <div className="space-y-2 max-h-32 overflow-y-auto">
                    {pendingMessages.map((message) => (
                        <div
                            key={message.id}
                            className="flex items-start gap-2 p-2 bg-background/50 rounded-md"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="text-sm truncate">
                                    {message.content}
                                </div>
                                <div className="text-xs text-blue-600 dark:text-blue-400">
                                    Sending {message.scheduledFor.toLocaleString()}
                                </div>
                            </div>

                            <div className="flex gap-1">
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => onEdit?.(message.id)}
                                    className="w-6 h-6 p-0 text-blue-500"
                                    title="Edit"
                                >
                                    <Calendar className="w-3 h-3" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => onCancel?.(message.id)}
                                    className="w-6 h-6 p-0 text-destructive"
                                    title="Cancel"
                                >
                                    <X className="w-3 h-3" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </ComponentErrorBoundary>
    );
}