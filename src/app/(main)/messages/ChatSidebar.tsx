import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { MailPlus, X, Search } from "lucide-react";
import { useEffect, useState } from "react";
import {
    ChannelList,
    ChannelPreviewUIComponentProps,
    useChatContext,
} from "stream-chat-react";
import { useSession } from "../SessionProvider";
import NewChatDialog from "./NewChatDialog";
import NotesBar from "./NotesBar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ChatSidebarProps {
    open: boolean;
    onClose: () => void;
}

export default function ChatSidebar({ open, onClose }: ChatSidebarProps) {
    const { user } = useSession();
    const queryClient = useQueryClient();
    const { channel, client } = useChatContext();

    useEffect(() => {
        if (channel?.id) {
            queryClient.invalidateQueries({ queryKey: ["unread-messages-count"] });
        }
    }, [channel?.id, queryClient]);

    // Custom channel preview with modern styling
    const ChannelPreviewCustom = (props: ChannelPreviewUIComponentProps) => {
        const [hasDraft, setHasDraft] = useState(false);
        const channelId = props.channel?.id;
        const isActive = channel?.id === channelId;

        // Get channel info
        const members = Object.values(props.channel?.state?.members || {});
        const otherMembers = members.filter(m => m.user_id !== client.userID);
        const isOneOnOne = otherMembers.length === 1;

        const channelName = props.channel?.data?.name ||
            (isOneOnOne ? otherMembers[0]?.user?.name : 'Group Chat');
        const channelImage = props.channel?.data?.image ||
            (isOneOnOne ? otherMembers[0]?.user?.image : undefined);
        const isOnline = isOneOnOne && otherMembers[0]?.user?.online;

        // Get last message preview
        const lastMessage = props.lastMessage;
        const lastMessageText = lastMessage?.text ||
            (lastMessage?.attachments?.length ? 'Sent an attachment' : '');
        const unreadCount = props.unread || 0;

        // Draft detection
        useEffect(() => {
            if (!channelId) return;
            try {
                const saved = localStorage.getItem(`chat-draft:${channelId}`);
                setHasDraft(!!saved && saved.trim().length > 0);
            } catch {}

            const onStorage = (e: StorageEvent) => {
                if (e.key === `chat-draft:${channelId}`) {
                    setHasDraft(!!e.newValue && e.newValue.trim().length > 0);
                }
            };
            window.addEventListener("storage", onStorage);
            return () => window.removeEventListener("storage", onStorage);
        }, [channelId]);

        useEffect(() => {
            const onFocus = () => {
                if (!channelId) return;
                try {
                    const saved = localStorage.getItem(`chat-draft:${channelId}`);
                    setHasDraft(!!saved && saved.trim().length > 0);
                } catch {}
            };
            window.addEventListener("focus", onFocus);
            return () => window.removeEventListener("focus", onFocus);
        }, [channelId]);

        // Format time
        const formatTime = (date?: Date | string) => {
            if (!date) return '';
            const d = new Date(date);
            const now = new Date();
            const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);

            if (diffDays === 0) {
                return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
            } else if (diffDays === 1) {
                return 'Yesterday';
            } else if (diffDays < 7) {
                return d.toLocaleDateString('en-US', { weekday: 'short' });
            } else {
                return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }
        };

        return (
            <button
                className={cn(
                    "w-full flex items-center gap-2.5 px-2 py-1.5 mb-0.5 rounded transition-colors duration-100 text-left",
                    isActive
                        ? "bg-black/[0.08] dark:bg-white/[0.10] text-zinc-900 dark:text-white"
                        : "text-zinc-700 dark:text-[#b5bac1] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:text-zinc-900 dark:hover:text-white"
                )}
                onClick={() => {
                    props.setActiveChannel?.(props.channel, props.watchers);
                    onClose();
                }}
            >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={channelImage} className="object-cover" />
                        <AvatarFallback className="bg-[#5865f2] text-white text-xs font-semibold">
                            {channelName?.[0]?.toUpperCase() || '?'}
                        </AvatarFallback>
                    </Avatar>
                    {isOnline && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#23a55a] border-2 border-[#f2f3f5] dark:border-[#2b2d31] rounded-full" />
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <span className={cn(
                            "text-[14px] truncate leading-tight",
                            unreadCount > 0 ? "font-semibold" : "font-medium"
                        )}>
                            {channelName}
                        </span>
                        {unreadCount > 0 && (
                            <span className="flex-shrink-0 inline-flex min-w-[16px] h-[16px] px-1 items-center justify-center rounded-full bg-[#f23f43] text-[10px] font-bold text-white">
                                {unreadCount > 9 ? "9+" : unreadCount}
                            </span>
                        )}
                    </div>
                    {(hasDraft || lastMessageText) && (
                        <p className={cn(
                            "text-[12px] truncate leading-tight mt-0.5",
                            unreadCount > 0
                                ? "text-zinc-700 dark:text-zinc-300"
                                : "text-zinc-500 dark:text-zinc-400"
                        )}>
                            {hasDraft && <span className="text-[#5865f2]">Draft: </span>}
                            {lastMessageText || 'No messages yet'}
                            {lastMessage?.created_at && (
                                <span className="ml-1 opacity-60">· {formatTime(lastMessage.created_at)}</span>
                            )}
                        </p>
                    )}
                </div>
            </button>
        );
    };

    const [search, setSearch] = useState("");

    const channelFilter = (() => {
        const base = {
            type: "messaging" as const,
            members: { $in: [user.id] },
        } as Record<string, unknown>;
        const q = search.trim();
        if (q.length > 0) {
            base.name = { $autocomplete: q };
        }
        return base;
    })();

    return (
        <div
            className={cn(
                "h-full flex-col md:flex overflow-hidden",
                "bg-[#f2f3f5] dark:bg-[#2b2d31]",
                "border-r border-black/[0.06] dark:border-black/40",
                "w-full md:w-[260px] lg:w-[280px] flex-shrink-0",
                open ? "flex absolute md:relative inset-0 z-50 md:z-auto" : "hidden",
            )}
        >
            <MenuHeader onClose={onClose} />

            {/* Search */}
            <div className="px-2 pb-2">
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-zinc-500 dark:text-zinc-400" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Find a conversation"
                        className="w-full h-7 pl-8 pr-7 rounded bg-[#e3e5e8] dark:bg-[#1e1f22] text-[13px] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-400 outline-none focus:ring-1 focus:ring-[#5865f2] transition-shadow"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch("")}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10"
                        >
                            <X className="size-3 text-zinc-500 dark:text-zinc-400" />
                        </button>
                    )}
                </div>
            </div>

            <NotesBar />

            <div className="px-3 pt-2 pb-1 flex items-center justify-between">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Direct Messages
                </h3>
            </div>

            <div className="flex-1 overflow-y-auto px-1.5 scrollbar-thin scrollbar-thumb-black/10 dark:scrollbar-thumb-white/10 scrollbar-track-transparent">
                <ChannelList
                    key={search ? `search-${search}` : "all"}
                    filters={channelFilter as any}
                    options={{ state: true, presence: true, limit: 20 }}
                    sort={{ last_message_at: -1 }}
                    Preview={ChannelPreviewCustom}
                />
            </div>
        </div>
    );
}

