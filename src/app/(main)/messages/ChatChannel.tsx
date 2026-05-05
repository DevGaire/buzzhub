"use client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Menu, Phone, Video, Info } from "lucide-react";
import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
const MessageSearch = dynamic(() => import("./MessageSearch"), { ssr: false });
import ConnectionStatus from "./ConnectionStatus";
import { useCallContext } from "./CallContext";
import { MessageInputTyping } from "./EnhancedTypingIndicator";
import ChatNotification from "./ChatNotification";
import { ComponentErrorBoundary } from "@/components/ErrorBoundary";
import {
    Channel,
    ChannelHeader,
    MessageList,
    Window,
    useChatContext,
    useChannelStateContext,
} from "stream-chat-react";
import CustomMessageInput from "./CustomMessageInput";
import CustomMessage, { ReplyContext } from "./CustomMessage";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ChatChannelProps {
    open: boolean;
    openSidebar: () => void;
    onToggleInfo?: () => void;
    infoOpen?: boolean;
}

// Custom Channel Header with Instagram-like design
function ModernChannelHeader({
    openSidebar,
    onToggleInfo,
    infoOpen,
}: {
    openSidebar: () => void;
    onToggleInfo?: () => void;
    infoOpen?: boolean;
}) {
    const { channel } = useChannelStateContext();
    const { client } = useChatContext();

    // Call context — isReady is false when video client is still loading
    const { startCall, isReady: callsReady } = useCallContext();

    if (!channel) return null;

    // Get channel info
    const members = Object.values(channel.state?.members || {});
    const otherMembers = members.filter(m => m.user_id !== client.userID);
    const isOneOnOne = otherMembers.length === 1;
    const otherUserId = isOneOnOne ? (otherMembers[0]?.user_id ?? "") : "";

    const channelName = channel.data?.name || (isOneOnOne ? otherMembers[0]?.user?.name : 'Group Chat');
    const channelImage = channel.data?.image || (isOneOnOne ? otherMembers[0]?.user?.image : undefined);
    const memberCount = members.length;

    // Get online status for 1:1 chats
    const isOnline = isOneOnOne && otherMembers[0]?.user?.online;

    const callsEnabled = isOneOnOne && callsReady;

    return (
        <div className="flex items-center justify-between h-12 px-3 border-b border-black/[0.06] dark:border-black/40 shadow-sm bg-white dark:bg-[#313338] flex-shrink-0">
            {/* Left side - Menu & User info */}
            <div className="flex items-center gap-2 min-w-0">
                <Button
                    size="icon"
                    variant="ghost"
                    onClick={openSidebar}
                    className="md:hidden h-7 w-7 text-zinc-700 dark:text-[#b5bac1] hover:text-zinc-900 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] rounded"
                >
                    <Menu className="size-4" />
                </Button>

                <div className="flex items-center gap-2 min-w-0">
                    <div className="relative flex-shrink-0">
                        <Avatar className="h-6 w-6">
                            <AvatarImage src={channelImage} className="object-cover" />
                            <AvatarFallback className="bg-[#5865f2] text-white font-semibold text-[10px]">
                                {channelName?.[0]?.toUpperCase() || '?'}
                            </AvatarFallback>
                        </Avatar>
                        {isOnline && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[#23a55a] border-2 border-white dark:border-[#313338] rounded-full" />
                        )}
                    </div>

                    <h2 className="font-semibold text-zinc-900 dark:text-white text-[15px] truncate">
                        {channelName}
                    </h2>
                    <span className="hidden sm:block h-4 w-px bg-black/[0.08] dark:bg-white/[0.08] mx-1 flex-shrink-0" />
                    <p className="hidden sm:block text-[12px] text-zinc-500 dark:text-zinc-400 truncate">
                        {isOneOnOne
                            ? (isOnline ? 'Online' : 'Offline')
                            : `${memberCount} members`}
                    </p>
                </div>
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center gap-0.5 flex-shrink-0">
                <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-zinc-600 dark:text-[#b5bac1] hover:text-zinc-900 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] rounded disabled:opacity-40"
                    title={callsEnabled ? "Start voice call" : "Voice calls available in 1:1 chats"}
                    disabled={!callsEnabled}
                    onClick={() => startCall(otherUserId, { videoEnabled: false })}
                >
                    <Phone className="size-[18px]" />
                </Button>
                <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-zinc-600 dark:text-[#b5bac1] hover:text-zinc-900 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] rounded disabled:opacity-40"
                    title={callsEnabled ? "Start video call" : "Video calls available in 1:1 chats"}
                    disabled={!callsEnabled}
                    onClick={() => startCall(otherUserId, { videoEnabled: true })}
                >
                    <Video className="size-[18px]" />
                </Button>
                <Button
                    size="icon"
                    variant="ghost"
                    className={cn(
                        "h-8 w-8 text-zinc-600 dark:text-[#b5bac1] hover:text-zinc-900 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] rounded",
                        infoOpen && "bg-black/[0.06] dark:bg-white/[0.10] text-zinc-900 dark:text-white",
                    )}
                    title={infoOpen ? "Hide details" : "Show details"}
                    onClick={onToggleInfo}
                >
                    <Info className="size-[18px]" />
                </Button>
            </div>
        </div>
    );
}

// Empty state when no channel is selected - Discord style
function EmptyChannelState() {
    return (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-white dark:bg-[#313338]">
            <div className="w-16 h-16 rounded-full bg-[#5865f2]/10 flex items-center justify-center mb-4">
                <svg
                    className="w-8 h-8 text-[#5865f2]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.068.157 2.148.279 3.238.364.466.037.893.281 1.153.671L12 21l2.652-3.978c.26-.39.687-.634 1.153-.67 1.09-.086 2.17-.208 3.238-.365 1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
                    />
                </svg>
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1">No conversation selected</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Pick a chat from the sidebar or start a new one.
            </p>
        </div>
    );
}

export default function ChatChannel({ open, openSidebar, onToggleInfo, infoOpen }: ChatChannelProps) {
    const [showSearch, setShowSearch] = useState(false);
    const [replyingTo, setReplyingTo] = useState<{ id: string; text: string; user: string } | null>(null);
    const handleOpenSearch = useCallback(() => setShowSearch(true), []);
    const handleCloseSearch = useCallback(() => setShowSearch(false), []);

    return (
        <ComponentErrorBoundary componentName="Chat Channel">
            <div className={cn(
                "relative flex-1 h-full min-h-0 overflow-hidden bg-white dark:bg-[#313338]",
                open ? "flex flex-col" : "hidden md:flex md:flex-col"
            )}>
                <ReplyContext.Provider value={{ replyingTo, setReplyingTo }}>
                    <div className="h-full min-h-0 flex flex-col">
                        <Channel
                            EmptyPlaceholder={<EmptyChannelState />}
                        >
                            <Window>
                                <ModernChannelHeader
                                    openSidebar={openSidebar}
                                    onToggleInfo={onToggleInfo}
                                    infoOpen={infoOpen}
                                />
                                <div className="flex-1 overflow-hidden bg-white dark:bg-[#313338]">
                                    <MessageList
                                        Message={CustomMessage}
                                        messageActions={['edit', 'delete', 'react', 'reply']}
                                    />
                                </div>
                                <MessageInputTyping />
                                <CustomMessageInput />
                            </Window>
                        </Channel>
                        <ConnectionStatus className="absolute bottom-20 left-4 text-xs" />
                    </div>

                    {/* Search Modal */}
                    {showSearch && <MessageSearch onClose={handleCloseSearch} />}

                    {/* Chat Notifications */}
                    <ChatNotification />
                </ReplyContext.Provider>
            </div>
        </ComponentErrorBoundary>
    );
}
