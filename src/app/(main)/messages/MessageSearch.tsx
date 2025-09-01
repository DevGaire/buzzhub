"use client";

import { useState } from "react";
import { DefaultStreamChatGenerics, useChatContext } from "stream-chat-react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner, EmptyState } from "@/components/ui/loading-states";
import { ComponentErrorBoundary } from "@/components/ErrorBoundary";
import { handleError } from "@/lib/error-handling";
import UserAvatar from "@/components/UserAvatar";

export default function MessageSearch({ onClose }: { onClose: () => void }) {
  const { client, setActiveChannel } = useChatContext<DefaultStreamChatGenerics>();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const runSearch = async () => {
    if (!q.trim()) {
      setResults([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Search across user's messaging channels
      const response = await client.search(
        { type: "messaging", members: { $in: [client.userID as string] } },
        q,
        { limit: 20 },
      );
      setResults(response.results || []);
    } catch (error) {
      console.error('Search error:', error);
      setError('Failed to search messages. Please try again.');
      handleError(error, 'Message Search');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      runSearch();
    }
  };

  return (
    <div className="absolute inset-0 z-20 bg-background/95 backdrop-blur p-3">
      <div className="mx-auto w-full max-w-xl rounded-2xl border bg-card shadow-sm">
        <div className="flex items-center gap-2 border-b p-3">
          <Search className="size-4 text-muted-foreground" />
          <input
            className="h-10 w-full bg-transparent focus:outline-none"
            placeholder="Search messages..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
          />
          <button className="text-sm text-muted-foreground hover:text-foreground" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="h-96 overflow-y-auto p-2">
          {loading && <LoadingSpinner className="mx-auto my-3" />}
          {!loading && results.length === 0 && (
            <p className="my-3 text-center text-muted-foreground">No results yet. Type and press Enter.</p>
          )}
          {!loading &&
            results.map((r) => (
              <button
                key={r.message.id}
                className="flex w-full items-start gap-3 rounded p-2 text-left hover:bg-muted/50"
                onClick={() => {
                  setActiveChannel(r.channel);
                  onClose();
                }}
              >
                <UserAvatar avatarUrl={r.message.user?.image} size={28} />
                <div className="flex min-w-0 flex-col">
                  <div className="text-sm font-semibold">{r.message.user?.name || r.message.user?.id}</div>
                  <div className="truncate text-sm text-muted-foreground">{r.message.text}</div>
                </div>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
