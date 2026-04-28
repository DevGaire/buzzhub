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
        return (
            <aside
                className={cn(
                    "h-full rounded-2xl bg-[#1A1B27] border border-white/[0.04] flex-shrink-0",
                    "w-[300px] xl:w-[320px]",
                    "hidden lg:flex flex-col items-center justify-center text-white/40 text-sm",
                )}
            >
                <p>Select a chat to see details</p>
            </aside>
        );
    }

    const { channelName } = summary;

    return (
        <aside
            className={cn(
                "h-full rounded-2xl bg-[#1A1B27] border border-white/[0.04] overflow-hidden flex-shrink-0",
                "w-full md:w-[300px] xl:w-[320px]",
                open
                    ? "flex absolute md:relative inset-0 z-50 md:z-auto flex-col"
                    : "hidden lg:flex lg:flex-col",
            )}
        >
            <div className="flex items-center justify-between h-[60px] px-4 border-b border-white/[0.04] flex-shrink-0">
                <h3 className="text-sm font-semibold text-white">Chat Details</h3>
                <Button
                    size="icon"
                    variant="ghost"
                    onClick={onClose}
                    className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10 rounded-full"
                >
                    <X className="size-4" />
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent px-4 py-4 space-y-5">
                {/* Photos and Videos */}
                <section>
                    <div className="flex items-center justify-between mb-2.5">
                        <h4 className="text-[12.5px] font-semibold text-white">
                            Photos and Videos
                        </h4>
                        {media.photos.length > 0 && (
                            <button className="text-[11px] font-medium text-purple-400 hover:text-purple-300">
                                See all
                            </button>
                        )}
                    </div>
                    {media.photos.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-center text-xs text-white/40">
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
                                    className="aspect-square rounded-lg overflow-hidden bg-white/5 hover:opacity-80 transition-opacity"
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
                        <h4 className="text-[12.5px] font-semibold text-white">
                            Shared Files
                        </h4>
                        {media.files.length > 0 && (
                            <button className="text-[11px] font-medium text-purple-400 hover:text-purple-300">
                                See all
                            </button>
                        )}
                    </div>
                    {media.files.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-center text-xs text-white/40">
                            No files shared yet
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {media.files.slice(0, 5).map((f, i) => (
                                <a
                                    key={`${f.url}-${i}`}
                                    href={f.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-3 p-2.5 rounded-xl bg-[#0E0F18] hover:bg-[#161724] border border-white/[0.04] transition-colors"
                                >
                                    <div className="flex-shrink-0 size-10 rounded-lg bg-purple-500/15 text-purple-300 flex items-center justify-center text-[10px] font-bold">
                                        {fileTagFromMime(f.mime, f.title)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-[13px] font-medium text-white truncate">
                                            {f.title}
                                        </div>
                                        <div className="text-[11px] text-white/40">
                                            {formatBytes(f.size) || "Document"}
                                        </div>
                                    </div>
                                    <FileText className="size-4 text-white/30 flex-shrink-0" />
                                </a>
                            ))}
                        </div>
                    )}
                </section>

                {/* Shared Links */}
                <section>
                    <div className="flex items-center justify-between mb-2.5">
                        <h4 className="text-[12.5px] font-semibold text-white">
                            Shared Links
                        </h4>
                        {media.links.length > 0 && (
                            <button className="text-[11px] font-medium text-purple-400 hover:text-purple-300">
                                See all
                            </button>
                        )}
                    </div>
                    {media.links.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-center text-xs text-white/40">
                            No links shared yet
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {media.links.slice(0, 5).map((l, i) => (
                                <a
                                    key={`${l.url}-${i}`}
                                    href={l.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-3 p-2.5 rounded-xl bg-[#0E0F18] hover:bg-[#161724] border border-white/[0.04] transition-colors"
                                >
                                    <div className="flex-shrink-0 size-10 rounded-lg bg-blue-500/15 text-blue-300 flex items-center justify-center">
                                        <LinkIcon className="size-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-[13px] font-medium text-white truncate">
                                            {l.title || l.url}
                                        </div>
                                        <div className="text-[11px] text-white/40 truncate">
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
                    <h4 className="text-[12.5px] font-semibold text-white mb-2.5">
                        {summary.oneOnOne ? "About" : `Members · ${summary.members.length}`}
                    </h4>
                    {summary.oneOnOne ? (
                        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#0E0F18] border border-white/[0.04]">
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={summary.channelImage} />
                                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-sm">
                                    {channelName?.[0]?.toUpperCase() || "?"}
                                </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                                <div className="text-[13px] font-medium text-white truncate">
                                    {channelName}
                                </div>
                                <div className="text-[11px] text-white/50">
                                    {summary.otherUser?.online ? "Active now" : "Offline"}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {summary.members.slice(0, 6).map((m) => {
                                const u = m.user;
                                const isMe = u?.id === client.userID;
                                return (
                                    <div
                                        key={m.user_id || u?.id}
                                        className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/[0.04]"
                                    >
                                        <div className="relative flex-shrink-0">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage
                                                    src={u?.image as string | undefined}
                                                />
                                                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-[10px]">
                                                    {(u?.name as string | undefined)?.[0]?.toUpperCase() || "?"}
                                                </AvatarFallback>
                                            </Avatar>
                                            {u?.online && (
                                                <span className="absolute bottom-0 right-0 size-2 rounded-full bg-green-500 ring-2 ring-[#1A1B27]" />
                                            )}
                                        </div>
                                        <span className="text-[13px] text-white truncate flex-1">
                                            {(u?.name as string | undefined) || u?.id}
                                            {isMe && (
                                                <span className="ml-1 text-[10px] text-white/40">(you)</span>
                                            )}
                                        </span>
                                    </div>
                                );
                            })}
                            {summary.members.length > 6 && (
                                <button className="w-full text-left px-2 py-1.5 text-[11px] font-medium text-purple-400 hover:text-purple-300">
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
