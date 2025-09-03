"use client";

import { MessageUIComponentProps, useMessageContext, useChannelStateContext, useChatContext } from "stream-chat-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { Download, FileText, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "../SessionProvider";

export default function CustomMessage(props: MessageUIComponentProps) {
    const { message, isMyMessage } = useMessageContext();
    const { channel } = useChannelStateContext();
    const { client: chatClient } = useChatContext();
    const { user: currentUser } = useSession();
    const [imageError, setImageError] = useState<Record<string, boolean>>({});
    const [editing, setEditing] = useState(false);
    const [editText, setEditText] = useState("");

    const [reactionCounts, setReactionCounts] = useState<Record<string, number>>({});
    const [myReactions, setMyReactions] = useState<Set<string>>(new Set());

    useEffect(() => {
        // Initialize from message payload
        setReactionCounts(((message?.reaction_counts as any) || {}) as Record<string, number>);
        const myId = currentUser?.id;
        const s = new Set<string>();
        if (myId && message?.latest_reactions) {
            for (const r of message.latest_reactions) {
                const uid = (r as any).user_id || r.user?.id;
                if (uid === myId) s.add((r as any).type);
            }
        }
        setMyReactions(s);
    }, [message?.id, message?.reaction_counts, message?.latest_reactions, currentUser?.id]);

    if (!message) return null;

    const isOwn = isMyMessage();

    const handleImageError = (attachmentId: string) => {
        setImageError(prev => ({ ...prev, [attachmentId]: true }));
    };

    const formatFileSize = (bytes?: number) => {
        if (!bytes) return '';
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    };

    // Twemoji SVG mapping to ensure emoji render across platforms
    const emojiSrcMap: Record<string, string> = {
        like: '1f44d',       // 👍
        love: '2764-fe0f',   // ❤️
        haha: '1f602',       // 😂
        wow: '1f62e',        // 😮
        sad: '1f622',        // 😢
        angry: '1f621',      // 😡
    };

    return (
        <div className={cn(
            "group flex gap-3 p-3 max-w-md",
            isOwn ? "ml-auto flex-row-reverse" : "mr-auto"
        )}>
            {/* Avatar */}
            {!isOwn && (
                <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarImage src={message.user?.image} />
                    <AvatarFallback>
                        {message.user?.name?.[0] || message.user?.id?.[0] || '?'}
                    </AvatarFallback>
                </Avatar>
            )}

            {/* Message Content */}
            <div className={cn(
                "flex flex-col gap-2",
                isOwn ? "items-end" : "items-start"
            )}>
                {/* User name (for others' messages) */}
                {!isOwn && (
                    <span className="text-xs text-muted-foreground font-medium">
                        {message.user?.name || message.user?.id}
                    </span>
                )}

                {/* Text content or editor */}
                {!editing && message.text && (
                    <div className={cn(
                        "px-3 py-2 rounded-lg max-w-xs break-words",
                        isOwn
                            ? "bg-[#2f2f2f] text-white"
                            : "bg-[#111213] text-white"
                    )}>
                        {message.text}
                    </div>
                )}
                {editing && (
                    <div className="w-full max-w-xs">
                        <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            rows={3}
                            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20"
                        />
                        <div className={cn("mt-2 flex gap-2", isOwn ? "justify-end" : "justify-start") }>
                            <Button size="sm" variant="secondary" onClick={async () => {
                                try {
                                    if (!channel || !message?.id) return;
                                    const newText = editText.trim();
                                    await chatClient.updateMessage({ id: message.id, text: newText || message.text || "" });
                                    setEditing(false);
                                } catch (e) {
                                    console.error("Failed to update message", e);
                                }
                            }}>Save</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
                        </div>
                    </div>
                )}

                {/* Attachments */}
                {message.attachments && message.attachments.length > 0 && (
                    <div className="flex flex-col gap-2">
                        {message.attachments.map((attachment, index) => {
                            const attachmentId = `${message.id}-${index}`;
                            
                            // Image attachment
                            if (attachment.type === 'image' && attachment.image_url) {
                                return (
                                    <div key={attachmentId} className="relative">
                                        {!imageError[attachmentId] ? (
                                            <img
                                                src={attachment.image_url}
                                                alt={attachment.title || 'Image'}
                                                className="max-w-xs max-h-64 rounded-lg object-cover cursor-pointer"
                                                onError={() => handleImageError(attachmentId)}
                                                onClick={() => window.open(attachment.image_url, '_blank')}
                                            />
                                        ) : (
                                            <div className="w-48 h-32 bg-muted rounded-lg flex items-center justify-center">
                                                <span className="text-sm text-muted-foreground">
                                                    Failed to load image
                                                </span>
                                            </div>
                                        )}
                                        {attachment.title && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {attachment.title}
                                            </p>
                                        )}
                                    </div>
                                );
                            }

                            // Video attachment
                            if (attachment.type === 'video' && attachment.asset_url) {
                                return (
                                    <div key={attachmentId} className="relative">
                                        <video
                                            className="max-w-xs max-h-64 rounded-lg"
                                            controls
                                        >
                                            <source src={attachment.asset_url} type={attachment.mime_type} />
                                            Your browser does not support the video tag.
                                        </video>
                                        {attachment.title && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {attachment.title}
                                            </p>
                                        )}
                                    </div>
                                );
                            }

                            // File attachment
                            if (attachment.type === 'file' && attachment.asset_url) {
                                return (
                                    <div key={attachmentId} className="flex items-center gap-3 p-3 border rounded-lg max-w-xs">
                                        <FileText className="w-8 h-8 text-blue-500 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium truncate">
                                                {attachment.title || 'File'}
                                            </div>
                                            {attachment.file_size && (
                                                <div className="text-xs text-muted-foreground">
                                                    {formatFileSize(attachment.file_size)}
                                                </div>
                                            )}
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => window.open(attachment.asset_url, '_blank')}
                                            className="w-8 h-8 p-0"
                                        >
                                            <Download className="w-4 h-4" />
                                        </Button>
                                    </div>
                                );
                            }

                            return null;
                        })}
                    </div>
                )}

                {/* Actions: edit/delete for own messages */}
                {isOwn && !editing && (
                    <div className={cn("flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150", isOwn ? "justify-end" : "justify-start") }>
                        <Button
                            size="icon" variant="ghost"
                            onClick={() => { setEditText(message.text || ""); setEditing(true); }}
                            title="Edit message"
                            className="h-7 w-7"
                        >
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                            size="icon" variant="ghost"
                            onClick={async () => {
                                try {
                                    if (!channel || !message?.id) return;
                                    await chatClient.deleteMessage(message.id);
                                } catch (e) {
                                    console.error("Failed to delete message", e);
                                }
                            }}
                            title="Delete message"
                            className="h-7 w-7 text-red-400 hover:text-red-300"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                )}

                {/* Reactions bar */}
                {!editing && (
                    <div
                        className={cn(
                            "mt-1 flex gap-1 transition-opacity duration-150",
                            isOwn ? "justify-end" : "justify-start",
                            (Object.values(reactionCounts || {}).some((c) => (c as number) > 0) || myReactions.size > 0)
                                ? "opacity-100"
                                : "opacity-0 group-hover:opacity-100"
                        )}
                    >
                        {[
                          { type: 'like', emoji: '👍', label: 'Like' },
                          { type: 'love', emoji: '❤️', label: 'Love' },
                          { type: 'haha', emoji: '😂', label: 'Haha' },
                          { type: 'wow', emoji: '😮', label: 'Wow' },
                          { type: 'sad', emoji: '😢', label: 'Sad' },
                          { type: 'angry', emoji: '😡', label: 'Angry' },
                        ].map((r) => {
                            const count = (reactionCounts as any)?.[r.type] || 0;
                            const mine = myReactions.has(r.type);
                            const visibility = count > 0 || mine ? "inline-flex" : "hidden group-hover:inline-flex";
                            return (
                                <button
                                    key={r.type}
                                    className={cn(
                                        visibility,
                                        "items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px]",
                                        mine ? "border-green-400/40 bg-green-500/10" : ""
                                    )}
                                    title={r.label}
                                    onClick={async () => {
                                        try {
                                            if (!channel || !message?.id) return;
                                            if (myReactions.has(r.type)) {
                                                await (channel as any).deleteReaction(message.id, r.type);
                                                setMyReactions((prev) => {
                                                    const s = new Set(prev);
                                                    s.delete(r.type);
                                                    return s;
                                                });
                                                setReactionCounts((prev) => ({
                                                    ...prev,
                                                    [r.type]: Math.max(0, ((prev || {})[r.type] || 0) - 1),
                                                }));
                                            } else {
                                                await (channel as any).sendReaction(message.id, { type: r.type });
                                                setMyReactions((prev) => new Set(prev).add(r.type));
                                                setReactionCounts((prev) => ({
                                                    ...prev,
                                                    [r.type]: ((prev || {})[r.type] || 0) + 1,
                                                }));
                                            }
                                        } catch (e) {
                                            console.error("Reaction toggle failed", e);
                                        }
                                    }}
                                >
                                    <img
                                        src={`https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${(emojiSrcMap as any)[r.type]}.svg`}
                                        alt={r.label}
                                        width={14}
                                        height={14}
                                        className="align-middle"
                                    />
                                    {count > 0 && <span className="ml-1 opacity-80">{count}</span>}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Timestamp */}
                <span className="text-xs text-muted-foreground">
                    {message.created_at && new Date(message.created_at).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                    })}
                </span>
            </div>
        </div>
    );
}