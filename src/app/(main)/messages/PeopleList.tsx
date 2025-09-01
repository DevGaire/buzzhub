"use client";

import UserAvatar from "@/components/UserAvatar";
import { QueryWrapper } from "@/components/ui/query-states";
import { LoadingSpinner, EmptyState } from "@/components/ui/loading-states";
import { ComponentErrorBoundary } from "@/components/ErrorBoundary";
import { handleError } from "@/lib/error-handling";
import { toast } from "@/components/ui/use-toast";
import kyInstance from "@/lib/ky";
import { useQuery } from "@tanstack/react-query";
import { Users, MessageCircle } from "lucide-react";
import { useState } from "react";
import { DefaultStreamChatGenerics, useChatContext } from "stream-chat-react";
import { useSession } from "../SessionProvider";

interface Person {
  id: string;
  username: string | null;
  displayName: string;
  avatarUrl: string | null;
}

interface PeopleResponse { people: Person[] }

export default function PeopleList({ onPicked }: { onPicked?: () => void }) {
  const { client, setActiveChannel } = useChatContext<DefaultStreamChatGenerics>();
  const { user } = useSession();
  const [startingChat, setStartingChat] = useState<string | null>(null);

  const query = useQuery<PeopleResponse>({
    queryKey: ["message-people"],
    queryFn: () => kyInstance.get("/api/messages/people").json<PeopleResponse>(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const startChat = async (otherId: string) => {
    if (startingChat) return; // Prevent multiple simultaneous attempts

    setStartingChat(otherId);

    try {
      const channel = client.channel("messaging", {
        members: [user.id, otherId],
      });

      await channel.create();
      setActiveChannel(channel);
      onPicked?.();

      toast({
        description: "Chat started successfully!",
      });
    } catch (error) {
      console.error('Failed to start chat:', error);
      handleError(error, 'Start Chat');
    } finally {
      setStartingChat(null);
    }
  };

  return (
    <ComponentErrorBoundary componentName="People List">
      <QueryWrapper
        query={query}
        loadingComponent={<LoadingSpinner className="mx-auto my-3" />}
        emptyComponent={
          <EmptyState
            title="No people yet"
            description="Follow someone to start messaging."
            icon={<Users className="size-8" />}
            className="py-6"
          />
        }
        emptyCheck={(data) => !data.people.length}
        loadingMessage="Loading people..."
        errorMessage="Failed to load people."
      >
        {(data) => (
          <div className="flex flex-col divide-y">
            {data.people.map((p) => (
              <button
                key={p.id}
                className="flex items-center gap-3 px-3 py-2 text-left hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => startChat(p.id)}
                disabled={startingChat === p.id}
              >
                <UserAvatar avatarUrl={p.avatarUrl ?? undefined} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{p.displayName}</div>
                  {p.username && (
                    <div className="text-sm text-muted-foreground truncate">@{p.username}</div>
                  )}
                </div>
                {startingChat === p.id ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <MessageCircle className="size-4 text-muted-foreground" />
                )}
              </button>
            ))}
          </div>
        )}
      </QueryWrapper>
    </ComponentErrorBoundary>
  );
}
