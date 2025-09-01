"use client";

import { LoadingState, NetworkError } from "@/components/ui/loading-states";
import { ComponentErrorBoundary } from "@/components/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { RefreshCw, MessageSquare } from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { Chat as StreamChat } from "stream-chat-react";
import ChatChannel from "./ChatChannel";
import ChatSidebar from "./ChatSidebar";
import useInitializeChatClient from "./useInitializeChatClient";

export default function Chat() {
    const { chatClient, isLoading, error, retry } = useInitializeChatClient();
    const { resolvedTheme } = useTheme();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    if (isLoading) {
        return (
            <ComponentErrorBoundary componentName="Chat">
                <main className="relative w-full overflow-hidden rounded-2xl bg-card shadow-sm">
                    <LoadingState
                        message="Connecting to chat..."
                        className="h-96"
                    />
                </main>
            </ComponentErrorBoundary>
        );
    }

    if (error) {
        return (
            <ComponentErrorBoundary componentName="Chat">
                <main className="relative w-full overflow-hidden rounded-2xl bg-card shadow-sm">
                    <div className="flex h-96 items-center justify-center">
                        <div className="text-center space-y-4">
                            <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10 mx-auto">
                                <MessageSquare className="size-8 text-destructive" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-lg font-semibold">Chat Connection Failed</h3>
                                <p className="text-muted-foreground max-w-sm">
                                    Unable to connect to the chat service. Please check your internet connection.
                                </p>
                            </div>
                            <Button onClick={retry} className="gap-2">
                                <RefreshCw className="size-4" />
                                Try Again
                            </Button>
                        </div>
                    </div>
                </main>
            </ComponentErrorBoundary>
        );
    }

    if (!chatClient) {
        return (
            <ComponentErrorBoundary componentName="Chat">
                <main className="relative w-full overflow-hidden rounded-2xl bg-card shadow-sm">
                    <LoadingState
                        message="Initializing chat..."
                        className="h-96"
                    />
                </main>
            </ComponentErrorBoundary>
        );
    }

    return (
        <ComponentErrorBoundary componentName="Chat">
            <main className="flex w-full flex-1 overflow-hidden rounded-2xl shadow-sm" style={{ backgroundColor: '#000000' }}>
                <div className="flex w-full h-[calc(100vh-8rem)]" style={{ backgroundColor: '#000000' }}>
                    <StreamChat
                        client={chatClient}
                        theme="str-chat__theme-dark"
                    >
                        <div className="flex w-full h-full" style={{ backgroundColor: '#000000' }}>
                            <ChatSidebar
                                open={sidebarOpen}
                                onClose={() => setSidebarOpen(false)}
                            />
                            <ChatChannel
                                open={!sidebarOpen}
                                openSidebar={() => setSidebarOpen(true)}
                            />
                        </div>
                    </StreamChat>
                </div>
            </main>
        </ComponentErrorBoundary>
    );
}