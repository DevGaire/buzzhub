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
        <div className="flex items-center justify-between h-[60px] px-4 border-b border-white/[0.04] bg-[#1A1B27] rounded-t-2xl">
            {/* Left side - Menu & User info */}
            <div className="flex items-center gap-3">
                <Button
                    size="icon"
                    variant="ghost"
                    onClick={openSidebar}
                    className="md:hidden h-9 w-9 text-white hover:bg-white/10 rounded-full"
                >
                    <Menu className="size-5" />
                </Button>

                <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
                    <div className="relative">
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={channelImage} className="object-cover" />
                            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white font-semibold text-sm">
                                {channelName?.[0]?.toUpperCase() || '?'}
                            </AvatarFallback>
                        </Avatar>
                        {isOnline && (
                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-black rounded-full" />
                        )}
                    </div>

                    <div>
                        <h2 className="font-semibold text-white text-sm">{channelName}</h2>
                        <p className="text-xs text-white/40">
                            {isOneOnOne
                                ? (isOnline ? 'Active now' : 'Offline')
                                : `${memberCount} members`
                            }
                        </p>
                    </div>
                </div>
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center gap-2">
                <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 text-white hover:bg-white/10 rounded-full disabled:opacity-40"
                    title={callsEnabled ? "Voice call" : "Voice calls available in 1:1 chats"}
                    disabled={!callsEnabled}
                    onClick={() => startCall(otherUserId, { videoEnabled: false })}
                >
                    <Phone className="size-[22px]" />
                </Button>
                <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 text-white hover:bg-white/10 rounded-full disabled:opacity-40"
                    title={callsEnabled ? "Video call" : "Video calls available in 1:1 chats"}
                    disabled={!callsEnabled}
                    onClick={() => startCall(otherUserId, { videoEnabled: true })}
                >
                    <Video className="size-[22px]" />
                </Button>
                <Button
                    size="icon"
                    variant="ghost"
                    className={cn(
                        "h-9 w-9 text-white hover:bg-white/10 rounded-full",
                        infoOpen && "bg-white/10",
                    )}
                    title="Group info"
                    onClick={onToggleInfo}
                >
                    <Info className="size-[22px]" />
                </Button>
            </div>
        </div>
    );
}

// Empty state when no channel is selected - Instagram style
function EmptyChannelState() {
    return (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[#1A1B27] rounded-2xl">
            <div className="w-24 h-24 rounded-full border-2 border-white flex items-center justify-center mb-5">
                <svg
                    className="w-12 h-12 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1}
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                    />
                </svg>
            </div>
            <h3 className="text-xl font-normal text-white mb-1">Your messages</h3>
            <p className="text-white/50 text-sm mb-5">
                Send a message to start a chat.
            </p>
            <Button className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg">
                Send message
            </Button>
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
                "relative flex-1 h-full min-h-0 rounded-2xl overflow-hidden bg-[#1A1B27] border border-white/[0.04]",
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
                                <div className="flex-1 overflow-hidden bg-[#1A1B27]">
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
