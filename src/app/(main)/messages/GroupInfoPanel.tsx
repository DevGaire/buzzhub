"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    FileText,
    LinkIcon,
    X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useChatContext } from "stream-chat-react";

interface GroupInfoPanelProps {
    open: boolean;
    onClose: () => void;
}

interface PhotoItem { url: string; title?: string }
interface FileItem { url: string; title: string; mime?: string; size?: number }
interface LinkItem { url: string; title?: string; image?: string; description?: string }

function formatBytes(bytes?: number) {
    if (!bytes) return "";
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${sizes[i]}`;
}

function fileTagFromMime(mime?: string, title?: string) {
    if (mime) {
        if (mime.includes("pdf")) return "PDF";
        if (mime.includes("word") || mime.includes("doc")) return "DOC";
        if (mime.includes("sheet") || mime.includes("excel") || mime.includes("csv")) return "XLS";
        if (mime.includes("presentation") || mime.includes("powerpoint")) return "PPT";
        if (mime.startsWith("image/")) return "IMG";
        if (mime.startsWith("video/")) return "VID";
    }
    const ext = title?.split(".").pop()?.toUpperCase();
    return ext && ext.length <= 4 ? ext : "FILE";
}

export default function GroupInfoPanel({ open, onClose }: GroupInfoPanelProps) {
    const { client, channel } = useChatContext();
    const [, force] = useState(0);

    useEffect(() => {
        if (!channel) return;
        const handler = () => force((n) => n + 1);
        const subs = [
            channel.on("message.new", handler),
            channel.on("user.presence.changed", handler),
            channel.on("member.added", handler),
            channel.on("member.removed", handler),
        ];
        return () => subs.forEach((s) => s.unsubscribe());
    }, [channel]);

    const summary = useMemo(() => {
        if (!channel) return null;
        const all = Object.values(channel.state.members);
        const others = all.filter((m) => m.user_id !== client.userID);
        const oneOnOne = others.length === 1;
        return {
            oneOnOne,
            otherUser: oneOnOne ? others[0]?.user : undefined,
            members: all,
            channelName:
                (channel.data?.name as string | undefined) ||
                (oneOnOne ? others[0]?.user?.name || "Unknown" : "Group chat"),
            channelImage:
                (channel.data?.image as string | undefined) ||
                (oneOnOne ? (others[0]?.user?.image as string | undefined) : undefined),
        };
    }, [channel, client.userID]);

    const media = useMemo(() => {
        const photos: PhotoItem[] = [];
        const files: FileItem[] = [];
        const links: LinkItem[] = [];
        if (!channel) return { photos, files, links };

        for (const m of channel.state.messages) {
            for (const att of m.attachments || []) {
                if (att.type === "image" && att.image_url) {
                    photos.push({ url: att.image_url, title: att.title });
                } else if (att.type === "file" && att.asset_url) {
                    files.push({
                        url: att.asset_url,
                        title: att.title || "File",
                        mime: att.mime_type,
                        size: att.file_size,
                    });
                }
            }
            // crude link detection from message text
            const text = m.text || "";
            const matches = text.match(/https?:\/\/[^\s)]+/g);
            if (matches) {
                for (const url of matches) {
                    links.push({ url, title: url });
                }
            }
        }
        return {
            photos: photos.slice(-12).reverse(),
            files: files.slice(-8).reverse(),
            links: links.slice(-6).reverse(),
        };
    }, [channel]);

    if (!channel || !summary) {
        // Closed-by-default: don't take space when no channel selected
        return null;
    }

    const { channelName } = summary;

    // Closed by default — only render when explicitly open
    if (!open) return null;

    return (
        <aside
            className={cn(
                "h-full bg-[#f2f3f5] dark:bg-[#2b2d31] border-l border-black/[0.06] dark:border-black/40 overflow-hidden flex-shrink-0 flex flex-col",
                "w-full md:w-[300px] xl:w-[320px]",
                "absolute md:relative inset-0 z-50 md:z-auto",
            )}
        >
            <div className="flex items-center justify-between h-12 px-3 border-b border-black/[0.06] dark:border-black/40 shadow-sm flex-shrink-0">
                <h3 className="text-[15px] font-semibold text-zinc-900 dark:text-white">Chat Details</h3>
                <Button
                    size="icon"
                    variant="ghost"
                    onClick={onClose}
                    className="h-7 w-7 text-zinc-600 dark:text-[#b5bac1] hover:text-zinc-900 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] rounded"
                >
                    <X className="size-4" />
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-black/10 dark:scrollbar-thumb-white/10 scrollbar-track-transparent px-4 py-4 space-y-5">
                {/* Photos and Videos */}
                <section>
                    <div className="flex items-center justify-between mb-2.5">
                        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                            Photos and Videos
                        </h4>
                        {media.photos.length > 0 && (
                            <button className="text-[11px] font-medium text-[#5865f2] hover:underline">
                                See all
                            </button>
                        )}
                    </div>
                    {media.photos.length === 0 ? (
                        <div className="rounded-md border border-dashed border-black/10 dark:border-white/10 px-3 py-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
                            No photos shared yet
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-1.5">
                            {media.photos.slice(0, 6).map((p, i) => (
                                <a
                                    key={`${p.url}-${i}`}
                                    href={p.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="aspect-square rounded overflow-hidden bg-black/[0.04] dark:bg-white/[0.04] hover:opacity-80 transition-opacity"
                                >
                                    <img
                                        src={p.url}
                                        alt={p.title || ""}
                                        className="w-full h-full object-cover"
                                    />
                                </a>
                            ))}
                        </div>
                    )}
                </section>

                {/* Shared Files */}
                <section>
                    <div className="flex items-center justify-between mb-2.5">
                        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                            Shared Files
                        </h4>
                        {media.files.length > 0 && (
                            <button className="text-[11px] font-medium text-[#5865f2] hover:underline">
                                See all
                            </button>
                        )}
                    </div>
                    {media.files.length === 0 ? (
                        <div className="rounded-md border border-dashed border-black/10 dark:border-white/10 px-3 py-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
                            No files shared yet
                        </div>
                    ) : (
                        <div className="space-y-1.5">
                            {media.files.slice(0, 5).map((f, i) => (
                                <a
                                    key={`${f.url}-${i}`}
                                    href={f.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-3 p-2 rounded bg-white dark:bg-[#1e1f22] hover:bg-black/[0.02] dark:hover:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.04] transition-colors"
                                >
                                    <div className="flex-shrink-0 size-9 rounded bg-[#5865f2]/15 text-[#5865f2] flex items-center justify-center text-[10px] font-bold">
                                        {fileTagFromMime(f.mime, f.title)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-[13px] font-medium text-zinc-900 dark:text-white truncate">
                                            {f.title}
                                        </div>
                                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                            {formatBytes(f.size) || "Document"}
                                        </div>
                                    </div>
                                    <FileText className="size-4 text-zinc-400 dark:text-zinc-500 flex-shrink-0" />
                                </a>
                            ))}
                        </div>
                    )}
                </section>

                {/* Shared Links */}
                <section>
                    <div className="flex items-center justify-between mb-2.5">
                        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                            Shared Links
                        </h4>
                        {media.links.length > 0 && (
                            <button className="text-[11px] font-medium text-[#5865f2] hover:underline">
                                See all
                            </button>
                        )}
                    </div>
                    {media.links.length === 0 ? (
                        <div className="rounded-md border border-dashed border-black/10 dark:border-white/10 px-3 py-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
                            No links shared yet
                        </div>
                    ) : (
                        <div className="space-y-1.5">
                            {media.links.slice(0, 5).map((l, i) => (
                                <a
                                    key={`${l.url}-${i}`}
                                    href={l.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-3 p-2 rounded bg-white dark:bg-[#1e1f22] hover:bg-black/[0.02] dark:hover:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.04] transition-colors"
                                >
                                    <div className="flex-shrink-0 size-9 rounded bg-sky-500/15 text-sky-500 flex items-center justify-center">
                                        <LinkIcon className="size-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-[13px] font-medium text-zinc-900 dark:text-white truncate">
                                            {l.title || l.url}
                                        </div>
                                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                                            {l.url.replace(/^https?:\/\//, "")}
                                        </div>
                                    </div>
                                </a>
                            ))}
                        </div>
                    )}
                </section>

                {/* About / Members short */}
                <section>
                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2.5">
                        {summary.oneOnOne ? "About" : `Members · ${summary.members.length}`}
                    </h4>
                    {summary.oneOnOne ? (
                        <div className="flex items-center gap-3 p-2 rounded bg-white dark:bg-[#1e1f22] border border-black/[0.06] dark:border-white/[0.04]">
                            <div className="relative flex-shrink-0">
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={summary.channelImage} />
                                    <AvatarFallback className="bg-[#5865f2] text-white text-sm">
                                        {channelName?.[0]?.toUpperCase() || "?"}
                                    </AvatarFallback>
                                </Avatar>
                                {summary.otherUser?.online && (
                                    <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-[#23a55a] border-2 border-white dark:border-[#1e1f22]" />
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="text-[13px] font-medium text-zinc-900 dark:text-white truncate">
                                    {channelName}
                                </div>
                                <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                    {summary.otherUser?.online ? "Online" : "Offline"}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-0.5">
                            {summary.members.slice(0, 6).map((m) => {
                                const u = m.user;
                                const isMe = u?.id === client.userID;
                                return (
                                    <div
                                        key={m.user_id || u?.id}
                                        className="flex items-center gap-2.5 px-2 py-1.5 rounded hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
                                    >
                                        <div className="relative flex-shrink-0">
                                            <Avatar className="h-7 w-7">
                                                <AvatarImage src={u?.image as string | undefined} />
                                                <AvatarFallback className="bg-[#5865f2] text-white text-[10px]">
                                                    {(u?.name as string | undefined)?.[0]?.toUpperCase() || "?"}
                                                </AvatarFallback>
                                            </Avatar>
                                            {u?.online && (
                                                <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-[#23a55a] border-2 border-[#f2f3f5] dark:border-[#2b2d31]" />
                                            )}
                                        </div>
                                        <span className="text-[13px] text-zinc-900 dark:text-zinc-100 truncate flex-1">
                                            {(u?.name as string | undefined) || u?.id}
                                            {isMe && (
                                                <span className="ml-1 text-[10px] text-zinc-500 dark:text-zinc-400">(you)</span>
                                            )}
                                        </span>
                                    </div>
                                );
                            })}
                            {summary.members.length > 6 && (
                                <button className="w-full text-left px-2 py-1.5 text-[11px] font-medium text-[#5865f2] hover:underline">
                                    See all {summary.members.length} members
                                </button>
                            )}
                        </div>
                    )}
                </section>
            </div>
        </aside>
    );
}
