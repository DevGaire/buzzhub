"use client";

import { useChannelActionContext, useChannelStateContext } from "stream-chat-react";
import RichMediaSharing from "./RichMediaSharing";
import { useUploadThing } from "@/lib/uploadthing";
import { toast } from "@/components/ui/use-toast";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { useSession } from "../SessionProvider";

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

    const [text, setText] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

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

    // Autosize textarea on text changes
    useEffect(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = Math.min(el.scrollHeight, 160) + "px"; // cap at ~8 lines
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

    const handleSendText = useCallback(async () => {
        if (!channel?.id) return;
        const content = text.trim();
        if (!content) return;
        setIsSending(true);
        try {
            await sendMessage({ text: content });
            // Clear draft on success
            if (draftKey) localStorage.removeItem(draftKey);
            setText("");

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
    }, [channel?.id, draftKey, sendMessage, text]);

    const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void handleSendText();
        }
    }, [handleSendText]);

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
        <div className="flex items-end gap-2 p-2">
            <RichMediaSharing onSendMedia={handleSendMedia} className="flex-shrink-0" />
            <div className="flex-1 flex items-end gap-2">
                <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={onKeyDown}
                    disabled={disabled}
                    placeholder={isUploading ? "Uploading..." : "Message..."}
                    rows={1}
                    className="w-full max-h-40 min-h-[40px] resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white placeholder:text-white/50 focus:border-white/20 focus:outline-none"
                />
                <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={handleSendText}
                    disabled={disabled || !text.trim()}
                    title="Send"
                    className="shrink-0"
                >
                    <Send className="w-5 h-5" />
                </Button>
            </div>
        </div>
    );
}