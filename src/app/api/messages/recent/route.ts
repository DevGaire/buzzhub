import { validateRequest } from "@/auth";
import streamServerClient from "@/lib/stream";
import { format } from "date-fns";

export interface RecentConversation {
  id: string;
  otherUser: {
    id: string;
    name: string;
    image: string | null;
    online: boolean;
  } | null;
  lastMessage: string | null;
  lastMessageTime: string | null;
  unreadCount: number;
}

export async function GET() {
  try {
    const { user } = await validateRequest();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const channels = await streamServerClient.queryChannels(
      { type: "messaging", members: { $in: [user.id] } },
      [{ last_message_at: -1 }],
      { limit: 8, state: true, watch: false },
    );

    const conversations: RecentConversation[] = channels.map((ch) => {
      const members = Object.values(ch.state.members);
      const other = members.find((m) => m.user_id !== user.id);

      const lastMsg = ch.lastMessage();
      const unread =
        (ch.state.read[user.id]?.unread_messages as number | undefined) ?? 0;

      let timeStr: string | null = null;
      if (lastMsg?.created_at) {
        timeStr = format(new Date(lastMsg.created_at as unknown as string), "hh:mm a");
      }

      return {
        id: ch.id ?? "",
        otherUser: other
          ? {
              id: other.user_id ?? "",
              name: (other.user?.name as string) || other.user_id || "Unknown",
              image: (other.user?.image as string | null) ?? null,
              online: (other.user?.online as boolean) ?? false,
            }
          : null,
        lastMessage: (lastMsg?.text as string | null) ?? null,
        lastMessageTime: timeStr,
        unreadCount: unread,
      };
    });

    return Response.json({ conversations });
  } catch (error) {
    console.error("Recent messages error:", error);
    return Response.json({ conversations: [] });
  }
}
