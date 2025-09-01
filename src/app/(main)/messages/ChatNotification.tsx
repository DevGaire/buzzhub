"use client";

import { ComponentErrorBoundary } from "@/components/ErrorBoundary";
import UserAvatar from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { X, MessageCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useChatContext } from "stream-chat-react";
import { toast } from "@/components/ui/use-toast";

interface ChatNotificationProps {
    className?: string;
    autoHide?: boolean;
    duration?: number;
}

interface NewMessageNotification {
    id: string;
    channelId: string;
    channelName?: string;
    senderName: string;
    senderAvatar?: string;
    message: string;
    timestamp: Date;
}

export default function ChatNotification({
    className,
    autoHide = true,
    duration = 4000
}: ChatNotificationProps) {
    const { client } = useChatContext();
    const [notifications, setNotifications] = useState<NewMessageNotification[]>([]);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (!client) return;

        const handleNewMessage = (event: any) => {
            const { message, channel } = event;

            // Don't show notification if user sent the message
            if (message.user?.id === client.userID) return;

            // Don't show if channel is currently active (user is viewing it)
            if (document.hasFocus() && window.location.pathname.includes('/messages')) return;

            const notification: NewMessageNotification = {
                id: message.id,
                channelId: channel.id,
                channelName: channel.data?.name || channel.data?.members?.find((m: any) => m.user?.id !== client.userID)?.user?.name || 'Unknown',
                senderName: message.user?.name || message.user?.username || 'Someone',
                senderAvatar: message.user?.image,
                message: message.text || 'Sent an attachment',
                timestamp: new Date(message.created_at)
            };

            setNotifications(prev => [notification, ...prev.slice(0, 2)]); // Keep max 3 notifications
            setIsVisible(true);

            // Show toast notification as well
            toast({
                title: `New message from ${notification.senderName}`,
                description: notification.message.length > 50
                    ? notification.message.substring(0, 50) + '...'
                    : notification.message,
                duration: 3000,
            });

            // Auto-hide if enabled
            if (autoHide) {
                setTimeout(() => {
                    setIsVisible(false);
                    setTimeout(() => {
                        setNotifications(prev => prev.filter(n => n.id !== notification.id));
                    }, 300);
                }, duration);
            }
        };

        client.on('message.new', handleNewMessage);

        return () => {
            client.off('message.new', handleNewMessage);
        };
    }, [client, autoHide, duration]);

    const handleDismiss = (notificationId: string) => {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        if (notifications.length <= 1) {
            setIsVisible(false);
        }
    };

    const handleDismissAll = () => {
        setIsVisible(false);
        setTimeout(() => {
            setNotifications([]);
        }, 300);
    };

    if (!isVisible || notifications.length === 0) return null;

    return (
        <ComponentErrorBoundary componentName="Chat Notification">
            <div className={cn(
                "fixed top-4 right-4 z-50 space-y-2 max-w-sm",
                "transform transition-all duration-300 ease-out",
                isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0",
                className
            )}>
                {notifications.map((notification, index) => (
                    <InstagramStyleNotification
                        key={notification.id}
                        notification={notification}
                        onDismiss={() => handleDismiss(notification.id)}
                        delay={index * 100}
                    />
                ))}

                {notifications.length > 1 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDismissAll}
                        className="w-full text-xs"
                    >
                        Dismiss all
                    </Button>
                )}
            </div>
        </ComponentErrorBoundary>
    );
}

interface InstagramStyleNotificationProps {
    notification: NewMessageNotification;
    onDismiss: () => void;
    delay?: number;
}

function InstagramStyleNotification({
    notification,
    onDismiss,
    delay = 0
}: InstagramStyleNotificationProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(true);
        }, delay);

        return () => clearTimeout(timer);
    }, [delay]);

    const formatTime = (date: Date) => {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'now';
        if (diffMins < 60) return `${diffMins}m`;

        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    return (
        <div className={cn(
            "bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700",
            "transform transition-all duration-300 ease-out",
            "hover:scale-105 hover:shadow-xl cursor-pointer",
            isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
        )}>
            <div className="p-3">
                <div className="flex items-start gap-3">
                    <div className="relative">
                        <UserAvatar
                            avatarUrl={notification.senderAvatar}
                            size={36}
                            className="border-2 border-white dark:border-gray-800"
                        />
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-sm truncate">
                                    {notification.senderName}
                                </h4>
                                <div className="flex items-center gap-1">
                                    <MessageCircle className="w-3 h-3 text-blue-500" />
                                    <span className="text-xs text-blue-500">
                                        {formatTime(notification.timestamp)}
                                    </span>
                                </div>
                            </div>

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDismiss();
                                }}
                                className="w-6 h-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                                <X className="w-3 h-3" />
                            </Button>
                        </div>

                        <p className="text-xs text-muted-foreground line-clamp-2">
                            {notification.message}
                        </p>

                        {notification.channelName && (
                            <div className="mt-1 text-xs text-muted-foreground/70">
                                in {notification.channelName}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Instagram-style gradient border */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 opacity-0 hover:opacity-20 transition-opacity duration-300 pointer-events-none" />
        </div>
    );
}

// Compact notification badge for chat header
interface ChatNotificationBadgeProps {
    unreadCount?: number;
    className?: string;
}

export function ChatNotificationBadge({ unreadCount = 0, className }: ChatNotificationBadgeProps) {
    if (unreadCount === 0) return null;

    return (
        <div className={cn(
            "absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white",
            "rounded-full flex items-center justify-center text-xs font-medium",
            "animate-pulse border-2 border-white dark:border-gray-900",
            className
        )}>
            {unreadCount > 99 ? '99+' : unreadCount}
        </div>
    );
}

// Typing notification for chat list
interface TypingNotificationProps {
    typingUsers: string[];
    className?: string;
}

export function TypingNotification({ typingUsers, className }: TypingNotificationProps) {
    if (typingUsers.length === 0) return null;

    const getTypingText = () => {
        if (typingUsers.length === 1) {
            return `${typingUsers[0]} is typing...`;
        } else if (typingUsers.length === 2) {
            return `${typingUsers[0]} and ${typingUsers[1]} are typing...`;
        } else {
            return `${typingUsers[0]} and ${typingUsers.length - 1} others are typing...`;
        }
    };

    return (
        <div className={cn(
            "flex items-center gap-2 text-xs text-green-500 animate-pulse",
            className
        )}>
            <div className="flex gap-1">
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
            <span className="truncate">{getTypingText()}</span>
        </div>
    );
}