"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Call,
  CallingState,
  StreamCall,
  useCalls,
  useCallStateHooks,
} from "@stream-io/video-react-sdk";
import { Phone, PhoneOff, Video } from "lucide-react";
import { useEffect, useRef } from "react";
import { useCallContext } from "./CallContext";

// Rendered inside <StreamCall call={...}> — safe to use per-call hooks
function IncomingBannerInner({
  call,
  onAccept,
  onDecline,
}: {
  call: Call;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const caller = call.state.createdBy;
  const videoEnabled = call.state.custom?.videoEnabled !== false;

  // Play a ring sound while ringing
  useEffect(() => {
    const audio = new Audio("/sounds/ringtone.mp3");
    audio.loop = true;
    audio.volume = 0.5;
    audio.play().catch(() => {}); // ignore autoplay restrictions
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, []);

  // Auto-dismiss banner if the caller hangs up
  if (callingState !== CallingState.RINGING) return null;

  return (
    <div className="fixed inset-x-0 top-16 z-[300] flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-sm rounded-2xl bg-gray-900 border border-white/10 shadow-2xl overflow-hidden animate-in slide-in-from-top-4 duration-300">
        {/* Pulsing ring indicator */}
        <div className="h-0.5 w-full bg-gradient-to-r from-green-500 via-emerald-400 to-green-500 animate-pulse" />

        <div className="flex items-center gap-4 p-4">
          <div className="relative flex-shrink-0">
            <Avatar className="size-14">
              <AvatarImage src={caller?.image} />
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white font-semibold text-xl">
                {caller?.name?.[0]?.toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
            {/* Outer ring animation */}
            <span className="absolute inset-0 rounded-full border-2 border-green-400 animate-ping opacity-60" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white truncate">
              {caller?.name ?? "Unknown"}
            </p>
            <p className="text-sm text-white/50 flex items-center gap-1">
              {videoEnabled ? (
                <>
                  <Video className="size-3" />
                  Incoming video call
                </>
              ) : (
                <>
                  <Phone className="size-3" />
                  Incoming voice call
                </>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Decline */}
            <Button
              size="icon"
              className="size-11 rounded-full bg-red-500 hover:bg-red-600 text-white"
              onClick={onDecline}
              title="Decline"
            >
              <PhoneOff className="size-5" />
            </Button>
            {/* Accept */}
            <Button
              size="icon"
              className="size-11 rounded-full bg-green-500 hover:bg-green-600 text-white"
              onClick={onAccept}
              title="Accept"
            >
              <Phone className="size-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Listens for incoming ringing calls via useCalls() and renders a banner.
 * Must be rendered inside <StreamVideo> but outside <StreamCall>.
 */
export default function IncomingCallHandler() {
  const calls = useCalls();
  const { activeCall, setActiveCall, setIsCallMinimized } = useCallContext();

  // Calls we didn't initiate (isCreatedByMe=false) that are ringing
  const incomingCall =
    calls.find(
      (c) =>
        c.state.callingState === CallingState.RINGING && !c.isCreatedByMe,
    ) ?? null;

  if (!incomingCall || activeCall) return null;

  const handleAccept = async () => {
    await incomingCall.accept();
    const videoEnabled = incomingCall.state.custom?.videoEnabled !== false;
    if (!videoEnabled) {
      await incomingCall.camera.disable().catch(console.error);
    }
    setActiveCall(incomingCall);
    setIsCallMinimized(false);
  };

  const handleDecline = async () => {
    await incomingCall.reject();
  };

  return (
    <StreamCall call={incomingCall}>
      <IncomingBannerInner
        call={incomingCall}
        onAccept={handleAccept}
        onDecline={handleDecline}
      />
    </StreamCall>
  );
}
