"use client";

import { MessageUIComponentProps, useMessageContext, useChannelStateContext, useChatContext } from "stream-chat-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useEffect, useState, useCallback, createContext, useContext } from "react";
import {
    Download, FileText, Pencil, Trash2, Reply, MoreHorizontal,
    Check, CheckCheck, Clock, X, ChevronLeft, ChevronRight,
    Play, Pause, Volume2, VolumeX, Maximize2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "../SessionProvider";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Reply context for managing reply state across components
interface ReplyContextType {
    replyingTo: { id: string; text: string; user: string } | null;
    setReplyingTo: (msg: { id: string; text: string; user: string } | null) => void;
}

export const ReplyContext = createContext<ReplyContextType>({
    replyingTo: null,
    setReplyingTo: () => {},
});

export const useReply = () => useContext(ReplyContext);

// Lightbox component for media preview
interface LightboxProps {
    isOpen: boolean;
    onClose: () => void;
    media: Array<{ url: string; type: 'image' | 'video'; title?: string }>;
    initialIndex: number;
}

function MediaLightbox({ isOpen, onClose, media, initialIndex }: LightboxProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    useEffect(() => {
        setCurrentIndex(initialIndex);
    }, [initialIndex]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft') setCurrentIndex(prev => Math.max(0, prev - 1));
            if (e.key === 'ArrowRight') setCurrentIndex(prev => Math.min(media.length - 1, prev + 1));
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, media.length, onClose]);

    if (!isOpen || media.length === 0) return null;

    const current = media[currentIndex];

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
            onClick={onClose}
        >
            {/* Close button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
                <X className="w-6 h-6 text-white" />
            </button>

            {/* Navigation arrows */}
            {media.length > 1 && (
                <>
                    <button
                        onClick={(e) => { e.stopPropagation(); setCurrentIndex(prev => Math.max(0, prev - 1)); }}
                        disabled={currentIndex === 0}
                        className="absolute left-4 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 transition-colors"
                    >
                        <ChevronLeft className="w-6 h-6 text-white" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setCurrentIndex(prev => Math.min(media.length - 1, prev + 1)); }}
                        disabled={currentIndex === media.length - 1}
                        className="absolute right-4 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 transition-colors"
                    >
                        <ChevronRight className="w-6 h-6 text-white" />
                    </button>
                </>
            )}

            {/* Media content */}
            <div
                className="max-w-[90vw] max-h-[90vh] flex items-center justify-center"
                onClick={(e) => e.stopPropagation()}
            >
                {current.type === 'image' ? (
                    <img
                        src={current.url}
                        alt={current.title || 'Image'}
                        className="max-w-full max-h-[90vh] object-contain rounded-lg"
                    />
                ) : (
                    <div className="relative">
                        <video
                            src={current.url}
                            className="max-w-full max-h-[90vh] rounded-lg"
                            controls
                            autoPlay
                            muted={isMuted}
                        />
                    </div>
                )}
            </div>

            {/* Counter */}
            {media.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/10 text-white text-sm">
                    {currentIndex + 1} / {media.length}
                </div>
            )}

            {/* Title */}
            {current.title && (
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-black/50 text-white text-sm max-w-md truncate">
                    {current.title}
                </div>
            )}
        </div>
    );
}

// Per-sender name color (Discord-style: only the name is colored, not the message)
const SENDER_NAME_COLORS = [
    "text-rose-500 dark:text-rose-400",
    "text-amber-600 dark:text-amber-400",
    "text-emerald-600 dark:text-emerald-400",
    "text-sky-600 dark:text-sky-400",
    "text-violet-600 dark:text-violet-400",
    "text-fuchsia-600 dark:text-fuchsia-400",
    "text-teal-600 dark:text-teal-400",
];

function senderNameColor(userId?: string) {
    if (!userId) return SENDER_NAME_COLORS[0];
    let hash = 0;
    for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) | 0;
    return SENDER_NAME_COLORS[Math.abs(hash) % SENDER_NAME_COLORS.length];
}

