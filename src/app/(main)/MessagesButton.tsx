"use client";

import { Button } from "@/components/ui/button";
import kyInstance from "@/lib/ky";
import { MessageCountInfo } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import { Mail } from "lucide-react";
import Link from "next/link";

interface MessagesButtonProps {
    initialState: MessageCountInfo;
}

export default function MessagesButton({ initialState }: MessagesButtonProps) {
    const { data } = useQuery({
        queryKey: ["unread-messages-count"],
        queryFn: () =>
            kyInstance.get("/api/messages/unread-count").json<MessageCountInfo>(),
        initialData: initialState,
        refetchInterval: 30 * 1000, // Check every 30 seconds
    });

    return (
        <Button
            variant="ghost"
            className="flex items-center justify-start gap-3 relative"
            title="Messages"
            asChild
        >
            <Link href="/messages">
                <div className="relative">
                    <Mail />
                    {!!data.unreadCount && (
                        <span className="absolute -right-1 -top-1 flex min-w-[20px] items-center justify-center rounded-full bg-green-500 px-1.5 py-0.5 text-xs font-bold tabular-nums text-white shadow-lg animate-pulse">
                            {data.unreadCount > 99 ? "99+" : `+${data.unreadCount}`}
                        </span>
                    )}
                </div>
                <span className="hidden lg:inline">Messages</span>
            </Link>
        </Button>
    );
}