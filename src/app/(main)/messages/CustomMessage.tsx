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

// Per-sender accent palette for received bubbles (group chat distinguishability)
const SENDER_ACCENTS = [
    { bg: "bg-[#252738]", border: "border-purple-400/15", name: "text-purple-300" },
    { bg: "bg-[#252738]", border: "border-blue-400/15", name: "text-blue-300" },
    { bg: "bg-[#252738]", border: "border-amber-400/15", name: "text-amber-300" },
    { bg: "bg-[#252738]", border: "border-emerald-400/15", name: "text-emerald-300" },
    { bg: "bg-[#252738]", border: "border-pink-400/15", name: "text-pink-300" },
    { bg: "bg-[#252738]", border: "border-indigo-400/15", name: "text-indigo-300" },
];

function senderAccent(userId?: string) {
    if (!userId) return SENDER_ACCENTS[0];
    let hash = 0;
    for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) | 0;
    return SENDER_ACCENTS[Math.abs(hash) % SENDER_ACCENTS.length];
}

// Message status indicator
type MessageStatus = "sending" | "sent" | "delivered" | "read" | "failed";

function StatusIndicator({ status }: { status: MessageStatus }) {
    switch (status) {
        case "sending":
            return <Clock className="w-3.5 h-3.5 text-blue-200 animate-pulse" />;
        case "sent":
            return <Check className="w-3.5 h-3.5 text-blue-200" />;
        case "delivered":
            return <CheckCheck className="w-3.5 h-3.5 text-blue-200" />;
        case "read":
            return <CheckCheck className="w-3.5 h-3.5 text-green-400" />;
        case "failed":
            return <Clock className="w-3.5 h-3.5 text-red-400" />;
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
    const accent = senderAccent(message.user?.id);

    return (
        <>
            <div
                className={cn(
                    "group flex items-start gap-2 px-4",
                    isLastInGroup ? "pb-1.5" : "pb-[2px]",
                    isFirstInGroup ? "pt-3" : "pt-0",
                    isOwn ? "flex-row-reverse" : "flex-row"
                )}
                onMouseEnter={() => setShowActions(true)}
                onMouseLeave={() => setShowActions(false)}
            >
                {/* Avatar — appears at the top of each received cluster */}
                {!isOwn && (
                    <div className="flex-shrink-0 w-8">
                        {isFirstInGroup && (
                            <Avatar className="h-8 w-8 mt-[18px]">
                                <AvatarImage src={avatarUrl} className="object-cover" />
                                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-[11px] font-semibold">
                                    {avatarFallback}
                                </AvatarFallback>
                            </Avatar>
                        )}
                    </div>
                )}

                {/* Message bubble + meta */}
                <div className={cn(
                    "flex flex-col gap-1 max-w-[65%] min-w-0",
                    isOwn ? "items-end" : "items-start"
                )}>
                    {/* Sender name + time — only at top of received cluster */}
                    {!isOwn && isFirstInGroup && (
                        <div className="flex items-baseline gap-2 px-1">
                            <span className={cn("text-[12px] font-semibold", accent.name)}>
                                {senderName}
                            </span>
                            {message.created_at && (
                                <span className="text-[11px] text-white/40">
                                    {formatTime(message.created_at)}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Quoted/Reply message */}
                    {quotedMessage && (
                        <div className={cn(
                            "flex items-start gap-2 px-3 py-2 rounded-2xl text-xs max-w-full",
                            "border-l-[3px]",
                            isOwn
                                ? "border-blue-400/60 bg-blue-500/10 text-blue-200"
                                : "border-purple-400/60 bg-white/5 text-white/60"
                        )}>
                            <Reply className="w-3 h-3 mt-0.5 flex-shrink-0 opacity-60" />
                            <div className="min-w-0">
                                <span className={cn("font-semibold", isOwn ? "text-blue-300" : "text-purple-300")}>
                                    {quotedMessage.user?.name || 'Unknown'}
                                </span>
                                <p className="truncate opacity-70 mt-0.5">
                                    {quotedMessage.text || '[Media]'}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Text bubble */}
                    {!editing && message.text && (
                        <div className={cn(
                            "relative px-[14px] py-[9px] break-words shadow-sm",
                            isOwn
                                ? "bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] text-white rounded-[20px] rounded-br-[6px]"
                                : cn(
                                    accent.bg,
                                    "border",
                                    accent.border,
                                    "text-white rounded-[20px] rounded-tl-[6px]"
                                )
                        )}>
                            <p className="whitespace-pre-wrap text-[14.5px] leading-[1.4]">{message.text}</p>
                        </div>
                    )}

                    {editing && (
                        <div className="w-full max-w-sm">
                            <textarea
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                rows={3}
                                autoFocus
                                className="w-full rounded-xl border border-blue-500/30 bg-[#1a1a1b] px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                            />
                            <div className={cn("mt-2 flex gap-2", isOwn ? "justify-end" : "justify-start")}>
                                <Button
                                    size="sm"
                                    className="bg-blue-500 hover:bg-blue-600 text-white"
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
                                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Image attachments — grid layout */}
                    {imageAttachments.length > 0 && (
                        <div className={cn(
                            "grid gap-1 rounded-2xl overflow-hidden",
                            getImageGridClass(imageAttachments.length),
                            imageAttachments.length === 1 ? "max-w-[280px]" : "max-w-[320px]"
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
                                                    className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-105"
                                                    onError={() => handleImageError(attachmentId)}
                                                />
                                                <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors flex items-center justify-center">
                                                    <Maximize2 className="w-6 h-6 text-white opacity-0 group-hover/img:opacity-100 transition-opacity" />
                                                </div>
                                            </>
                                        ) : (
                                            <div className="w-full h-32 bg-white/5 flex items-center justify-center">
                                                <span className="text-sm text-white/40">Failed to load</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Video attachments */}
                    {videoAttachments.map((attachment, index) => (
                        <div key={`${message.id}-vid-${index}`} className="max-w-[280px] rounded-2xl overflow-hidden shadow-lg">
                            <video className="w-full" controls preload="metadata">
                                <source src={attachment.asset_url} type={attachment.mime_type} />
                            </video>
                        </div>
                    ))}

                    {/* File attachments */}
                    {fileAttachments.map((attachment, index) => (
                        <div
                            key={`${message.id}-file-${index}`}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-2xl max-w-[280px] cursor-pointer",
                                "transition-all duration-200",
                                isOwn
                                    ? "bg-blue-700/40 hover:bg-blue-700/60 border border-blue-400/20"
                                    : "bg-white/5 hover:bg-white/10 border border-white/[0.06]"
                            )}
                            onClick={() => window.open(attachment.asset_url, '_blank')}
                        >
                            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                                <FileText className="w-5 h-5 text-blue-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate text-white">
                                    {attachment.title || 'File'}
                                </div>
                                {attachment.file_size && (
                                    <div className="text-xs text-white/40">
                                        {formatFileSize(attachment.file_size)}
                                    </div>
                                )}
                            </div>
                            <Download className="w-4 h-4 text-white/40 flex-shrink-0" />
                        </div>
                    ))}

                    {/* Timestamp + status — timestamp reveals on hover; status only on last own message */}
                    {isLastInGroup ? (
                        <div className={cn(
                            "flex items-center gap-1.5 px-1",
                            "text-[11px] text-white/40 select-none"
                        )}>
                            {message.created_at ? (
                                <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    {formatTime(message.created_at)}
                                </span>
                            ) : null}
                            {isOwn ? <StatusIndicator status={getMessageStatus()} /> : null}
                        </div>
                    ) : null}

                    {/* Reactions */}
                    {!editing && Object.values(reactionCounts).some(c => c > 0) && (
                        <div className={cn(
                            "flex items-center gap-1 -mt-0.5",
                            isOwn ? "justify-end" : "justify-start"
                        )}>
                            <div className="inline-flex items-center bg-[#1e1e1e] border border-white/[0.08] rounded-full px-2.5 py-1 gap-1.5 shadow-lg">
                                {reactions.map((r) => {
                                    const count = reactionCounts[r.type] || 0;
                                    if (count === 0) return null;
                                    const mine = myReactions.has(r.type);
                                    return (
                                        <button
                                            key={r.type}
                                            className={cn(
                                                "inline-flex items-center gap-0.5 hover:scale-110 transition-transform",
                                                mine ? "opacity-100" : "opacity-70"
                                            )}
                                            onClick={() => toggleReaction(r.type)}
                                        >
                                            <span className="text-[13px]">{r.emoji}</span>
                                            <span className={cn("text-[11px]", mine ? "text-blue-400" : "text-white/50")}>{count}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Hover actions */}
                <div className={cn(
                    "flex items-center gap-0.5 self-center mb-5 transition-all duration-150",
                    showActions ? "opacity-100 translate-x-0" : "opacity-0",
                    isOwn ? "flex-row pr-1" : "flex-row-reverse pl-1"
                )}>
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={handleReply}
                        title="Reply"
                        className="h-7 w-7 text-white/40 hover:text-white hover:bg-white/10 rounded-full"
                    >
                        <Reply className="h-3.5 w-3.5" />
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                size="icon"
                                variant="ghost"
                                title="More"
                                className="h-7 w-7 text-white/40 hover:text-white hover:bg-white/10 rounded-full"
                            >
                                <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            align={isOwn ? "end" : "start"}
                            className="bg-[#1e1e1e] border-white/10 p-1.5 shadow-2xl rounded-2xl"
                        >
                            {/* Quick reactions */}
                            <div className="flex items-center gap-0.5 px-1.5 py-1 mb-1.5">
                                {reactions.map((r) => (
                                    <button
                                        key={r.type}
                                        onClick={() => toggleReaction(r.type)}
                                        className={cn(
                                            "p-1.5 rounded-full hover:bg-white/10 transition-all text-lg hover:scale-125",
                                            myReactions.has(r.type) && "bg-blue-500/20 scale-110"
                                        )}
                                        title={r.label}
                                    >
                                        {r.emoji}
                                    </button>
                                ))}
                            </div>
                            <div className="h-px bg-white/[0.08] mx-1 mb-1" />
                            {isOwn && (
                                <>
                                    <DropdownMenuItem
                                        onClick={() => { setEditText(message.text || ""); setEditing(true); }}
                                        className="text-gray-200 focus:bg-white/10 rounded-xl cursor-pointer"
                                    >
                                        <Pencil className="w-4 h-4 mr-2 opacity-60" />
                                        Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={handleDelete}
                                        className="text-red-400 focus:bg-red-500/10 focus:text-red-400 rounded-xl cursor-pointer"
                                    >
                                        <Trash2 className="w-4 h-4 mr-2 opacity-60" />
                                        Delete
                                    </DropdownMenuItem>
                                </>
                            )}
                            <DropdownMenuItem
                                onClick={handleReply}
                                className="text-gray-200 focus:bg-white/10 rounded-xl cursor-pointer"
                            >
                                <Reply className="w-4 h-4 mr-2 opacity-60" />
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
