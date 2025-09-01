"use client";

import { Button } from "@/components/ui/button";
import kyInstance from "@/lib/ky";
import { NotificationCountInfo } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import Link from "next/link";

interface NotificationsButtonProps {
    initialState: NotificationCountInfo;
}

export default function NotificationsButton({
    initialState,
}: NotificationsButtonProps) {
    const { data } = useQuery({
        queryKey: ["unread-notification-count"],
        queryFn: () =>
            kyInstance
                .get("/api/notifications/unread-count")
                .json<NotificationCountInfo>(),
        initialData: initialState,
        refetchInterval: 60 * 1000,
    });

    return (
        <Button
            variant="ghost"
            className="flex items-center justify-start gap-3 relative"
            title="Notifications"
            asChild
        >
            <Link href="/notifications">
                <div className="relative">
                    <Bell />
                    {!!data.unreadCount && (
                        <span className="absolute -right-1 -top-1 flex min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-bold tabular-nums text-white shadow-lg">
                            {data.unreadCount > 99 ? "99+" : data.unreadCount}
                        </span>
                    )}
                </div>
                <span className="hidden lg:inline">Notifications</span>
            </Link>
        </Button>
    );
}