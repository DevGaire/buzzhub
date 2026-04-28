"use client";

import { useChannelActionContext, useChannelStateContext } from "stream-chat-react";
import RichMediaSharing from "./RichMediaSharing";
import { useUploadThing } from "@/lib/uploadthing";
import { toast } from "@/components/ui/use-toast";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Reply, Smile, Mic, Square } from "lucide-react";
import { useSession } from "../SessionProvider";
import { useReply } from "./CustomMessage";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";

const EmojiPicker = dynamic(
  () => import("@emoji-mart/react").then((m) => m.default),
  { ssr: false },
);

const emojiData = () => import("@emoji-mart/data").then((m) => m.default);

interface MediaFile {
    id: string;
    file: File;
    type: 'image' | 'video' | 'document' | 'audio';
    preview?: string;
    caption?: string;
}

export default function CustomMessageInput() {
    const { sendMessage } = useChannelActionContext();
    const { channel } = useChannelStateContext();
    const { user } = useSession();
    const { replyingTo, setReplyingTo } = useReply();

    const [text, setText] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    // Voice recording state
    const [isRecording, setIsRecording] = useState(false);
    const [recordingSeconds, setRecordingSeconds] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const startUploadRef = useRef<((files: File[]) => Promise<any>) | null>(null);

    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const emojiPickerRef = useRef<HTMLDivElement | null>(null);

    // Key drafts by channel id
    const draftKey = useMemo(() => channel?.id ? `chat-draft:${channel.id}` : undefined, [channel?.id]);

    // Determine DM recipient for 1:1 channels (client-side heuristic)
    const getDmRecipientId = useCallback(() => {
        try {
            const membersObj: any = (channel as any)?.state?.members || {};
            const memberIds = Object.keys(membersObj);
            if (memberIds.length === 2) {
                return memberIds.find((id) => id !== user.id);
            }
        } catch {}
        return undefined;
    }, [channel, user?.id]);

    // Load draft on channel change
    useEffect(() => {
        if (!draftKey) return;
        try {
            const saved = localStorage.getItem(draftKey);
            if (saved) setText(saved);
            else setText("");
        } catch {}
    }, [draftKey]);

    // Focus textarea when replying
    useEffect(() => {
        if (replyingTo && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [replyingTo]);

    // Autosize textarea on text changes
    useEffect(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = Math.min(el.scrollHeight, 160) + "px";
    }, [text]);

    // Debounced save draft
    useEffect(() => {
        if (!draftKey) return;
        const handle = setTimeout(() => {
            try {
                if (text.trim()) localStorage.setItem(draftKey, text);
                else localStorage.removeItem(draftKey);
            } catch {}
        }, 400);
        return () => clearTimeout(handle);
    }, [text, draftKey]);

    // Warn on unload if draft exists and not sending/uploading
    useEffect(() => {
        const onBeforeUnload = (e: BeforeUnloadEvent) => {
            if (text.trim() && !isSending && !isUploading) {
                e.preventDefault();
                e.returnValue = "";
            }
        };
        window.addEventListener("beforeunload", onBeforeUnload);
        return () => window.removeEventListener("beforeunload", onBeforeUnload);
    }, [text, isSending, isUploading]);

    // Close emoji picker on outside click
    useEffect(() => {
        if (!showEmojiPicker) return;
        const handler = (e: MouseEvent) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
                setShowEmojiPicker(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [showEmojiPicker]);

    const handleEmojiSelect = useCallback((emoji: { native: string }) => {
        setText((prev) => prev + emoji.native);
        textareaRef.current?.focus();
    }, []);

    // Voice recording
    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mr = new MediaRecorder(stream);
            mediaRecorderRef.current = mr;
            audioChunksRef.current = [];
            mr.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };
            mr.start();
            setIsRecording(true);
            setRecordingSeconds(0);
            recordingTimerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
        } catch {
            toast({ variant: "destructive", description: "Microphone access denied." });
        }
    }, []);

    const stopRecording = useCallback(() => {
        const mr = mediaRecorderRef.current;
        if (!mr) return;
        mr.onstop = async () => {
            const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
            const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
            mr.stream.getTracks().forEach((t) => t.stop());
            setIsRecording(false);
            setRecordingSeconds(0);
            if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
            setIsUploading(true);
            try {
                await startUploadRef.current?.([file]);
            } catch {
                setIsUploading(false);
                toast({ variant: "destructive", description: "Failed to send voice message." });
            }
        };
        mr.stop();
    }, []);

    const cancelRecording = useCallback(() => {
        const mr = mediaRecorderRef.current;
        if (!mr) return;
        mr.onstop = null;
        mr.stop();
        mr.stream.getTracks().forEach((t) => t.stop());
        mediaRecorderRef.current = null;
        audioChunksRef.current = [];
        setIsRecording(false);
        setRecordingSeconds(0);
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }, []);

    const formatRecDuration = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

    const handleSendText = useCallback(async () => {
        if (!channel?.id) return;
        const content = text.trim();
        if (!content) return;
        setIsSending(true);
        try {
            // Build message with optional quoted_message_id for replies
            const messagePayload: any = { text: content };
            if (replyingTo?.id) {
                messagePayload.quoted_message_id = replyingTo.id;
            }

            await sendMessage(messagePayload);

            // Clear draft and reply state on success
            if (draftKey) localStorage.removeItem(draftKey);
            setText("");
            setReplyingTo(null);

            // Client-initiated email notification (free plan)
            try {
                const mentionedUsernames = Array.from(content.matchAll(/@([a-zA-Z0-9_-]+)/g)).map(m => m[1]);
                const dmRecipientId = mentionedUsernames.length === 0 ? getDmRecipientId() : undefined;
                if ((mentionedUsernames.length > 0) || dmRecipientId) {
                    await fetch("/api/messages/notify", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            channelId: channel?.id,
                            text: content,
                            mentionedUsernames,
                            dmRecipientId
                        })
                    });
                }
            } catch (e) {
                console.warn("Email notify failed (non-blocking)", e);
            }
        } catch (error) {
            console.error("Failed to send message:", error);
            toast({ variant: "destructive", description: "Failed to send message. Please try again." });
        } finally {
            setIsSending(false);
        }
    }, [channel?.id, draftKey, sendMessage, text, replyingTo, setReplyingTo, getDmRecipientId]);

    const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void handleSendText();
        }
        if (e.key === "Escape" && replyingTo) {
            setReplyingTo(null);
        }
    }, [handleSendText, replyingTo, setReplyingTo]);

    const { startUpload } = useUploadThing("attachment", {
        onClientUploadComplete: async (res) => {
            setIsUploading(false);
            const attachments = res.map((uploadResult) => {
                const isImage = uploadResult.type?.startsWith('image/');
                const isVideo = uploadResult.type?.startsWith('video/');
                return {
                    type: isImage ? 'image' : isVideo ? 'video' : 'file',
                    asset_url: uploadResult.url,
                    title: uploadResult.name,
                    file_size: uploadResult.size,
                    mime_type: uploadResult.type || 'application/octet-stream',
                    ...(isImage && {
                        image_url: uploadResult.url,
                        fallback: uploadResult.name
                    }),
                    ...(isVideo && {
                        asset_url: uploadResult.url,
                        thumb_url: uploadResult.url
                    })
                } as const;
            });
            try {
                await sendMessage({ text: '', attachments });
                toast({ description: `${attachments.length} file(s) sent successfully!` });

                // Client-initiated notification for DM with media-only message
                try {
                    const dmRecipientId = getDmRecipientId();
                    if (dmRecipientId) {
                        const imageCount = attachments.filter(a => a.type === 'image').length;
                        const videoCount = attachments.filter(a => a.type === 'video').length;
                        const fileCount = attachments.filter(a => a.type !== 'image' && a.type !== 'video').length;
                        const parts: string[] = [];
                        if (imageCount) parts.push(`${imageCount} photo${imageCount > 1 ? 's' : ''}`);
                        if (videoCount) parts.push(`${videoCount} video${videoCount > 1 ? 's' : ''}`);
                        if (fileCount) parts.push(`${fileCount} file${fileCount > 1 ? 's' : ''}`);
                        const preview = parts.length ? `sent ${parts.join(', ')}` : 'sent attachments';

                        await fetch("/api/messages/notify", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                channelId: channel?.id,
                                text: preview,
                                mentionedUsernames: [],
                                dmRecipientId
                            })
                        });
                    }
                } catch (e) {
                    console.warn("Email notify (media) failed (non-blocking)", e);
                }
            } catch (error) {
                console.error('Failed to send message with attachments:', error);
                toast({ variant: "destructive", description: "Failed to send files. Please try again." });
            }
        },
        onUploadError: (error) => {
            setIsUploading(false);
            console.error('Upload error:', error);
            toast({ variant: "destructive", description: "Failed to upload files. Please try again." });
        },
    });

    // Keep startUploadRef in sync so stopRecording can call it without closure issues
    useEffect(() => {
        startUploadRef.current = startUpload;
    }, [startUpload]);

    const handleSendMedia = async (files: MediaFile[]) => {
        if (!files.length) return;
        setIsUploading(true);
        try {
            const fileObjects = files.map(mediaFile => mediaFile.file);
            await startUpload(fileObjects);
        } catch (error) {
            setIsUploading(false);
            console.error('Failed to start upload:', error);
            toast({ variant: "destructive", description: "Failed to start upload. Please try again." });
        }
    };

    const disabled = !channel?.id || isUploading || isSending;

    return (
        <div className="bg-[#1A1B27] px-3 py-3 relative border-t border-white/[0.04]">
            {/* Emoji Picker */}
            {showEmojiPicker && (
                <div
                    ref={emojiPickerRef}
                    className="absolute bottom-full left-3 mb-2 z-50"
                >
                    <EmojiPicker
                        data={emojiData}
                        onEmojiSelect={handleEmojiSelect}
                        theme="dark"
                        set="native"
                        previewPosition="none"
                        skinTonePosition="none"
                    />
                </div>
            )}

            {/* Reply Preview */}
            {replyingTo && (
                <div className="flex items-center gap-3 mb-3 mx-1 px-4 py-2 bg-white/5 rounded-xl">
                    <div className="flex items-center gap-2 text-blue-400">
                        <Reply className="w-4 h-4" />
                        <span className="text-xs font-medium">Replying to {replyingTo.user}</span>
                    </div>
                    <p className="flex-1 text-xs text-white/50 truncate">
                        {replyingTo.text}
                    </p>
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setReplyingTo(null)}
                        className="h-6 w-6 text-white/50 hover:text-white hover:bg-white/10 rounded-full"
                    >
                        <X className="w-3.5 h-3.5" />
                    </Button>
                </div>
            )}

            {/* Voice recording banner */}
            {isRecording && (
                <div className="flex items-center gap-3 mb-3 mx-1 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-xl">
                    <span className="size-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-red-400 text-sm font-medium flex-1">
                        Recording {formatRecDuration(recordingSeconds)}
                    </span>
                    <button
                        onClick={cancelRecording}
                        className="text-white/50 hover:text-white text-xs"
                    >
                        Cancel
                    </button>
                </div>
            )}

            {/* Input Area */}
            <div className="flex items-center gap-2">
                {/* Text Input Container */}
                <div className="flex-1 flex items-center bg-[#0E0F18] rounded-full px-3 min-h-[44px] border border-white/[0.06]">
                    {/* Emoji Button */}
                    <button
                        onClick={() => setShowEmojiPicker((v) => !v)}
                        className={cn(
                            "p-1.5 transition-colors",
                            showEmojiPicker ? "text-yellow-400" : "text-white/70 hover:text-white"
                        )}
                        title="Emoji"
                    >
                        <Smile className="w-6 h-6" />
                    </button>

                    <textarea
                        ref={textareaRef}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={onKeyDown}
                        disabled={disabled || isRecording}
                        placeholder={
                            isRecording ? "Recording voice message…" :
                            isUploading ? "Uploading..." :
                            replyingTo ? `Reply to ${replyingTo.user}...` :
                            "Message..."
                        }
                        rows={1}
                        className={cn(
                            "flex-1 max-h-[100px] min-h-[24px] resize-none bg-transparent py-2.5 px-2",
                            "text-white placeholder:text-white/40 text-[15px] leading-normal",
                            "focus:outline-none",
                            "scrollbar-thin scrollbar-thumb-white/10"
                        )}
                    />

                    {/* Right side icons */}
                    {text.trim() ? (
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={handleSendText}
                            disabled={disabled}
                            className="h-8 px-3 text-[#0095F6] hover:text-white hover:bg-transparent font-semibold text-sm"
                        >
                            Send
                        </Button>
                    ) : isRecording ? (
                        /* Stop recording → send */
                        <button
                            onClick={stopRecording}
                            className="p-1.5 text-red-400 hover:text-red-300 transition-colors"
                            title="Send voice message"
                        >
                            <Square className="w-6 h-6 fill-current" />
                        </button>
                    ) : (
                        <div className="flex items-center gap-1">
                            {/* Mic: start/stop recording */}
                            <button
                                onClick={startRecording}
                                disabled={disabled}
                                className="p-1.5 text-white/70 hover:text-white transition-colors disabled:opacity-40"
                                title="Voice message"
                            >
                                <Mic className="w-6 h-6" />
                            </button>
                            <RichMediaSharing onSendMedia={handleSendMedia} className="p-1.5 text-white/70 hover:text-white" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
