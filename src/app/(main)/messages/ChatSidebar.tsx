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
                    "w-full flex items-center gap-3 px-3 py-2.5 mb-1 rounded-2xl transition-all duration-150",
                    "hover:bg-white/[0.05]",
                    isActive && "bg-gradient-to-r from-purple-600/30 to-purple-500/10 ring-1 ring-purple-500/30"
                )}
                onClick={() => {
                    props.setActiveChannel?.(props.channel, props.watchers);
                    onClose();
                }}
            >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                    <Avatar className="h-12 w-12">
                        <AvatarImage src={channelImage} className="object-cover" />
                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-base font-semibold">
                            {channelName?.[0]?.toUpperCase() || '?'}
                        </AvatarFallback>
                    </Avatar>
                    {isOnline && (
                        <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-500 border-[2.5px] border-[#1A1B27] rounded-full" />
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between gap-2">
                        <span className={cn(
                            "text-[14px] truncate",
                            unreadCount > 0 ? "font-semibold text-white" : "font-medium text-white"
                        )}>
                            {channelName}
                        </span>
                        <span className="text-[11px] text-white/40 flex-shrink-0">
                            {formatTime(lastMessage?.created_at)}
                        </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p className={cn(
                            "text-[12.5px] truncate",
                            unreadCount > 0 ? "text-white/75" : "text-white/45"
                        )}>
                            {hasDraft ? (
                                <span className="text-blue-400">Draft: </span>
                            ) : null}
                            {lastMessageText || 'No messages yet'}
                        </p>
                        {unreadCount > 0 && (
                            <span className="flex-shrink-0 inline-flex min-w-[20px] h-[20px] px-1.5 items-center justify-center rounded-full bg-pink-500 text-[10px] font-bold text-white">
                                {unreadCount > 9 ? "9+" : unreadCount}
                            </span>
                        )}
                    </div>
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
                "h-full flex-col rounded-2xl bg-[#1A1B27] border border-white/[0.04] md:flex overflow-hidden",
                "w-full md:w-[300px] lg:w-[320px] flex-shrink-0",
                open ? "flex absolute md:relative inset-0 z-50 md:z-auto" : "hidden",
            )}
        >
            <MenuHeader onClose={onClose} />

            {/* Search */}
            <div className="px-3 pb-2">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/40" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search"
                        className="w-full h-10 pl-9 pr-9 rounded-xl bg-[#0E0F18] border border-white/[0.04] text-sm text-white placeholder:text-white/40 outline-none focus:border-purple-500/40 transition-colors"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10"
                        >
                            <X className="size-3.5 text-white/50" />
                        </button>
                    )}
                </div>
            </div>

            <NotesBar />

            <div className="px-3 pt-1 pb-1.5">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                    Chats
                </h3>
            </div>

            <div className="flex-1 overflow-y-auto px-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
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
            <div className="flex items-center justify-between px-4 pt-4 pb-3">
                <div className="flex items-center gap-2 min-w-0">
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={onClose}
                        className="md:hidden h-8 w-8 text-white/70 hover:text-white hover:bg-white/10 rounded-full"
                    >
                        <X className="size-5" />
                    </Button>
                    <h1 className="text-base font-semibold text-white tracking-tight truncate">
                        {user.displayName || user.username}
                    </h1>
                </div>
                <Button
                    size="icon"
                    variant="ghost"
                    title="New message"
                    onClick={() => setShowNewChatDialog(true)}
                    className="h-9 w-9 text-white hover:bg-white/10 rounded-full"
                >
                    <MailPlus className="size-5" />
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
