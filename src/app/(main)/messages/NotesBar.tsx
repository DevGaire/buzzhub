"use client";

import UserAvatar from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import kyInstance from "@/lib/ky";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Plus, X } from "lucide-react";
import { useState } from "react";
import { useSession } from "../SessionProvider";

interface NoteUser {
  id: string;
  username: string | null;
  displayName: string;
  avatarUrl: string | null;
}

interface NoteItem {
  id: string;
  content: string;
  expiresAt: string;
  user: NoteUser;
}

export default function NotesBar() {
  const { user } = useSession();
  const [showInput, setShowInput] = useState(false);
  const [value, setValue] = useState("");

  const { data, isLoading, refetch } = useQuery<{ notes: NoteItem[] }>({
    queryKey: ["notes"],
    queryFn: () => kyInstance.get("/api/notes").json(),
    refetchInterval: 60_000,
  });

  const create = useMutation({
    mutationFn: async () => kyInstance.post("/api/notes", { json: { content: value } }),
    onSuccess: () => {
      setValue("");
      setShowInput(false);
      refetch();
    },
  });

  const remove = useMutation({
    mutationFn: async () => kyInstance.delete("/api/notes"),
    onSuccess: () => {
      refetch();
    },
  });

  const notes = data?.notes ?? [];
  const myNote = notes.find((n) => n.user.id === user.id);
  const others = notes.filter((n) => n.user.id !== user.id);

  return (
    <div className="space-y-2 border-b p-2">
      <div className="flex items-center gap-3 overflow-x-auto">
        <div className="flex items-center gap-2 rounded-2xl border p-2">
          <UserAvatar avatarUrl={user.avatarUrl} size={36} />
          {myNote ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{myNote.content}</span>
              <Button variant="ghost" size="icon" title="Remove note" onClick={() => remove.mutate()}>
                <X className="size-4" />
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setShowInput((s) => !s)}>
              <Plus className="mr-2 size-4" /> Add note
            </Button>
          )}
        </div>

        {isLoading && <Loader2 className="mx-2 size-4 animate-spin" />}

        {others.map((n) => (
          <div key={n.id} className="flex items-center gap-2 rounded-2xl border p-2">
            <UserAvatar avatarUrl={n.user.avatarUrl} size={36} />
            <div className="flex flex-col">
              <span className="text-xs font-semibold">{n.user.displayName}</span>
              <span className="text-xs text-muted-foreground">{n.content}</span>
            </div>
          </div>
        ))}
      </div>

      {showInput && !myNote && (
        <div className="flex items-center gap-2">
          <input
            className="h-9 w-full rounded border bg-background px-3 text-sm"
            placeholder="Share a quick note (max 60 chars)"
            value={value}
            maxLength={60}
            onChange={(e) => setValue(e.target.value)}
          />
          <Button size="sm" disabled={!value.trim()} onClick={() => create.mutate()}>
            {create.isPending ? <Loader2 className="size-4 animate-spin" /> : "Post"}
          </Button>
        </div>
      )}
    </div>
  );
}
