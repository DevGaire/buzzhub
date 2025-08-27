"use client";

import UserAvatar from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import kyInstance from "@/lib/ky";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ImageIcon, Loader2, VideoIcon } from "lucide-react";
import { useRef, useState } from "react";

interface StoryItem { media: { url: string; type: "IMAGE" | "VIDEO" } }
interface Story { id: string; user: { id: string; displayName: string; avatarUrl: string | null }; items: StoryItem[] }

export default function StoriesBar() {
  const { data, isLoading, refetch } = useQuery<{ stories: Story[] }>({
    queryKey: ["stories"],
    queryFn: () => kyInstance.get("/api/stories").json(),
    refetchInterval: 60_000,
  });

  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const upload = useMutation({
    mutationFn: async (mediaIds: string[]) =>
      kyInstance.post("/api/stories", { json: { mediaIds } }),
    onSuccess: () => {
      setFiles([]);
      refetch();
    },
  });

  const pickFiles = () => fileInputRef.current?.click();

  const onFilesSelected = (selected: File[]) => {
    setError(null);
    const images = selected.filter((f) => f.type.startsWith("image"));
    const videos = selected.filter((f) => f.type.startsWith("video"));

    if (images.length > 10) {
      setError("Max 10 images allowed");
      return;
    }
    if (videos.length > 1) {
      setError("Max 1 video allowed");
      return;
    }

    // Video duration validation (client-side best-effort)
    const validateVideoDuration = async () => {
      if (!videos[0]) return true;
      const file = videos[0];
      const url = URL.createObjectURL(file);
      const video = document.createElement("video");
      video.preload = "metadata";
      return new Promise<boolean>((resolve) => {
        video.onloadedmetadata = () => {
          URL.revokeObjectURL(url);
          resolve((video.duration || 0) <= 120);
        };
        video.src = url;
      });
    };

    validateVideoDuration().then((ok) => {
      if (!ok) {
        setError("Video must be 2 minutes or less");
        return;
      }
      setFiles(selected);
    });
  };

  const startUpload = async () => {
    // Reuse existing attachment uploader by letting user attach via composer first,
    // or implement a dedicated upload for stories. Here we just prevent no-op.
    setError("Please upload media via the post composer for now, then select them here.");
  };

  const stories = data?.stories ?? [];

  return (
    <div className="space-y-2 border-b p-2">
      <div className="flex items-center gap-3 overflow-x-auto">
        <div className="flex items-center gap-2 rounded-2xl border p-2">
          <Button variant="ghost" size="sm" onClick={pickFiles}>
            <ImageIcon className="mr-2 size-4" /> Add story
          </Button>
          <input
            type="file"
            accept="image/*, video/*"
            multiple
            className="sr-only hidden"
            ref={fileInputRef}
            onChange={(e) => {
              const sel = Array.from(e.target.files || []);
              if (sel.length) onFilesSelected(sel);
              e.target.value = "";
            }}
          />
          {files.length > 0 && (
            <Button size="sm" onClick={startUpload} disabled={upload.isPending}>
              {upload.isPending ? <Loader2 className="size-4 animate-spin" /> : "Upload"}
            </Button>
          )}
        </div>
        {isLoading && <Loader2 className="mx-2 size-4 animate-spin" />}
        {stories.map((s) => (
          <div key={s.id} className="flex items-center gap-2 rounded-2xl border p-2">
            <UserAvatar avatarUrl={s.user.avatarUrl} size={36} />
            <div className="flex items-center gap-1">
              {s.items.slice(0, 3).map((it, idx) => (
                it.media.type === "IMAGE" ? <ImageIcon key={idx} className="size-4 text-muted-foreground" /> : <VideoIcon key={idx} className="size-4 text-muted-foreground" />
              ))}
            </div>
          </div>
        ))}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
