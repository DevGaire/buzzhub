"use client";

import { LoadingState } from "@/components/ui/loading-states";
import { ComponentErrorBoundary } from "@/components/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { RefreshCw, MessageSquare } from "lucide-react";
import React, { useState, useEffect } from "react";
import { Chat as StreamChat } from "stream-chat-react";
import { StreamVideo } from "@stream-io/video-react-sdk";
import { useTheme } from "next-themes";
import dynamic from "next/dynamic";
import ChatChannel from "./ChatChannel";
import ChatSidebar from "./ChatSidebar";
import GroupInfoPanel from "./GroupInfoPanel";
import useInitializeChatClient from "./useInitializeChatClient";
import useInitializeVideoClient from "./useInitializeVideoClient";
import { CallProvider } from "./CallContext";
import { useSession } from "../SessionProvider";

// DEV ONLY — patch React.createElement to log when a Date is passed as a child.
// Remove once the offending render is identified.
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  const anyReact = React as any;
  if (!anyReact.__dateChildPatched) {
    anyReact.__dateChildPatched = true;
    const orig = anyReact.createElement;
    anyReact.createElement = function patched(type: any, props: any, ...children: any[]) {
      const flat = children.flat(Infinity);
      for (const child of flat) {
        if (child instanceof Date) {
          const name = typeof type === "string" ? type : (type?.displayName || type?.name || "Unknown");
          // eslint-disable-next-line no-console
          console.error("[DATE-CHILD]", name, "received a Date child:", child, "props:", props);
          // eslint-disable-next-line no-console
          console.trace("[DATE-CHILD] trace");
          break;
        }
      }
      return orig.call(this, type, props, ...children);
    };
  }
}

// Dynamically import to avoid SSR issues with WebRTC APIs
const ActiveCallModal = dynamic(() => import("./ActiveCallModal"), {
  ssr: false,
});
const IncomingCallHandler = dynamic(() => import("./IncomingCallHandler"), {
  ssr: false,
});

export default function Chat() {
  const { user } = useSession();
  const { chatClient, isLoading, error, retry } = useInitializeChatClient();
  const videoClient = useInitializeVideoClient();
  const { resolvedTheme } = useTheme();
  const streamTheme =
    resolvedTheme === "dark" ? "str-chat__theme-dark" : "str-chat__theme-light";

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [groupInfoOpen, setGroupInfoOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  if (isLoading) {
    return (
      <ComponentErrorBoundary componentName="Chat">
        <div className="fixed inset-0 top-14 z-40 flex items-center justify-center bg-white dark:bg-[#313338]">
          <LoadingState message="Connecting to chat..." className="h-96" />
        </div>
      </ComponentErrorBoundary>
    );
  }

  if (error) {
    return (
      <ComponentErrorBoundary componentName="Chat">
        <div className="fixed inset-0 top-14 z-40 flex items-center justify-center bg-white dark:bg-[#313338]">
          <div className="text-center space-y-4">
            <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10 mx-auto">
              <MessageSquare className="size-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Chat Connection Failed
              </h3>
              <p className="text-muted-foreground max-w-sm">
                Unable to connect to the chat service. Please check your
                internet connection.
              </p>
            </div>
            <Button onClick={retry} className="gap-2">
              <RefreshCw className="size-4" />
              Try Again
            </Button>
          </div>
        </div>
      </ComponentErrorBoundary>
    );
  }

  if (!chatClient) {
    return (
      <ComponentErrorBoundary componentName="Chat">
        <div className="fixed inset-0 top-14 z-40 flex items-center justify-center bg-white dark:bg-[#313338]">
          <LoadingState message="Initializing chat..." className="h-96" />
        </div>
      </ComponentErrorBoundary>
    );
  }

  // ── Inner content — always rendered once chatClient is ready ───────────────
  const chatContent = (
    <StreamChat client={chatClient} theme={streamTheme}>
      <div className="flex h-full w-full bg-white dark:bg-[#313338]">
        <ChatSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <ChatChannel
          open={!sidebarOpen || !isMobile}
          openSidebar={() => setSidebarOpen(true)}
          onToggleInfo={() => setGroupInfoOpen((v) => !v)}
          infoOpen={groupInfoOpen}
        />
        <GroupInfoPanel
          open={groupInfoOpen}
          onClose={() => setGroupInfoOpen(false)}
        />
      </div>
    </StreamChat>
  );

  return (
    <ComponentErrorBoundary componentName="Chat">
      <div className="fixed inset-0 top-14 z-40 bg-white dark:bg-[#313338]">
        {videoClient ? (
          // Video client ready — wrap with StreamVideo + call providers
          <StreamVideo client={videoClient}>
            <CallProvider currentUserId={user.id} videoClient={videoClient}>
              {chatContent}
              <IncomingCallHandler />
              <ActiveCallModal />
            </CallProvider>
          </StreamVideo>
        ) : (
          // Video still initialising — show chat without call features
          // (call buttons will be disabled)
          chatContent
        )}
      </div>
    </ComponentErrorBoundary>
  );
}
