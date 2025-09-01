"use client";

import { Button } from "@/components/ui/button";
import { Bookmark, Home, User, Settings } from "lucide-react";
import Link from "next/link";
import MessagesButton from "./MessagesButton";
import NotificationsButton from "./NotificationsButton";
import ProfileLink from "./ProfileLink";

interface MenuBarClientProps {
  className?: string;
  unreadNotificationsCount: number;
  unreadMessagesCount: number;
}

export default function MenuBarClient({
  className,
  unreadNotificationsCount,
  unreadMessagesCount,
}: MenuBarClientProps) {
  return (
    <div className={className}>
      <Button
        variant="ghost"
        className="flex items-center justify-start gap-3"
        title="Home"
        asChild
      >
        <Link href="/">
          <Home />
          <span className="hidden lg:inline">Home</span>
        </Link>
      </Button>
      <NotificationsButton
        initialState={{ unreadCount: unreadNotificationsCount }}
      />
      <MessagesButton 
        initialState={{ unreadCount: unreadMessagesCount }} 
      />
      <Button
        variant="ghost"
        className="flex items-center justify-start gap-3"
        title="Bookmarks"
        asChild
      >
        <Link href="/bookmarks">
          <Bookmark />
          <span className="hidden lg:inline">Bookmarks</span>
        </Link>
      </Button>
      <ProfileLink />
      <Button
        variant="ghost"
        className="flex items-center justify-start gap-3"
        title="Settings"
        asChild
      >
        <Link href="/settings">
          <Settings />
          <span className="hidden lg:inline">Settings</span>
        </Link>
      </Button>
    </div>
  );
}