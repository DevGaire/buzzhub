"use client";

import { getStreamToken } from "./streamToken";
import { useEffect, useRef, useState } from "react";
import { StreamVideoClient } from "@stream-io/video-react-sdk";
import { useSession } from "../SessionProvider";

export default function useInitializeVideoClient() {
  const { user } = useSession();
  const [videoClient, setVideoClient] = useState<StreamVideoClient | null>(null);
  const clientRef = useRef<StreamVideoClient | null>(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const tokenProvider = () => getStreamToken();
        const token = await tokenProvider();
        if (!mounted) return;

        const client = new StreamVideoClient({
          apiKey: process.env.NEXT_PUBLIC_STREAM_KEY!,
          user: {
            id: user.id,
            name: user.displayName,
            image: user.avatarUrl ?? undefined,
          },
          // Pass both initial token and a provider for silent refresh on long sessions
          token,
          tokenProvider,
        });

        clientRef.current = client;
        if (mounted) setVideoClient(client);
      } catch (err) {
        console.error("Video client init failed:", err);
      }
    }

    init();

    return () => {
      mounted = false;
      clientRef.current?.disconnectUser().catch(console.error);
      clientRef.current = null;
      setVideoClient(null);
    };
    // Re-initialize only if the user identity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  return videoClient;
}
