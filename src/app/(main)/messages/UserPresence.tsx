"use client";

import { ComponentErrorBoundary } from "@/components/ErrorBoundary";
import UserAvatar from "@/components/UserAvatar";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useChatContext } from "stream-chat-react";

export type PresenceStatus = "online" | "away" | "busy" | "offline";

interface UserPresenceProps {
    userId: string;
    showStatus?: boolean;
    showLastSeen?: boolean;
    size?: "sm" | "md" | "lg";
    className?: string;
}

interface PresenceData {
    status: PresenceStatus;
    lastSeen?: Date;
    isTyping?: boolean;
}

export default function UserPresence({
    userId,
    showStatus = true,
    showLastSeen = false,
    size = "md",
    className
}: UserPresenceProps) {
    const { client } = useChatContext();
    const [presence, setPresence] = useState<PresenceData>({
        status: "offline"
    });

    useEffect(() => {
        if (!client || !userId) return;

        // Get initial presence
        const updatePresence = () => {
            const user = client.state.users[userId];
            if (user) {
                const isOnline = user.online;
                const lastActive = user.last_active ? new Date(user.last_active) : undefined;

                setPresence({
                    status: isOnline ? "online" : "offline",
                    lastSeen: lastActive,
                });
            }
        };

        updatePresence();

        // Listen for presence changes
        const handleUserPresence = (event: any) => {
            if (event.user?.id === userId) {
                updatePresence();
            }
        };

        client.on('user.presence.changed', handleUserPresence);
        client.on('user.updated', handleUserPresence);

        return () => {
            client.off('user.presence.changed', handleUserPresence);
            client.off('user.updated', handleUserPresence);
        };
    }, [client, userId]);

    const getStatusColor = (status: PresenceStatus): string => {
        switch (status) {
            case "online":
                return "bg-green-500";
            case "away":
                return "bg-yellow-500";
            case "busy":
                return "bg-red-500";
            case "offline":
            default:
                return "bg-gray-400";
        }
    };

    const getStatusText = (status: PresenceStatus): string => {
        switch (status) {
            case "online":
                return "Active now";
            case "away":
                return "Away";
            case "busy":
                return "Busy";
            case "offline":
            default:
                return "Offline";
        }
    };

    const formatLastSeen = (date?: Date): string => {
        if (!date) return "Never";

        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString();
    };

    const sizeMap = {
        sm: { indicator: "w-1.5 h-1.5", text: "text-xs" },
        md: { indicator: "w-2 h-2", text: "text-xs" },
        lg: { indicator: "w-3 h-3", text: "text-sm" }
    };

    const sizes = sizeMap[size];

    return (
        <ComponentErrorBoundary componentName="User Presence">
            <div className={cn("flex items-center gap-1.5", className)}>
                {showStatus && (
                    <div className="relative">
                        <div
                            className={cn(
                                "rounded-full border border-background",
                                sizes.indicator,
                                getStatusColor(presence.status)
                            )}
                            title={getStatusText(presence.status)}
                        />
                    </div>
                )}

                <div className="flex flex-col">
                    {showStatus && (
                        <span className={cn("font-medium", sizes.text)}>
                            {getStatusText(presence.status)}
                        </span>
                    )}

                    {showLastSeen && presence.status === "offline" && (
                        <span className={cn("text-muted-foreground", sizes.text)}>
                            Last seen {formatLastSeen(presence.lastSeen)}
                        </span>
                    )}
                </div>
            </div>
        </ComponentErrorBoundary>
    );
}

// Enhanced avatar with presence indicator
interface PresenceAvatarProps {
    userId: string;
    avatarUrl?: string;
    size?: number;
    showPresence?: boolean;
    className?: string;
}

