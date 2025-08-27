"use client";

import UserAvatar from "@/components/UserAvatar";
import kyInstance from "@/lib/ky";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
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

  const { data, isLoading, isError } = useQuery<PeopleResponse>({
    queryKey: ["message-people"],
    queryFn: () => kyInstance.get("/api/messages/people").json<PeopleResponse>(),
  });

  if (isLoading) return <Loader2 className="mx-auto my-3 animate-spin" />;
  if (isError) return <p className="my-3 text-center text-destructive">Failed to load people.</p>;
  if (!data || !data.people.length) return <p className="my-3 text-center text-muted-foreground">No people yet. Follow someone to start messaging.</p>;

  const startChat = async (otherId: string) => {
    const channel = client.channel("messaging", {
      members: [user.id, otherId],
    });
    await channel.create();
    setActiveChannel(channel);
    onPicked?.();
  };

  return (
    <div className="flex flex-col divide-y">
      {data.people.map((p) => (
        <button key={p.id} className="flex items-center gap-3 px-3 py-2 text-left hover:bg-muted/50" onClick={() => startChat(p.id)}>
          <UserAvatar avatarUrl={p.avatarUrl ?? undefined} />
          <div className="flex flex-col">
            <span className="font-semibold">{p.displayName}</span>
            {p.username && <span className="text-sm text-muted-foreground">@{p.username}</span>}
          </div>
        </button>
      ))}
    </div>
  );
}
