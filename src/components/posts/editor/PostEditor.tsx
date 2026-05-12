"use client";

import { useSession } from "@/app/(main)/SessionProvider";
import LoadingButton from "@/components/LoadingButton";
import { Button } from "@/components/ui/button";
import UserAvatar from "@/components/UserAvatar";
import { cn } from "@/lib/utils";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useDropzone } from "@uploadthing/react";
import { BarChart2, CalendarClock, ImageIcon, Loader2, Plus, Trash2, X } from "lucide-react";
import Image from "next/image";
import { ClipboardEvent, useEffect, useRef, useState } from "react";
import { useSubmitPostMutation } from "./mutations";
import "./styles.css";
import useMediaUpload, { Attachment } from "./useMediaUpload";

export default function PostEditor() {
  const { user } = useSession();

  const mutation = useSubmitPostMutation();
  const [expanded, setExpanded] = useState(false);
  const [visibility, setVisibility] = useState<"public" | "followers" | "only_me">("public");
  const [altTextByName, setAltTextByName] = useState<Record<string, string>>({});
  const [attachmentOrder, setAttachmentOrder] = useState<string[]>([]);
  const [feeling, setFeeling] = useState<{ type: 'feeling' | 'activity'; emoji: string; label: string } | null>(null);
  const [showFeelingPicker, setShowFeelingPicker] = useState(false);
  const [poll, setPoll] = useState<{ options: string[]; expiresInHours: number } | null>(null);
  const [scheduleAt, setScheduleAt] = useState<string>(""); // "YYYY-MM-DDTHH:mm" local
  const [showSchedule, setShowSchedule] = useState(false);

  const {
    startUpload,
    attachments,
    isUploading,
    uploadProgress,
    removeAttachment,
    reset: resetMediaUploads,
  } = useMediaUpload();

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => {
      setExpanded(true);
      startUpload(files);
    },
  });

  const { onClick, ...rootProps } = getRootProps();

  // Keep a stable order for attachments to allow reordering locally
  useEffect(() => {
    const names = attachments.map((a) => a.file.name);
    setAttachmentOrder((prev) => {
      const existing = prev.filter((n) => names.includes(n));
      const newOnes = names.filter((n) => !existing.includes(n));
      return [...existing, ...newOnes];
    });
  }, [attachments]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bold: false,
        italic: false,
      }),
      Placeholder.configure({
        placeholder: "What's crack-a-lackin'?",
      }),
    ],
    // Prevent SSR hydration mismatch warning from Tiptap
    immediatelyRender: false,
  });

  const input =
    editor?.getText({
      blockSeparator: "\n",
    }) || "";

  const handleFilesSelected = (files: File[]) => {
    setExpanded(true);
    startUpload(files);
  };

  function onSubmit(status: "published" | "draft" | "scheduled" = "published") {
    const contentToSend = feeling
      ? `${input}${input ? '\n\n' : ''}${feeling.type === 'feeling' ? 'Feeling' : 'Activity'}: ${feeling.emoji} ${feeling.label}`
      : input;
    let scheduledForIso: string | undefined;
    if (status === "scheduled") {
      if (!scheduleAt) return;
      // datetime-local has no zone — interpret as the user's local time.
      const at = new Date(scheduleAt);
      if (isNaN(at.getTime()) || at.getTime() - Date.now() < 60_000) {
        return;
      }
      scheduledForIso = at.toISOString();
    }
    mutation.mutate(
      {
        content: contentToSend,
        mediaIds: attachments.map((a) => a.mediaId).filter(Boolean) as string[],
        visibility,
        // Polls are public commitments — don't pair them with drafts.
        poll: status === "published" && poll
          ? { options: poll.options.filter((o) => o.trim()), expiresInHours: poll.expiresInHours }
          : undefined,
        status,
        scheduledFor: scheduledForIso,
      },
      {
        onSuccess: () => {
          editor?.commands.clearContent();
          resetMediaUploads();
          setFeeling(null);
          setShowFeelingPicker(false);
          setPoll(null);
          setScheduleAt("");
          setShowSchedule(false);
        },
      },
    );
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    const files = Array.from(e.clipboardData.items)
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFile()) as File[];
    startUpload(files);
  }

  const firstName = (user.displayName || "").split(" ")[0] || user.username || "";
  const collapsedPlaceholder = `What's on your mind${firstName ? ", " + firstName : ""}?`;

  return (
    <div className="rounded-2xl bg-card shadow-sm">
      {!expanded ? (
        <div className="p-4">
          <div className="flex items-center gap-3">
            <UserAvatar avatarUrl={user.avatarUrl} />
            <button
              onClick={() => setExpanded(true)}
              className="flex-1 rounded-full border bg-background/70 px-4 py-2 text-left text-sm text-muted-foreground hover:bg-background"
            >
              {collapsedPlaceholder}
            </button>
          </div>
          <div className="mt-3 flex items-center justify-between border-t pt-3">
            <div className="flex items-center gap-2">
              <AddAttachmentsButton
                onFilesSelected={handleFilesSelected}
                disabled={isUploading || attachments.length >= 5}
                showLabel
              />
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-2 text-primary"
                  onClick={() => { setExpanded(true); setShowFeelingPicker(true); }}
                  title="Add feeling or activity"
                >
                  <span className="inline-block size-5 rounded-full bg-muted" />
                  <span className="text-xs">Feeling/Activity</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <UserAvatar avatarUrl={user.avatarUrl} />
              <div className="text-sm min-w-0">
                <div className="font-medium truncate">{user.displayName}</div>
                <div className="text-muted-foreground">Share something new</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                aria-label="Post visibility"
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as any)}
                className="h-8 rounded-md border bg-background px-2 text-xs"
                title="Visibility"
              >
                <option value="public">Public</option>
                <option value="followers">Followers</option>
                <option value="only_me">Only me</option>
              </select>
              <Button variant="ghost" size="icon" onClick={() => { setExpanded(false); editor?.commands.clearContent(); resetMediaUploads(); }} title="Close">
                <X className="size-5" />
              </Button>
            </div>
          </div>
          {feeling && (
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border px-2 py-1 text-xs">
              <span className="opacity-80">{feeling.type === 'feeling' ? 'Feeling' : 'Activity'}:</span>
              <span>{feeling.emoji} {feeling.label}</span>
              <button
                type="button"
                className="px-1 text-muted-foreground hover:text-foreground"
                title="Clear"
                onClick={() => setFeeling(null)}
              >
                ×
              </button>
            </div>
          )}
          <div {...rootProps}>
            <EditorContent
              editor={editor}
              className={cn(
                "max-h-[20rem] w-full overflow-y-auto rounded-2xl border bg-background px-5 py-3",
                isDragActive && "outline-dashed",
              )}
              onPaste={onPaste}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                  e.preventDefault();
                  if (input.trim() && !isUploading) onSubmit();
                }
              }}
            />
            <input {...getInputProps()} />
          </div>
          {!!attachments.length && (
            <div className="mt-3">
              <AttachmentPreviews
                attachments={attachments}
                removeAttachment={(name) => {
                  setAttachmentOrder((prev) => prev.filter((n) => n !== name));
                  const { [name]: _, ...rest } = altTextByName;
                  setAltTextByName(rest);
                  removeAttachment(name);
                }}
                order={attachmentOrder}
                onMove={(name, dir) => {
                  setAttachmentOrder((prev) => {
                    const idx = prev.indexOf(name);
                    if (idx === -1) return prev;
                    const next = [...prev];
                    const swapWith = dir === "up" ? idx - 1 : idx + 1;
                    if (swapWith < 0 || swapWith >= next.length) return prev;
                    [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
                    return next;
                  });
                }}
                altTextByName={altTextByName}
                onAltTextChange={(name, val) => setAltTextByName((s) => ({ ...s, [name]: val }))}
              />
            </div>
          )}
          {poll && (
            <div className="mt-3 rounded-xl border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center justify-between text-sm font-medium">
                <span className="flex items-center gap-2"><BarChart2 className="size-4" /> Poll</span>
                <button onClick={() => setPoll(null)} className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
              </div>
              {poll.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={opt}
                    onChange={(e) => setPoll((p) => p ? { ...p, options: p.options.map((o, j) => j === i ? e.target.value : o) } : null)}
                    placeholder={`Option ${i + 1}`}
                    maxLength={60}
                    className="flex-1 rounded-lg border bg-background px-3 py-1.5 text-sm"
                  />
                  {poll.options.length > 2 && (
                    <button onClick={() => setPoll((p) => p ? { ...p, options: p.options.filter((_, j) => j !== i) } : null)}>
                      <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
                    </button>
                  )}
                </div>
              ))}
              {poll.options.length < 4 && (
                <button
                  onClick={() => setPoll((p) => p ? { ...p, options: [...p.options, ""] } : null)}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Plus className="size-3" /> Add option
                </button>
              )}
              <select
                value={poll.expiresInHours}
                onChange={(e) => setPoll((p) => p ? { ...p, expiresInHours: Number(e.target.value) } : null)}
                className="mt-1 rounded-md border bg-background px-2 py-1 text-xs"
              >
                <option value={24}>1 day</option>
                <option value={72}>3 days</option>
                <option value={168}>7 days</option>
                <option value={0}>No expiry</option>
              </select>
            </div>
          )}
          {showSchedule && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border bg-muted/30 p-3 text-xs">
              <CalendarClock className="size-4 text-primary" />
              <label className="font-medium">Publish at</label>
              <input
                type="datetime-local"
                value={scheduleAt}
                min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
                onChange={(e) => setScheduleAt(e.target.value)}
                className="rounded-md border bg-background px-2 py-1"
              />
              <span className="text-muted-foreground">{Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
              {scheduleAt && (
                <button
                  type="button"
                  className="ml-auto text-muted-foreground hover:text-foreground"
                  onClick={() => setScheduleAt("")}
                >
                  Clear
                </button>
              )}
            </div>
          )}
          <div className="mt-3 flex items-center justify-between border-t pt-3">
            <div className="flex items-center gap-2">
              {isUploading && (
                <div className="mr-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{uploadProgress ?? 0}%</span>
                  <Loader2 className="size-4 animate-spin text-primary" />
                </div>
              )}
              <AddAttachmentsButton
                onFilesSelected={handleFilesSelected}
                disabled={isUploading || attachments.length >= 5}
                showLabel
              />
              <Button
                variant="ghost"
                size="sm"
                className={cn("h-8 gap-2", poll ? "text-primary" : "text-primary")}
                onClick={() => setPoll(poll ? null : { options: ["", ""], expiresInHours: 24 })}
                title="Add poll"
              >
                <BarChart2 size={18} />
                <span className="text-xs">Poll</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn("h-8 gap-2", showSchedule || scheduleAt ? "text-primary" : "text-primary")}
                onClick={() => setShowSchedule((s) => !s)}
                title="Schedule for later"
              >
                <CalendarClock size={18} />
                <span className="text-xs">Schedule</span>
              </Button>
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-2 text-primary"
                  onClick={() => setShowFeelingPicker((s) => !s)}
                  title="Add feeling or activity"
                >
                  <span className="inline-block size-5 rounded-full bg-muted" />
                  <span className="text-xs">Feeling/Activity</span>
                </Button>
                {showFeelingPicker && (
                  <div className="absolute left-0 top-full z-50 mt-2 w-64 rounded-lg border bg-card p-2 shadow">
                    <div className="mb-1 text-xs font-semibold">Feeling</div>
                    <div className="grid grid-cols-3 gap-1">
                      {['😊 Happy','😢 Sad','😡 Angry','😴 Tired','🤒 Sick','😍 In love'].map((s) => {
                        const [emoji, ...rest] = s.split(' ');
                        const label = rest.join(' ');
                        return (
                          <button
                            key={s}
                            className="rounded bg-muted px-2 py-1 text-xs hover:bg-muted/80"
                            onClick={() => { setFeeling({ type: 'feeling', emoji, label }); setShowFeelingPicker(false); }}
                          >
                            {emoji} {label}
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-2 mb-1 text-xs font-semibold">Activity</div>
                    <div className="grid grid-cols-3 gap-1">
                      {['🎵 Music','🎮 Gaming','🎬 Movie','🏃‍♂️ Running','🍽️ Eating','✈️ Traveling'].map((s) => {
                        const [emoji, ...rest] = s.split(' ');
                        const label = rest.join(' ');
                        return (
                          <button
                            key={s}
                            className="rounded bg-muted px-2 py-1 text-xs hover:bg-muted/80"
                            onClick={() => { setFeeling({ type: 'activity', emoji, label }); setShowFeelingPicker(false); }}
                          >
                            {emoji} {label}
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-2 text-right">
                      <button className="text-xs text-muted-foreground hover:underline" onClick={() => setShowFeelingPicker(false)}>Close</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSubmit("draft")}
                disabled={!input.trim() || isUploading || mutation.isPending}
                className="h-8"
                title="Save to drafts to publish later"
              >
                Save as draft
              </Button>
              {scheduleAt ? (
                <LoadingButton
                  onClick={() => onSubmit("scheduled")}
                  loading={mutation.isPending}
                  disabled={
                    !input.trim() ||
                    isUploading ||
                    new Date(scheduleAt).getTime() - Date.now() < 60_000
                  }
                  className="min-w-20"
                >
                  Schedule
                </LoadingButton>
              ) : (
                <LoadingButton
                  onClick={() => onSubmit("published")}
                  loading={mutation.isPending}
                  disabled={
                    !input.trim() ||
                    isUploading ||
                    (!!poll && poll.options.filter((o) => o.trim()).length < 2)
                  }
                  className="min-w-20"
                >
                  Post
                </LoadingButton>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface AddAttachmentsButtonProps {
  onFilesSelected: (files: File[]) => void;
  disabled: boolean;
  showLabel?: boolean;
}

function AddAttachmentsButton({
  onFilesSelected,
  disabled,
  showLabel,
}: AddAttachmentsButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <Button
        variant="ghost"
        size={showLabel ? "sm" : "icon"}
        className={cn("text-primary hover:text-primary", showLabel && "h-8 gap-2")}
        disabled={disabled}
        onClick={() => fileInputRef.current?.click()}
      >
        <ImageIcon size={18} />
        {showLabel && <span className="text-xs">Media</span>}
      </Button>
      <input
        type="file"
        accept="image/*, video/*, audio/*"
        multiple
        ref={fileInputRef}
        className="sr-only hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length) {
            onFilesSelected(files);
            e.target.value = "";
          }
        }}
      />
    </>
  );
}

interface AttachmentPreviewsProps {
  attachments: Attachment[];
  removeAttachment: (fileName: string) => void;
  order: string[];
  onMove: (fileName: string, dir: "up" | "down") => void;
  altTextByName: Record<string, string>;
  onAltTextChange: (fileName: string, val: string) => void;
}

function AttachmentPreviews({
  attachments,
  removeAttachment,
  order,
  onMove,
  altTextByName,
  onAltTextChange,
}: AttachmentPreviewsProps) {
  const sorted = [...attachments].sort((a, b) => order.indexOf(a.file.name) - order.indexOf(b.file.name));
  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        attachments.length > 1 && "sm:grid sm:grid-cols-2",
      )}
    >
      {sorted.map((attachment, idx) => (
        <AttachmentPreview
          key={attachment.file.name}
          attachment={attachment}
          canMoveUp={idx > 0}
          canMoveDown={idx < sorted.length - 1}
          onMoveUp={() => onMove(attachment.file.name, "up")}
          onMoveDown={() => onMove(attachment.file.name, "down")}
          altText={altTextByName[attachment.file.name] || ""}
          onAltTextChange={(val) => onAltTextChange(attachment.file.name, val)}
          onRemoveClick={() => removeAttachment(attachment.file.name)}
        />
      ))}
    </div>
  );
}

interface AttachmentPreviewProps {
  attachment: Attachment;
  onRemoveClick: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  altText: string;
  onAltTextChange: (val: string) => void;
}

function AttachmentPreview({
  attachment: { file, mediaId, isUploading },
  onRemoveClick,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  altText,
  onAltTextChange,
}: AttachmentPreviewProps) {
  const src = URL.createObjectURL(file);

  return (
    <div
      className={cn("relative mx-auto size-fit", isUploading && "opacity-50")}
    >
      <div className="absolute left-2 top-2 z-10 flex gap-1">
        <button
          type="button"
          aria-label="Move up"
          disabled={!canMoveUp}
          onClick={onMoveUp}
          className={cn("rounded bg-background/80 px-2 py-1 text-xs shadow", !canMoveUp && "opacity-50")}
        >
          ↑
        </button>
        <button
          type="button"
          aria-label="Move down"
          disabled={!canMoveDown}
          onClick={onMoveDown}
          className={cn("rounded bg-background/80 px-2 py-1 text-xs shadow", !canMoveDown && "opacity-50")}
        >
          ↓
        </button>
      </div>
      
      {file.type.startsWith("image") ? (
        <Image
          src={src}
          alt="Attachment preview"
          width={500}
          height={500}
          className="size-fit max-h-[30rem] rounded-2xl"
        />
      ) : file.type.startsWith("video") ? (
        <video controls className="size-fit max-h-[30rem] rounded-2xl">
          <source src={src} type={file.type} />
        </video>
      ) : file.type.startsWith("audio") ? (
        <div className="flex items-center gap-3 rounded-2xl bg-muted p-4 min-w-[300px]">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              🎵
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {(file.size / 1024 / 1024).toFixed(1)} MB • Audio
            </p>
            <audio controls className="w-full mt-2">
              <source src={src} type={file.type} />
            </audio>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-2xl bg-muted p-4 min-w-[300px]">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-muted-foreground/20 flex items-center justify-center">
              📎
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {(file.size / 1024 / 1024).toFixed(1)} MB • {file.type}
            </p>
          </div>
        </div>
      )}
      
      {!isUploading && (
        <button
          onClick={onRemoveClick}
          className="absolute right-3 top-3 rounded-full bg-foreground p-1.5 text-background transition-colors hover:bg-foreground/60"
        >
          <X size={20} />
        </button>
      )}
      
      <div className="mt-2">
        <input
          type="text"
          value={altText}
          onChange={(e) => onAltTextChange(e.target.value)}
          placeholder={file.type.startsWith("audio") ? "Add description (optional)" : "Add alt text (optional)"}
          className="w-full rounded-md border bg-background px-3 py-1 text-sm"
          aria-label={`Alt text for ${file.name}`}
        />
      </div>
    </div>
  );
}