export function PresenceAvatar({
    userId,
    avatarUrl,
    size = 40,
    showPresence = true,
    className
}: PresenceAvatarProps) {
    const { client } = useChatContext();
    const [isOnline, setIsOnline] = useState(false);

    useEffect(() => {
        if (!client || !userId) return;

        const updateStatus = () => {
            const user = client.state.users[userId];
            setIsOnline(user?.online || false);
        };

        updateStatus();

        const handlePresenceChange = (event: any) => {
            if (event.user?.id === userId) {
                updateStatus();
            }
        };

        client.on('user.presence.changed', handlePresenceChange);
        client.on('user.updated', handlePresenceChange);

        return () => {
            client.off('user.presence.changed', handlePresenceChange);
            client.off('user.updated', handlePresenceChange);
        };
    }, [client, userId]);

    return (
        <div className={cn("relative", className)}>
            <UserAvatar avatarUrl={avatarUrl} size={size} />

            {showPresence && (
                <div
                    className={cn(
                        "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-background",
                        isOnline ? "bg-green-500" : "bg-gray-400"
                    )}
                    title={isOnline ? "Online" : "Offline"}
                />
            )}
        </div>
    );
}

// Channel member list with presence
interface ChannelMembersProps {
    channelId: string;
    className?: string;
}

export function ChannelMembers({ channelId, className }: ChannelMembersProps) {
    const { client, channel } = useChatContext();
    const [members, setMembers] = useState<any[]>([]);

    useEffect(() => {
        if (!channel || !client) return;

        const loadMembers = async () => {
            try {
                const response = await channel.queryMembers({});
                setMembers(response.members || []);
            } catch (error) {
                console.error('Failed to load channel members:', error);
            }
        };

        loadMembers();
    }, [channel, client]);

    if (members.length === 0) return null;

    return (
        <div className={cn("space-y-1.5", className)}>
            <h3 className="text-xs font-medium text-muted-foreground">
                Members ({members.length})
            </h3>

            <div className="space-y-0.5">
                {members.map((member) => (
                    <div key={member.user_id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted/50">
                        <PresenceAvatar
                            userId={member.user_id}
                            avatarUrl={member.user?.image}
                            size={28}
                        />

                        <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium truncate">
                                {member.user?.name || member.user_id}
                            </div>
                            <UserPresence
                                userId={member.user_id}
                                showLastSeen
                                size="sm"
                            />
                        </div>

                        {member.role && member.role !== 'member' && (
                            <div className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                {member.role}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

// Active users indicator for chat header
interface ActiveUsersProps {
    channelId: string;
    maxVisible?: number;
    className?: string;
}

export function ActiveUsers({ channelId, maxVisible = 3, className }: ActiveUsersProps) {
    const { client, channel } = useChatContext();
    const [activeUsers, setActiveUsers] = useState<any[]>([]);

    useEffect(() => {
        if (!channel || !client) return;

        const updateActiveUsers = () => {
            const members = Object.values(channel.state.members || {});
            const active = members
                .filter((member: any) => member.user?.online && member.user_id !== client.userID)
                .slice(0, maxVisible);

            setActiveUsers(active);
        };

        updateActiveUsers();

        // Listen for presence changes
        const handlePresenceChange = () => {
            updateActiveUsers();
        };

        client.on('user.presence.changed', handlePresenceChange);
        client.on('member.added', handlePresenceChange);
        client.on('member.removed', handlePresenceChange);

        return () => {
            client.off('user.presence.changed', handlePresenceChange);
            client.off('member.added', handlePresenceChange);
            client.off('member.removed', handlePresenceChange);
        };
    }, [channel, client, maxVisible]);

    if (activeUsers.length === 0) return null;

    return (
        <div className={cn("flex items-center gap-1", className)}>
            <div className="flex -space-x-1">
                {activeUsers.map((member: any) => (
                    <PresenceAvatar
                        key={member.user_id}
                        userId={member.user_id}
                        avatarUrl={member.user?.image}
                        size={20}
                        className="border border-background"
                    />
                ))}
            </div>

            <div className="text-xs text-muted-foreground ml-1">
                {activeUsers.length === 1
                    ? `${activeUsers[0].user?.name} is active`
                    : `${activeUsers.length} active`
                }
            </div>
        </div>
    );
}