interface MenuHeaderProps {
    onClose: () => void;
}

function MenuHeader({ onClose }: MenuHeaderProps) {
    const [showNewChatDialog, setShowNewChatDialog] = useState(false);
    const { user } = useSession();

    return (
        <>
            <div className="flex items-center justify-between h-12 px-3 border-b border-black/[0.06] dark:border-black/40 shadow-sm flex-shrink-0">
                <div className="flex items-center gap-1 min-w-0">
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={onClose}
                        className="md:hidden h-7 w-7 text-zinc-700 dark:text-[#b5bac1] hover:text-zinc-900 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] rounded"
                    >
                        <X className="size-4" />
                    </Button>
                    <h1 className="text-[15px] font-semibold text-zinc-900 dark:text-white tracking-tight truncate">
                        {user.displayName || user.username}
                    </h1>
                </div>
                <Button
                    size="icon"
                    variant="ghost"
                    title="New message"
                    onClick={() => setShowNewChatDialog(true)}
                    className="h-7 w-7 text-zinc-700 dark:text-[#b5bac1] hover:text-zinc-900 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] rounded"
                >
                    <MailPlus className="size-4" />
                </Button>
            </div>
            {showNewChatDialog && (
                <NewChatDialog
                    onOpenChange={setShowNewChatDialog}
                    onChatCreated={() => {
                        setShowNewChatDialog(false);
                        onClose();
                    }}
                />
            )}
        </>
    );
}
