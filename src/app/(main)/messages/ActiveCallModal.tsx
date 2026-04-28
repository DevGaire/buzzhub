"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Call,
  CallingState,
  SpeakerLayout,
  StreamCall,
  useCall,
  useCallStateHooks,
} from "@stream-io/video-react-sdk";
import {
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  Monitor,
  MonitorOff,
  Phone,
  PhoneOff,
  Video,
  VideoOff,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useCallContext } from "./CallContext";
import InCallChatPanel from "./InCallChatPanel";

// ─── Custom controls ───────────────────────────────────────────────────────────

function CustomControls({
  onEnd,
  videoEnabled,
}: {
  onEnd: () => void;
  videoEnabled: boolean;
}) {
  const { useMicrophoneState, useCameraState, useScreenShareState } =
    useCallStateHooks();
  const { microphone, isMute: isMicMuted } = useMicrophoneState();
  const { camera, isMute: isCamOff } = useCameraState();
  const { screenShare, status: screenStatus } = useScreenShareState();
  const call = useCall();

  const isSharingScreen = screenStatus === "enabled";

  return (
    <div className="flex items-center justify-center gap-3 px-6 py-4">
      {/* Mic */}
      <button
        onClick={() => microphone.toggle()}
        className={cn(
          "flex size-12 items-center justify-center rounded-full transition-colors",
          isMicMuted
            ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
            : "bg-white/10 text-white hover:bg-white/20",
        )}
        title={isMicMuted ? "Unmute" : "Mute"}
      >
        {isMicMuted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
      </button>

      {/* Camera — only for video calls */}
      {videoEnabled && (
        <button
          onClick={() => camera.toggle()}
          className={cn(
            "flex size-12 items-center justify-center rounded-full transition-colors",
            isCamOff
              ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
              : "bg-white/10 text-white hover:bg-white/20",
          )}
          title={isCamOff ? "Start camera" : "Stop camera"}
        >
          {isCamOff ? (
            <VideoOff className="size-5" />
          ) : (
            <Video className="size-5" />
          )}
        </button>
      )}

      {/* Screen share — only for video calls */}
      {videoEnabled && (
        <button
          onClick={() => screenShare.toggle()}
          className={cn(
            "flex size-12 items-center justify-center rounded-full transition-colors",
            isSharingScreen
              ? "bg-blue-500/30 text-blue-400 hover:bg-blue-500/40"
              : "bg-white/10 text-white hover:bg-white/20",
          )}
          title={isSharingScreen ? "Stop sharing" : "Share screen"}
        >
          {isSharingScreen ? (
            <MonitorOff className="size-5" />
          ) : (
            <Monitor className="size-5" />
          )}
        </button>
      )}

      {/* End call */}
      <button
        onClick={onEnd}
        className="flex size-14 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg"
        title="End call"
      >
        <PhoneOff className="size-6" />
      </button>
    </div>
  );
}

// ─── Outgoing / ringing screen ─────────────────────────────────────────────────

function OutgoingCallScreen({
  call,
  onCancel,
}: {
  call: Call;
  onCancel: () => void;
}) {
  const { useCallCallingState, useParticipants } = useCallStateHooks();
  const callingState = useCallCallingState();
  const participants = useParticipants();

  const otherParticipant = participants.find(
    (p) => !p.isLocalParticipant,
  );

  const statusLabel =
    callingState === CallingState.JOINING
      ? "Connecting…"
      : callingState === CallingState.RINGING
        ? "Calling…"
        : "Calling…";

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-black">
      <div className="relative">
        <Avatar className="size-28">
          <AvatarImage src={otherParticipant?.image} />
          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold text-3xl">
            {otherParticipant?.name?.[0]?.toUpperCase() ?? "?"}
          </AvatarFallback>
        </Avatar>
        <span className="absolute inset-[-8px] rounded-full border-2 border-white/20 animate-ping" />
        <span className="absolute inset-[-16px] rounded-full border border-white/10 animate-ping [animation-delay:200ms]" />
      </div>

      <div className="text-center space-y-1">
        <p className="text-2xl font-semibold text-white">
          {otherParticipant?.name ?? "Unknown"}
        </p>
        <p className="text-white/50 text-sm">{statusLabel}</p>
      </div>

      <button
        onClick={onCancel}
        className="mt-4 flex size-16 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors shadow-xl"
        title="Cancel call"
      >
        <PhoneOff className="size-7" />
      </button>
    </div>
  );
}

// ─── Audio-only call screen ────────────────────────────────────────────────────

