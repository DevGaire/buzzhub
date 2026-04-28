"use client";

import kyInstance from "@/lib/ky";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Loader2, MessageCirclePlus, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { RecentConversation } from "@/app/api/messages/recent/route";
import type { UserData } from "@/lib/types";
import FollowButton from "./FollowButton";

/* ── Online dot ──────────────────────────────────────── */
function OnlineDot({ online }: { online: boolean }) {
  return (
    <span
      className={cn(
        "absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-card",
        online ? "bg-green-500" : "bg-muted-foreground/40",
      )}
    />
  );
}

/* ── Avatar with initials fallback ──────────────────── */
function Avatar({
  src,
  name,
  size = 40,
  online,
  colorClass,
}: {
  src?: string | null;
  name: string;
  size?: number;
  online?: boolean;
  colorClass?: string;
}) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {src ? (
        <Image
          src={src}
          alt={name}
          width={size}
          height={size}
          className="rounded-full object-cover"
          style={{ width: size, height: size }}
        />
      ) : (
        <div
          className={cn(
            "flex items-center justify-center rounded-full text-white font-semibold",
            colorClass ?? "bg-primary",
          )}
          style={{ width: size, height: size, fontSize: size * 0.35 }}
        >
          {initials}
        </div>
      )}
      {online !== undefined && <OnlineDot online={online} />}
    </div>
  );
}

/* ── Message item ────────────────────────────────────── */
function MessageItem({ conv }: { conv: RecentConversation }) {
  if (!conv.otherUser) return null;

  return (
    <Link href="/messages" className="flex items-center gap-3 rounded-xl p-2 hover:bg-secondary/60 transition-colors">
      <Avatar
        src={conv.otherUser.image}
        name={conv.otherUser.name}
        size={42}
        online={conv.otherUser.online}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <span className="truncate text-sm font-semibold leading-tight">
            {conv.otherUser.name}
          </span>
          {conv.lastMessageTime && (
            <span className="flex-shrink-0 text-[11px] text-muted-foreground">
              {conv.lastMessageTime}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-1 mt-0.5">
          <span className="truncate text-xs text-muted-foreground leading-tight">
            {conv.lastMessage ?? "Start a conversation"}
          </span>
          {conv.unreadCount > 0 && (
            <span className="flex-shrink-0 flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
              {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ── Messages section (fetches from API) ─────────────── */
function MessagesSection() {
  const { data, isLoading } = useQuery({
    queryKey: ["recent-conversations"],
    queryFn: () =>
      kyInstance
        .get("/api/messages/recent")
        .json<{ conversations: RecentConversation[] }>(),
    refetchInterval: 30 * 1000,
  });

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-bold text-base">Message</h2>
        <Link
          href="/messages"
          className="text-xs font-semibold text-orange-500 hover:text-orange-600"
        >
          See All
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : !data?.conversations.length ? (
        <p className="py-4 text-center text-xs text-muted-foreground">
          No conversations yet
        </p>
      ) : (
        <div className="space-y-0.5">
          {data.conversations.map((conv) => (
            <MessageItem key={conv.id} conv={conv} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Group / Suggestions section ────────────────────── */
const GROUP_COLORS = [
  "bg-orange-500",
  "bg-teal-500",
  "bg-violet-500",
  "bg-blue-500",
  "bg-rose-500",
];

interface SuggestionsSectionProps {
  users: UserData[];
  currentUserId: string;
}

function SuggestionsSection({ users, currentUserId }: SuggestionsSectionProps) {
  if (!users.length) return null;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-bold text-base">Suggestions</h2>
        <Link
          href="/explore"
          className="text-xs font-semibold text-orange-500 hover:text-orange-600"
        >
          See All
        </Link>
      </div>
      <div className="space-y-3">
        {users.map((u, i) => (
          <div key={u.id} className="flex items-center gap-3 rounded-xl p-2 hover:bg-secondary/60 transition-colors">
            <Link href={`/users/${u.username}`}>
              <Avatar
                src={u.avatarUrl}
                name={u.displayName}
                size={40}
                colorClass={GROUP_COLORS[i % GROUP_COLORS.length]}
              />
            </Link>
            <div className="min-w-0 flex-1">
              <Link href={`/users/${u.username}`}>
                <p className="truncate text-sm font-semibold hover:underline">
                  {u.displayName}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  @{u.username}
                </p>
              </Link>
            </div>
            <FollowButton
              userId={u.id}
              initialState={{
                followers: u._count.followers,
                isFollowedByUser: u.followers.some(
                  ({ followerId }) => followerId === currentUserId,
                ),
              }}
            />
          </div>
        ))}
      </div>

      {/* Add Group (links to messages) */}
      <Link
        href="/messages"
        className="mt-3 flex items-center gap-2 rounded-xl border border-dashed border-border p-2.5 text-sm text-muted-foreground hover:bg-secondary/60 transition-colors"
      >
        <MessageCirclePlus className="size-4" />
        <span>New Message</span>
      </Link>
    </div>
  );
}

/* ── Main export ─────────────────────────────────────── */
interface RightPanelProps {
  users: UserData[];
  currentUserId: string;
}

export default function RightPanel({ users, currentUserId }: RightPanelProps) {
  const [search, setSearch] = useState("");

  return (
    <div className="rounded-2xl bg-card p-4 shadow-sm space-y-5">
      {/* Search */}
      <div className="relative">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search message/group"
          className="w-full rounded-xl border border-input bg-secondary/50 py-2 pl-3 pr-9 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/15 transition-all"
        />
        <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      </div>

      {/* Messages */}
      <MessagesSection />

      {/* Divider */}
      <div className="h-px bg-border/60" />

      {/* Suggestions */}
      <SuggestionsSection users={users} currentUserId={currentUserId} />
    </div>
  );
}
