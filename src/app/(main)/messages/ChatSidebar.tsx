import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { MailPlus, Users2, MessagesSquare, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
    ChannelList,
    ChannelPreviewMessenger,
    ChannelPreviewUIComponentProps,
    useChatContext,
} from "stream-chat-react";
import { useSession } from "../SessionProvider";
import NewChatDialog from "./NewChatDialog";
import PeopleList from "./PeopleList";
import NotesBar from "./NotesBar";

interface ChatSidebarProps {
    open: boolean;
    onClose: () => void;
}

export default function ChatSidebar({ open, onClose }: ChatSidebarProps) {
    const { user } = useSession();

    const queryClient = useQueryClient();

    const { channel } = useChatContext();

    useEffect(() => {
        if (channel?.id) {
            queryClient.invalidateQueries({ queryKey: ["unread-messages-count"] });
        }
    }, [channel?.id, queryClient]);

    const ChannelPreviewCustom = (props: ChannelPreviewUIComponentProps) => {
        const [hasDraft, setHasDraft] = useState(false);
        const channelId = props.channel?.id;

        // Initial check and listen for changes across tabs
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

        // Same-tab updates (typing) won't trigger storage event; re-check on focus
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

        return (
            <div className="relative">
                <ChannelPreviewMessenger
                    {...props}
                    onSelect={() => {
                        props.setActiveChannel?.(props.channel, props.watchers);
                        onClose();
                    }}
                />
                {hasDraft && (
                    <span
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-yellow-500/30 bg-yellow-500/20 px-2 py-0.5 text-[10px] font-semibold text-yellow-300"
                        title="Unsent draft"
                    >
                        Draft
                    </span>
                )}
            </div>
        );
    };

    const [tab, setTab] = useState<"channels" | "people">("channels");

    return (
        <div
            className={cn(
                "size-full flex-col border-e md:flex md:w-72 compact-sidebar",
                open ? "flex" : "hidden",
            )}
        >
            <MenuHeader onClose={onClose} />
            <div className="flex gap-1 px-3 pb-2">
                <Button variant={tab === "channels" ? "secondary" : "ghost"} size="sm" onClick={() => setTab("channels")} title="Channels" className="text-xs h-7">
                    <MessagesSquare className="mr-1 size-3" /> Chats
                </Button>
                <Button variant={tab === "people" ? "secondary" : "ghost"} size="sm" onClick={() => setTab("people")} title="People" className="text-xs h-7">
                    <Users2 className="mr-1 size-3" /> People
                </Button>
            </div>
            {tab === "channels" ? (
                <>
                    <NotesBar />
                    <div className="compact-channel-list">
                        <ChannelList
                            filters={{
                                type: "messaging",
                                members: { $in: [user.id] },
                            }}
                            showChannelSearch
                            options={{ state: true, presence: true, limit: 12 }}
                            sort={{ last_message_at: -1 }}
                            additionalChannelSearchProps={{
                                searchForChannels: true,
                                searchQueryParams: {
                                    channelFilters: {
                                        filters: { members: { $in: [user.id] } },
                                    },
                                },
                            }}
                            Preview={ChannelPreviewCustom}
                        />
                    </div>
                </>
            ) : (
                <PeopleList onPicked={onClose} />
            )}
        </div>
    );
}

interface MenuHeaderProps {
    onClose: () => void;
}

function MenuHeader({ onClose }: MenuHeaderProps) {
    const [showNewChatDialog, setShowNewChatDialog] = useState(false);

    return (
        <>
            <div className="flex items-center gap-3 p-2">
                <div className="h-full md:hidden">
                    <Button size="icon" variant="ghost" onClick={onClose}>
                        <X className="size-5" />
                    </Button>
                </div>
                <h1 className="me-auto text-xl font-bold md:ms-2">Messages</h1>
                <Button
                    size="icon"
                    variant="ghost"
                    title="Start new chat"
                    onClick={() => setShowNewChatDialog(true)}
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