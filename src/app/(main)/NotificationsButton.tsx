"use client";

import kyInstance from "@/lib/ky";
import { NotificationCountInfo } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import Link from "next/link";

interface NotificationsButtonProps {
  initialState: NotificationCountInfo;
  pathname?: string;
  mobileOnly?: boolean;
}

export default function NotificationsButton({
  initialState,
  pathname,
  mobileOnly,
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

  const active = pathname === "/notifications";

  if (mobileOnly) {
    return (
      <Link
        href="/notifications"
        className={cn(
          "relative flex flex-col items-center gap-0.5 p-2 rounded-xl",
          active ? "text-primary" : "text-muted-foreground",
        )}
      >
        <Bell className="size-5" />
        {!!data.unreadCount && (
          <span className="absolute right-0.5 top-0.5 flex min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 py-px text-[10px] font-bold text-white">
            {data.unreadCount > 99 ? "99+" : data.unreadCount}
          </span>
        )}
      </Link>
    );
  }

  return (
    <Link
      href="/notifications"
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
        active
          ? "bg-primary/10 text-primary border-l-[3px] border-primary rounded-l-none pl-[calc(0.75rem-3px)]"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
      )}
    >
      <div className="relative flex-shrink-0">
        <Bell className="size-[18px]" />
        {!!data.unreadCount && (
          <span className="absolute -right-1.5 -top-1.5 flex min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 py-px text-[10px] font-bold text-white">
            {data.unreadCount > 99 ? "99+" : data.unreadCount}
          </span>
        )}
      </div>
      <span className="hidden lg:block">Notifications</span>
    </Link>
  );
}
