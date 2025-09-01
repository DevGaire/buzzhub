"use client";

import { Button } from "@/components/ui/button";
import kyInstance from "@/lib/ky";
import { MessageCountInfo, NotificationCountInfo } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import { Bell, Bookmark, Home, Mail } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  initialMessageCount: MessageCountInfo;
  initialNotificationCount: NotificationCountInfo;
}

export default function MobileNav({ 
  initialMessageCount, 
  initialNotificationCount 
}: MobileNavProps) {
  const pathname = usePathname();

  const { data: messageData } = useQuery({
    queryKey: ["unread-messages-count"],
    queryFn: () =>
      kyInstance.get("/api/messages/unread-count").json<MessageCountInfo>(),
    initialData: initialMessageCount,
    refetchInterval: 60 * 1000,
  });

  const { data: notificationData } = useQuery({
    queryKey: ["unread-notifications-count"],
    queryFn: () =>
      kyInstance
        .get("/api/notifications/unread-count")
        .json<NotificationCountInfo>(),
    initialData: initialNotificationCount,
    refetchInterval: 60 * 1000,
  });

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 border-t bg-card md:hidden">
      <div className="flex items-center justify-around py-2">
        <Link href="/">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "relative",
              pathname === "/" && "text-primary"
            )}
          >
            <Home className="size-5" />
          </Button>
        </Link>

        <Link href="/notifications">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "relative",
              pathname === "/notifications" && "text-primary"
            )}
          >
            <Bell className="size-5" />
            {!!notificationData.unreadCount && (
              <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                {notificationData.unreadCount > 9 ? "9+" : notificationData.unreadCount}
              </span>
            )}
          </Button>
        </Link>

        <Link href="/messages">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "relative",
              pathname === "/messages" && "text-primary"
            )}
          >
            <Mail className="size-5" />
            {!!messageData.unreadCount && (
              <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-green-500 text-xs font-bold text-white animate-pulse">
                {messageData.unreadCount > 9 ? "9+" : messageData.unreadCount}
              </span>
            )}
          </Button>
        </Link>

        <Link href="/bookmarks">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "relative",
              pathname === "/bookmarks" && "text-primary"
            )}
          >
            <Bookmark className="size-5" />
          </Button>
        </Link>
      </div>
    </nav>
  );
}