// Format a Discord-style cluster header timestamp: "Today at 12:34 PM"
function formatClusterTime(date: string | Date) {
    const d = new Date(date);
    const now = new Date();
    const isSameDay = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    const time = new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    }).format(d);

    if (isSameDay) return `Today at ${time}`;
    if (isYesterday) return `Yesterday at ${time}`;
    return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} at ${time}`;
}

// Message status indicator
type MessageStatus = "sending" | "sent" | "delivered" | "read" | "failed";

function StatusIndicator({ status }: { status: MessageStatus }) {
    switch (status) {
        case "sending":
            return <Clock className="w-3 h-3 text-zinc-400 dark:text-zinc-500 animate-pulse" />;
        case "sent":
            return <Check className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />;
        case "delivered":
            return <CheckCheck className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />;
        case "read":
            return <CheckCheck className="w-3 h-3 text-[#5865f2]" />;
        case "failed":
            return <Clock className="w-3 h-3 text-red-500" />;
        default:
            return null;
    }
}

export default function CustomMessage(props: MessageUIComponentProps) {
    const { message, isMyMessage, threadList, handleOpenThread, groupStyles } = useMessageContext();
    const { channel } = useChannelStateContext();
    const { client: chatClient } = useChatContext();
    const { user: currentUser } = useSession();
    const [imageError, setImageError] = useState<Record<string, boolean>>({});
    const [editing, setEditing] = useState(false);
    const [editText, setEditText] = useState("");
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [showActions, setShowActions] = useState(false);

    const [reactionCounts, setReactionCounts] = useState<Record<string, number>>({});
    const [myReactions, setMyReactions] = useState<Set<string>>(new Set());

    // Reply context
    const { setReplyingTo } = useReply();

    useEffect(() => {
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

    // Group position — used to collapse repeated avatars like Instagram
    const groupPos = (groupStyles?.[0] as string | undefined) || "single";
    const isLastInGroup = groupPos === "bottom" || groupPos === "single";
    const isFirstInGroup = groupPos === "top" || groupPos === "single";

    // Determine message status based on Stream Chat's read state
    const getMessageStatus = (): MessageStatus => {
        if (message.status === 'sending') return 'sending';
        if (message.status === 'failed') return 'failed';

        // Check read receipts from channel state
        const readData = (channel?.state as any)?.read || {};
        const otherReads = Object.entries(readData).filter(([id]) => id !== currentUser?.id);

        for (const [, data] of otherReads) {
            const lastRead = (data as any)?.last_read;
            if (lastRead && message.created_at && new Date(lastRead) >= new Date(message.created_at)) {
                return 'read';
            }
        }

        return 'delivered';
    };

    const handleImageError = (attachmentId: string) => {
        setImageError(prev => ({ ...prev, [attachmentId]: true }));
    };

    const formatFileSize = (bytes?: number) => {
        if (!bytes) return '';
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    };

    const formatTime = (date: string | Date) => {
        return new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        }).format(new Date(date));
    };

    // Collect media for lightbox
    const mediaItems = (message.attachments || [])
        .filter(att => att.type === 'image' || att.type === 'video')
        .map(att => ({
            url: att.type === 'image' ? att.image_url! : att.asset_url!,
            type: att.type as 'image' | 'video',
            title: att.title
        }));

    const openLightbox = (index: number) => {
        setLightboxIndex(index);
        setLightboxOpen(true);
    };

    const handleReply = () => {
        setReplyingTo({
            id: message.id,
            text: message.text || '[Media]',
            user: message.user?.name || message.user?.id || 'Unknown'
        });
    };

    const handleDelete = async () => {
        try {
            if (!channel || !message?.id) return;
            await chatClient.deleteMessage(message.id);
        } catch (e) {
            console.error("Failed to delete message", e);
        }
    };

    const reactions = [
        { type: 'like', emoji: '👍', label: 'Like' },
        { type: 'love', emoji: '❤️', label: 'Love' },
        { type: 'haha', emoji: '😂', label: 'Haha' },
        { type: 'wow', emoji: '😮', label: 'Wow' },
        { type: 'sad', emoji: '😢', label: 'Sad' },
        { type: 'angry', emoji: '😡', label: 'Angry' },
    ];

    const toggleReaction = async (type: string) => {
        try {
            if (!channel || !message?.id) return;
            if (myReactions.has(type)) {
                await (channel as any).deleteReaction(message.id, type);
                setMyReactions(prev => {
                    const s = new Set(prev);
                    s.delete(type);
                    return s;
                });
                setReactionCounts(prev => ({
                    ...prev,
                    [type]: Math.max(0, (prev[type] || 0) - 1),
                }));
            } else {
                await (channel as any).sendReaction(message.id, { type });
                setMyReactions(prev => new Set(prev).add(type));
                setReactionCounts(prev => ({
                    ...prev,
                    [type]: (prev[type] || 0) + 1,
                }));
            }
        } catch (e) {
            console.error("Reaction toggle failed", e);
        }
    };

    // Check if message is a reply
    const quotedMessage = message.quoted_message;

    // Grid layout for multiple images
    const imageAttachments = (message.attachments || []).filter(att => att.type === 'image' && att.image_url);
    const videoAttachments = (message.attachments || []).filter(att => att.type === 'video' && att.asset_url);
    const fileAttachments = (message.attachments || []).filter(att => att.type === 'file' && att.asset_url);

    const getImageGridClass = (count: number) => {
        if (count === 1) return 'grid-cols-1';
        if (count === 2) return 'grid-cols-2';
        if (count === 3) return 'grid-cols-2';
        return 'grid-cols-2';
    };

    const avatarUrl = message.user?.image as string | undefined;
    const senderName = (message.user?.name as string | undefined) || message.user?.id || "Unknown";
    const avatarFallback = senderName[0]?.toUpperCase() ?? "?";
    const nameColor = senderNameColor(message.user?.id);

    return (
        <>
            <div
                className={cn(
                    "group relative flex items-start gap-3 px-4 hover:bg-black/[0.03] dark:hover:bg-white/[0.025]",
                    isFirstInGroup ? "pt-3" : "pt-0",
                    isLastInGroup ? "pb-1" : "pb-[2px]",
                )}
                onMouseEnter={() => setShowActions(true)}
                onMouseLeave={() => setShowActions(false)}
            >
                {/* Avatar column — 40px wide, only shows avatar on first in cluster */}
                <div className="flex-shrink-0 w-10">
                    {isFirstInGroup ? (
                        <Avatar className="h-10 w-10 mt-0.5">
                            <AvatarImage src={avatarUrl} className="object-cover" />
                            <AvatarFallback className="bg-[#5865f2] text-white text-sm font-semibold">
                                {avatarFallback}
                            </AvatarFallback>
                        </Avatar>
                    ) : (
                        <span className="block w-10 text-[10px] text-zinc-500 dark:text-zinc-500 leading-[22px] tabular-nums opacity-0 group-hover:opacity-100 transition-opacity text-center select-none">
                            {message.created_at && formatTime(message.created_at)}
                        </span>
                    )}
                </div>

                {/* Content column */}
                <div className="flex-1 min-w-0">
                    {/* Cluster header: sender name + timestamp */}
                    {isFirstInGroup && (
                        <div className="flex items-baseline gap-2 mb-0.5 flex-wrap">
                            <span className={cn("text-[15px] font-semibold leading-tight", nameColor)}>
                                {senderName}
                            </span>
                            {isOwn && (
                                <span className="px-1 py-px text-[10px] font-semibold bg-[#5865f2] text-white rounded leading-none align-middle">
                                    YOU
                                </span>
                            )}
                            {message.created_at && (
                                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight">
                                    {formatClusterTime(message.created_at)}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Quoted/Reply message */}
                    {quotedMessage && (
                        <div className="flex items-start gap-2 mb-1 pl-2 border-l-2 border-zinc-300 dark:border-zinc-600 text-[13px] text-zinc-500 dark:text-zinc-400">
                            <Reply className="w-3 h-3 mt-1 flex-shrink-0 opacity-60" />
                            <div className="min-w-0 flex flex-wrap items-baseline gap-x-2">
                                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                                    {quotedMessage.user?.name || 'Unknown'}
                                </span>
                                <span className="truncate opacity-90">
                                    {quotedMessage.text || '[Media]'}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Text — flat, no bubble */}
                    {!editing && message.text && (
                        <p className="whitespace-pre-wrap break-words text-[15px] leading-[1.5] text-zinc-900 dark:text-[#dbdee1]">
                            {message.text}
                        </p>
                    )}

                    {editing && (
                        <div className="w-full max-w-xl mt-1">
                            <textarea
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                rows={3}
                                autoFocus
                                className="w-full rounded-md border border-black/[0.08] dark:border-white/[0.08] bg-[#ebedef] dark:bg-[#383a40] px-3 py-2 text-[15px] text-zinc-900 dark:text-[#dbdee1] focus:outline-none focus:ring-1 focus:ring-[#5865f2] resize-none"
                            />
                            <div className="mt-2 flex gap-2 justify-start">
                                <Button
                                    size="sm"
                                    className="bg-[#5865f2] hover:bg-[#4752c4] text-white h-7 px-3"
                                    onClick={async () => {
                                        try {
                                            if (!channel || !message?.id) return;
                                            const newText = editText.trim();
                                            await chatClient.updateMessage({ id: message.id, text: newText || message.text || "" });
                                            setEditing(false);
                                        } catch (e) {
                                            console.error("Failed to update message", e);
                                        }
                                    }}
                                >
                                    Save
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="h-7 px-3 text-zinc-700 dark:text-zinc-300">
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Image attachments — grid layout */}
                    {imageAttachments.length > 0 && (
                        <div className={cn(
                            "grid gap-1 rounded-lg overflow-hidden mt-1",
                            getImageGridClass(imageAttachments.length),
                            "max-w-[400px]"
                        )}>
                            {imageAttachments.map((attachment, index) => {
                                const attachmentId = `${message.id}-img-${index}`;
                                const mediaIndex = mediaItems.findIndex(m => m.url === attachment.image_url);
                                return (
                                    <div
                                        key={attachmentId}
                                        className={cn(
                                            "relative cursor-pointer group/img overflow-hidden",
                                            imageAttachments.length === 3 && index === 0 && "row-span-2",
                                            imageAttachments.length === 1 ? "aspect-auto" : "aspect-square"
                                        )}
                                        onClick={() => openLightbox(mediaIndex >= 0 ? mediaIndex : 0)}
                                    >
                                        {!imageError[attachmentId] ? (
                                            <>
                                                <img
                                                    src={attachment.image_url}
                                                    alt={attachment.title || 'Image'}
                                                    className="w-full h-full object-cover transition-transform duration-200 group-hover/img:scale-[1.02]"
                                                    onError={() => handleImageError(attachmentId)}
                                                />
                                                <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/15 transition-colors flex items-center justify-center">
                                                    <Maximize2 className="w-5 h-5 text-white opacity-0 group-hover/img:opacity-100 transition-opacity" />
                                                </div>
                                            </>
                                        ) : (
                                            <div className="w-full h-32 bg-black/[0.04] dark:bg-white/[0.04] flex items-center justify-center">
                                                <span className="text-sm text-zinc-500 dark:text-zinc-400">Failed to load</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Video attachments */}
                    {videoAttachments.map((attachment, index) => (
                        <div key={`${message.id}-vid-${index}`} className="max-w-[400px] rounded-lg overflow-hidden mt-1">
                            <video className="w-full" controls preload="metadata">
                                <source src={attachment.asset_url} type={attachment.mime_type} />
                            </video>
                        </div>
                    ))}

                    {/* File attachments */}
                    {fileAttachments.map((attachment, index) => (
                        <div
                            key={`${message.id}-file-${index}`}
                            className="flex items-center gap-3 px-3 py-2 rounded-md max-w-[400px] cursor-pointer mt-1 bg-black/[0.04] dark:bg-white/[0.04] hover:bg-black/[0.06] dark:hover:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.06] transition-colors"
                            onClick={() => window.open(attachment.asset_url, '_blank')}
                        >
                            <FileText className="w-5 h-5 text-zinc-500 dark:text-zinc-400 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="text-[14px] font-medium truncate text-zinc-900 dark:text-zinc-100">
                                    {attachment.title || 'File'}
                                </div>
                                {attachment.file_size && (
                                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                        {formatFileSize(attachment.file_size)}
                                    </div>
                                )}
                            </div>
                            <Download className="w-4 h-4 text-zinc-500 dark:text-zinc-400 flex-shrink-0" />
                        </div>
                    ))}

                    {/* Status — only on last own message, inline */}
                    {isOwn && isLastInGroup && (
                        <div className="mt-0.5 flex items-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-500 select-none">
                            <StatusIndicator status={getMessageStatus()} />
                        </div>
                    )}

                    {/* Reactions — Discord pill style */}
                    {!editing && Object.values(reactionCounts).some(c => c > 0) && (
                        <div className="flex flex-wrap gap-1 mt-1">
                            {reactions.map((r) => {
                                const count = reactionCounts[r.type] || 0;
                                if (count === 0) return null;
                                const mine = myReactions.has(r.type);
                                return (
                                    <button
                                        key={r.type}
                                        onClick={() => toggleReaction(r.type)}
                                        className={cn(
                                            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[12px] transition-colors",
                                            mine
                                                ? "bg-[#5865f2]/15 border-[#5865f2]/40 text-[#5865f2]"
                                                : "bg-black/[0.04] dark:bg-white/[0.04] border-transparent text-zinc-600 dark:text-zinc-300 hover:bg-black/[0.06] dark:hover:bg-white/[0.06] hover:border-black/[0.1] dark:hover:border-white/[0.1]"
                                        )}
                                    >
                                        <span className="text-[13px] leading-none">{r.emoji}</span>
                                        <span className="font-medium tabular-nums leading-none">{count}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Hover actions — Discord-style floating bar at top-right */}
                <div className={cn(
                    "absolute right-4 -top-3 flex items-center bg-white dark:bg-[#2b2d31] border border-black/[0.08] dark:border-black/40 rounded shadow-md transition-opacity duration-100 z-10",
                    showActions ? "opacity-100" : "opacity-0 pointer-events-none"
                )}>
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={handleReply}
                        title="Reply"
                        className="h-7 w-7 text-zinc-600 dark:text-[#b5bac1] hover:text-zinc-900 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] rounded-none"
                    >
                        <Reply className="h-3.5 w-3.5" />
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                size="icon"
                                variant="ghost"
                                title="More"
                                className="h-7 w-7 text-zinc-600 dark:text-[#b5bac1] hover:text-zinc-900 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] rounded-none"
                            >
                                <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            align="end"
                            className="bg-white dark:bg-[#2b2d31] border-black/[0.08] dark:border-black/40 p-1 shadow-lg rounded-md min-w-[180px]"
                        >
                            {/* Quick reactions */}
                            <div className="flex items-center gap-0.5 px-1 py-1 mb-1 border-b border-black/[0.06] dark:border-white/[0.06]">
                                {reactions.map((r) => (
                                    <button
                                        key={r.type}
                                        onClick={() => toggleReaction(r.type)}
                                        className={cn(
                                            "p-1 rounded hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors text-base hover:scale-110",
                                            myReactions.has(r.type) && "bg-[#5865f2]/15"
                                        )}
                                        title={r.label}
                                    >
                                        {r.emoji}
                                    </button>
                                ))}
                            </div>
                            {isOwn && (
                                <>
                                    <DropdownMenuItem
                                        onClick={() => { setEditText(message.text || ""); setEditing(true); }}
                                        className="text-zinc-700 dark:text-zinc-200 focus:bg-black/[0.04] dark:focus:bg-white/[0.06] rounded cursor-pointer text-[14px]"
                                    >
                                        <Pencil className="w-3.5 h-3.5 mr-2 opacity-60" />
                                        Edit Message
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={handleDelete}
                                        className="text-red-500 focus:bg-red-500/10 focus:text-red-500 rounded cursor-pointer text-[14px]"
                                    >
                                        <Trash2 className="w-3.5 h-3.5 mr-2 opacity-60" />
                                        Delete Message
                                    </DropdownMenuItem>
                                </>
                            )}
                            <DropdownMenuItem
                                onClick={handleReply}
                                className="text-zinc-700 dark:text-zinc-200 focus:bg-black/[0.04] dark:focus:bg-white/[0.06] rounded cursor-pointer text-[14px]"
                            >
                                <Reply className="w-3.5 h-3.5 mr-2 opacity-60" />
                                Reply
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Media Lightbox */}
            <MediaLightbox
                isOpen={lightboxOpen}
                onClose={() => setLightboxOpen(false)}
                media={mediaItems}
                initialIndex={lightboxIndex}
            />
        </>
    );
}
