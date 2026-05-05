"use client";

import {
  Call,
  StreamVideoClient,
} from "@stream-io/video-react-sdk";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";

interface CallContextValue {
  /** True once the video client and provider are fully mounted. */
  isReady: boolean;
  /** Start a call with another user. Pass videoEnabled=false for audio-only. */
  startCall: (
    otherUserId: string,
    options: { videoEnabled: boolean },
  ) => Promise<void>;
  /** The currently active (outgoing or joined) call, or null. */
  activeCall: Call | null;
  setActiveCall: (call: Call | null) => void;
  /** Whether the call window is minimised to a pill. */
  isCallMinimized: boolean;
  setIsCallMinimized: (v: boolean) => void;
  /** Leave and tear down the active call. */
  endCall: () => Promise<void>;
}

const CallContext = createContext<CallContextValue>({
  isReady: false,
  startCall: async () => {},
  activeCall: null,
  setActiveCall: () => {},
  isCallMinimized: false,
  setIsCallMinimized: () => {},
  endCall: async () => {},
});

export function useCallContext() {
  return useContext(CallContext);
}

interface CallProviderProps {
  children: ReactNode;
  currentUserId: string;
  videoClient: StreamVideoClient;
}

export function CallProvider({
  children,
  currentUserId,
  videoClient,
}: CallProviderProps) {
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [isCallMinimized, setIsCallMinimized] = useState(false);

  const startCall = useCallback(
    async (otherUserId: string, { videoEnabled }: { videoEnabled: boolean }) => {
      // Sort IDs to create a consistent call ID for this pair of users
      const callId =
        [currentUserId, otherUserId].sort().join("_") +
        "_" +
        Date.now();

      const call = videoClient.call("default", callId);

      await call.getOrCreate({
        ring: true,
        data: {
          members: [
            { user_id: currentUserId },
            { user_id: otherUserId },
          ],
          custom: { videoEnabled },
        },
      });

      // Caller joins immediately; callee joins after accepting
      await call.join({ create: true });

      if (!videoEnabled) {
        await call.camera.disable();
      }

      setActiveCall(call);
      setIsCallMinimized(false);
    },
    [currentUserId, videoClient],
  );

  const endCall = useCallback(async () => {
    if (activeCall) {
      await activeCall.leave().catch(console.error);
      setActiveCall(null);
      setIsCallMinimized(false);
    }
  }, [activeCall]);

  return (
    <CallContext.Provider
      value={{
        isReady: true,
        startCall,
        activeCall,
        setActiveCall,
        isCallMinimized,
        setIsCallMinimized,
        endCall,
      }}
    >
      {children}
    </CallContext.Provider>
  );
}
