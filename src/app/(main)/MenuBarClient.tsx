"use client";

import UserAvatar from "@/components/UserAvatar";
import { cn } from "@/lib/utils";
import {
  BadgeCheck,
  Bell,
  Bookmark,
  Compass,
  Home,
  Mail,
  Settings,
  User,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import MessagesButton from "./MessagesButton";
import NotificationsButton from "./NotificationsButton";

interface MenuBarClientProps {
  className?: string;
  user: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl: string | null;
  };
  unreadNotificationsCount: number;
  unreadMessagesCount: number;
}

interface NavItemProps {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
}

function NavItem({ href, icon: Icon, label, active }: NavItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
        active
          ? "bg-primary/10 text-primary border-l-[3px] border-primary rounded-l-none pl-[calc(0.75rem-3px)]"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
      )}
    >
      <Icon className="size-[18px] flex-shrink-0" />
      <span className="hidden lg:block">{label}</span>
    </Link>
  );
}

export default function MenuBarClient({
  className,
  user,
  unreadNotificationsCount,
  unreadMessagesCount,
}: MenuBarClientProps) {
  const pathname = usePathname();

  const isMobileBar = className?.includes("justify-around");

  /* ── Mobile bottom bar ──────────────────────────────── */
  if (isMobileBar) {
    return (
      <div className={className}>
        <Link href="/" className={cn("flex flex-col items-center gap-0.5 p-2 rounded-xl", pathname === "/" ? "text-primary" : "text-muted-foreground")}>
          <Home className="size-5" />
        </Link>
        <NotificationsButton initialState={{ unreadCount: unreadNotificationsCount }} mobileOnly />
        <MessagesButton initialState={{ unreadCount: unreadMessagesCount }} mobileOnly />
        <Link href="/bookmarks" className={cn("flex flex-col items-center gap-0.5 p-2 rounded-xl", pathname === "/bookmarks" ? "text-primary" : "text-muted-foreground")}>
          <Bookmark className="size-5" />
        </Link>
        <Link href="/my-profile" className={cn("flex flex-col items-center gap-0.5 p-2 rounded-xl", pathname === "/my-profile" ? "text-primary" : "text-muted-foreground")}>
          <User className="size-5" />
        </Link>
      </div>
    );
  }

  /* ── Desktop left sidebar ───────────────────────────── */
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {/* Profile card */}
      <Link
        href="/my-profile"
        className="flex items-center gap-3 rounded-xl p-3 mb-2 hover:bg-secondary transition-colors"
      >
        <UserAvatar avatarUrl={user.avatarUrl} size={44} className="flex-shrink-0" showOnline />
        <div className="hidden lg:block min-w-0">
          <p className="font-semibold text-sm leading-tight truncate">{user.displayName}</p>
          <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
        </div>
      </Link>

      <div className="h-px bg-border/60 mb-2" />

      {/* Nav items */}
      <NavItem href="/" icon={Home} label="Feed" active={pathname === "/"} />
      <NotificationsButton
        initialState={{ unreadCount: unreadNotificationsCount }}
        pathname={pathname}
      />
      <MessagesButton
        initialState={{ unreadCount: unreadMessagesCount }}
        pathname={pathname}
      />
      <NavItem href="/bookmarks" icon={Bookmark} label="Bookmarks" active={pathname === "/bookmarks"} />
      <NavItem href="/my-profile" icon={User} label="Profile" active={pathname === "/my-profile"} />
      <NavItem href="/explore" icon={Compass} label="Explore" active={pathname === "/explore"} />
      <NavItem href="/verified-badge" icon={BadgeCheck} label="Get Verified" active={pathname === "/verified-badge"} />
      <NavItem href="/settings" icon={Settings} label="Settings" active={pathname === "/settings"} />
    </div>
  );
}