function AudioOnlyScreen({ onEnd }: { onEnd: () => void }) {
  const { useParticipants, useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();
  const participants = useParticipants();

  const remoteParticipants = participants.filter((p) => !p.isLocalParticipant);
  const other = remoteParticipants[0];

  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (callingState !== CallingState.JOINED) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [callingState]);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-black">
      <Avatar className="size-28">
        <AvatarImage src={other?.image} />
        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold text-3xl">
          {other?.name?.[0]?.toUpperCase() ?? "?"}
        </AvatarFallback>
      </Avatar>
      <div className="text-center">
        <p className="text-2xl font-semibold text-white">{other?.name ?? "Unknown"}</p>
        <p className="text-white/50 text-sm">
          {callingState === CallingState.JOINED
            ? formatDuration(seconds)
            : "Connecting…"}
        </p>
      </div>
    </div>
  );
}

// ─── Active call inner UI (must be inside <StreamCall>) ──────────────────────

function ActiveCallInner({ onEnd }: { onEnd: () => void }) {
  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();
  const { isCallMinimized, setIsCallMinimized, activeCall } = useCallContext();

  const videoEnabled = activeCall?.state.custom?.videoEnabled !== false;

  const isRinging =
    callingState === CallingState.RINGING ||
    callingState === CallingState.JOINING;
  const isJoined = callingState === CallingState.JOINED;
  const isLeft =
    callingState === CallingState.LEFT || callingState === CallingState.IDLE;

  useEffect(() => {
    if (isLeft) onEnd();
  }, [isLeft, onEnd]);

  // ── Minimized pill ─────────────────────────────────────────────────────────
  if (isCallMinimized) {
    return (
      <div className="fixed bottom-24 right-4 z-[200] flex items-center gap-3 rounded-full bg-gray-900 border border-white/10 px-4 py-2 shadow-2xl">
        <span className="size-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-sm text-white font-medium">
          {isRinging ? "Calling…" : "On call"}
        </span>
        <button
          onClick={() => setIsCallMinimized(false)}
          className="text-white/50 hover:text-white"
        >
          <Maximize2 className="size-4" />
        </button>
        <button
          onClick={onEnd}
          className="text-red-400 hover:text-red-300"
        >
          <PhoneOff className="size-4" />
        </button>
      </div>
    );
  }

  // ── Full call modal ────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-2 md:p-6">
      <div
        className="relative flex w-full max-w-[1180px] rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl"
        style={{ height: "min(88vh, 760px)" }}
      >
        {/* ── Video pane ───────────────────────────────────────────── */}
        <div className="relative flex-1 flex flex-col min-w-0 bg-[#0b0b10]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={cn(
                  "size-2 rounded-full flex-shrink-0",
                  isJoined ? "bg-green-500" : "bg-yellow-500 animate-pulse",
                )}
              />
              <span className="text-sm font-medium text-white truncate">
                {isRinging
                  ? videoEnabled
                    ? "Video call"
                    : "Voice call"
                  : isJoined
                    ? videoEnabled
                      ? "Video call"
                      : "Voice call"
                    : "Connecting…"}
              </span>
            </div>
            <button
              onClick={() => setIsCallMinimized(true)}
              className="text-white/50 hover:text-white p-1 rounded"
              title="Minimize"
            >
              <Minimize2 className="size-4" />
            </button>
          </div>

          {/* Stage */}
          <div
            className="relative flex-1 min-h-0 bg-black overflow-hidden"
            style={{ minHeight: "320px" }}
          >
            {isRinging && (
              <OutgoingCallScreen call={activeCall!} onCancel={onEnd} />
            )}

            {isJoined && videoEnabled && (
              <div className="h-full">
                <SpeakerLayout />
              </div>
            )}

            {isJoined && !videoEnabled && <AudioOnlyScreen onEnd={onEnd} />}
          </div>

          {/* Controls */}
          <div className="border-t border-white/10 bg-gray-950/80 flex-shrink-0">
            <CustomControls onEnd={onEnd} videoEnabled={videoEnabled} />
          </div>
        </div>

        {/* ── Chat pane ────────────────────────────────────────────── */}
        <InCallChatPanel />
      </div>
    </div>
  );
}

// ─── Public component ──────────────────────────────────────────────────────────

export default function ActiveCallModal() {
  const { activeCall, endCall } = useCallContext();

  if (!activeCall) return null;

  return (
    <StreamCall call={activeCall}>
      <ActiveCallInner onEnd={endCall} />
    </StreamCall>
  );
}
