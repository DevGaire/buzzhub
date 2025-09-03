"use client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Menu, Search } from "lucide-react";
import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
const MessageSearch = dynamic(() => import("./MessageSearch"), { ssr: false });
import "stream-chat-react/dist/css/v2/index.css";
import ConnectionStatus from "./ConnectionStatus";
import { MessageInputTyping } from "./EnhancedTypingIndicator";
import ChatNotification from "./ChatNotification";
import { ComponentErrorBoundary } from "@/components/ErrorBoundary";
import {
    Channel,
    ChannelHeader,
    MessageList,
    Window,
} from "stream-chat-react";
import CustomMessageInput from "./CustomMessageInput";
import CustomMessage from "./CustomMessage";

interface ChatChannelProps {
    open: boolean;
    openSidebar: () => void;
}

export default function ChatChannel({ open, openSidebar }: ChatChannelProps) {
    const [showSearch, setShowSearch] = useState(false);
    const handleOpenSearch = useCallback(() => setShowSearch(true), []);
    const handleCloseSearch = useCallback(() => setShowSearch(false), []);

    return (
        <ComponentErrorBoundary componentName="Chat Channel">
            <div className={cn("relative w-full md:block h-full min-h-0", !open && "hidden")}>
                {open && (
                  <>
                    <div className="absolute left-2 top-2 z-10 md:hidden">
                      <Button size="icon" variant="ghost" onClick={openSidebar} title="Open sidebar">
                        <Menu className="size-5" />
                      </Button>
                    </div>
                    <div className="absolute right-2 top-2 z-10">
                      <Button size="icon" variant="ghost" onClick={handleOpenSearch} title="Search messages">
                        <Search className="size-5" />
                      </Button>
                    </div>
                  </>
                )}
                {open ? (
                <div className="h-full min-h-0 flex flex-col">
                    <Channel>
                        <Window>
                            <ChannelHeader />
                            <MessageList Message={CustomMessage} />
                            <CustomMessageInput />
                        </Window>
                    </Channel>
                    <ConnectionStatus className="mx-3 mt-1 text-xs" />
                    <MessageInputTyping />
                </div>
                ) : null}

                {/* Search Modal */}
                {showSearch && <MessageSearch onClose={handleCloseSearch} />}

                {/* Chat Notifications */}
                <ChatNotification />
            </div>
        </ComponentErrorBoundary>
    );
}