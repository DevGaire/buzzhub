"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Send } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useChatContext } from "stream-chat-react";

function formatTime(date: string | Date) {
    return new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    }).format(new Date(date));
}

export default function InCallChatPanel() {
    const { client, channel } = useChatContext();
    const [, force] = useState(0);
    const [draft, setDraft] = useState("");
    const [sending, setSending] = useState(false);
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!channel) return;
        const handler = () => force((n) => n + 1);
        const subs = [
            channel.on("message.new", handler),
            channel.on("message.updated", handler),
            channel.on("message.deleted", handler),
        ];
        return () => subs.forEach((s) => s.unsubscribe());
    }, [channel]);

    const messages = useMemo(
        () => channel?.state.messages ?? [],
        [channel, channel?.state.messages.length],
    );

    useEffect(() => {
        if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
    }, [messages.length]);

    const send = async () => {
        const text = draft.trim();
        if (!text || !channel || sending) return;
        try {
            setSending(true);
            await channel.sendMessage({ text });
            setDraft("");
        } catch (err) {
            console.error("In-call send failed", err);
        } finally {
            setSending(false);
        }
    };

    if (!channel) {
        return (
            <div className="hidden lg:flex flex-col w-[320px] flex-shrink-0 border-l border-white/10 bg-[#0a0a0a] items-center justify-center text-white/40 text-sm">
                Open a chat to message during the call
            </div>
        );
    }

    return (
        <div className="hidden lg:flex flex-col w-[320px] flex-shrink-0 border-l border-white/10 bg-[#0a0a0a]">
            <div className="h-[52px] flex items-center px-4 border-b border-white/10 flex-shrink-0">
                <span className="text-sm font-semibold text-white">Chat</span>
            </div>

            <div
                ref={listRef}
                className="flex-1 overflow-y-auto px-3 py-3 space-y-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
            >
                {messages.length === 0 ? (
                    <p className="text-center text-xs text-white/40 mt-6">
                        No messages yet. Say hi!
                    </p>
                ) : (
                    messages.map((m) => {
                        const isOwn = m.user?.id === client.userID;
                        return (
                            <div
                                key={m.id}
                                className={cn(
                                    "flex items-end gap-2",
                                    isOwn ? "flex-row-reverse" : "flex-row",
                                )}
                            >
                                {!isOwn && (
                                    <Avatar className="h-6 w-6 flex-shrink-0">
                                        <AvatarImage src={m.user?.image as string | undefined} />
                                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-[9px]">
                                            {(m.user?.name as string | undefined)?.[0]?.toUpperCase() || "?"}
                                        </AvatarFallback>
                                    </Avatar>
                                )}
                                <div className={cn("max-w-[75%] flex flex-col", isOwn ? "items-end" : "items-start")}>
                                    {!isOwn && (
                                        <span className="text-[10px] text-white/50 mb-0.5 px-1">
                                            {(m.user?.name as string | undefined) || "Unknown"}
                                        </span>
                                    )}
                                    {m.text ? (
                                        <div
                                            className={cn(
                                                "px-3 py-1.5 rounded-2xl text-[13px] leading-snug break-words",
                                                isOwn
                                                    ? "bg-[#0095F6] text-white rounded-br-[4px]"
                                                    : "bg-white/[0.08] text-white rounded-bl-[4px]",
                                            )}
                                        >
                                            {m.text}
                                        </div>
                                    ) : (
                                        <div className="px-3 py-1.5 rounded-2xl text-[12px] italic bg-white/[0.05] text-white/60">
                                            [attachment]
                                        </div>
                                    )}
                                    {m.created_at && (
                                        <span className="text-[10px] text-white/30 mt-0.5 px-1">
                                            {formatTime(m.created_at as string | Date)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <div className="p-3 border-t border-white/10 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <input
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                send();
                            }
                        }}
                        placeholder="Type a message"
                        className="flex-1 h-9 px-3 rounded-full bg-white/[0.06] border border-white/[0.06] text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
                    />
                    <button
                        onClick={send}
                        disabled={!draft.trim() || sending}
                        className="flex size-9 items-center justify-center rounded-full bg-[#0095F6] text-white disabled:opacity-40 hover:bg-[#0086e0] transition-colors"
                    >
                        <Send className="size-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
