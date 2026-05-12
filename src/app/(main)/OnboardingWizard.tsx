"use client";

import { useSession } from "@/app/(main)/SessionProvider";
import LoadingButton from "@/components/LoadingButton";
import UserAvatar from "@/components/UserAvatar";
import VerifiedBadge from "@/components/VerifiedBadge";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import kyInstance from "@/lib/ky";
import { useUploadThing } from "@/lib/uploadthing";
import { UserData } from "@/lib/types";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const DISMISS_KEY = "buzzhub.onboarding.dismissedAt";
const TARGET_FOLLOWS = 5;

interface StatusResponse {
  followingCount: number;
  avatarUrl: string | null;
  createdAt: string | null;
}

/**
 * First-run onboarding flow. Mounts inside the main layout but only
 * actually renders if:
 *   - the user is signed in (we're inside (main) so this is given);
 *   - they have 0 follows;
 *   - they haven't dismissed the wizard before in this browser.
 *
 * Two steps: Follow ≥ 5 suggestions, then optionally upload an avatar.
 * Either step can be skipped — onboarding doesn't gate the app.
 */
export default function OnboardingWizard() {
  const { user } = useSession();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"follow" | "avatar">("follow");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(DISMISS_KEY)) return;
    let cancelled = false;
    kyInstance
      .get("/api/me/status")
      .json<StatusResponse>()
      .then((r) => {
        if (cancelled) return;
        // Only auto-open for genuinely new accounts. Existing users who
        // happen to have 0 follows shouldn't get nagged.
        if (r.followingCount > 0) return;
        if (r.createdAt) {
          const ageMs = Date.now() - new Date(r.createdAt).getTime();
          if (ageMs > 7 * 24 * 3600_000) return;
        }
        setOpen(true);
      })
      .catch(() => {
        // Endpoint may be missing in older deploys; leave dismissed.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setOpen(false);
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && dismiss()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-50 w-[min(560px,92vw)] max-h-[90vh] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border bg-background shadow-2xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <div className="flex items-start justify-between gap-3 border-b p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Sparkles className="size-5" />
              </div>
              <div>
                <DialogPrimitive.Title className="text-lg font-semibold">
                  Welcome to BuzzHub, {user.displayName?.split(" ")[0] || user.username}
                </DialogPrimitive.Title>
                <p className="text-xs text-muted-foreground">
                  Two quick things and your feed will fill up.
                </p>
              </div>
            </div>
            <DialogPrimitive.Close
              aria-label="Close"
              className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-5" />
            </DialogPrimitive.Close>
          </div>

          <div className="flex items-center justify-center gap-2 border-b p-3 text-xs">
            <StepDot label="Follow" active={step === "follow"} done={step === "avatar"} />
            <div className="h-px w-8 bg-border" />
            <StepDot label="Avatar" active={step === "avatar"} done={false} />
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-5">
            {step === "follow" ? (
              <FollowStep onNext={() => setStep("avatar")} onSkip={dismiss} />
            ) : (
              <AvatarStep onDone={dismiss} />
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function StepDot({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={
          done
            ? "flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground"
            : active
              ? "flex size-5 items-center justify-center rounded-full bg-primary/20 text-primary"
              : "flex size-5 items-center justify-center rounded-full bg-muted text-muted-foreground"
        }
      >
        {done ? <Check className="size-3" /> : null}
      </span>
      <span className={active || done ? "font-medium" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}

function FollowStep({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [suggestions, setSuggestions] = useState<UserData[] | null>(null);
  const [followed, setFollowed] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Set<string>>(new Set());

  useEffect(() => {
    kyInstance
      .get("/api/users/suggestions", { searchParams: { limit: 12 } })
      .json<{ users: UserData[] }>()
      .then((r) => setSuggestions(r.users))
      .catch(() => setSuggestions([]));
  }, []);

  async function toggleFollow(target: UserData) {
    const id = target.id;
    if (pending.has(id)) return;
    const isFollowing = followed.has(id);
    setPending((s) => new Set(s).add(id));
    try {
      if (isFollowing) {
        await kyInstance.delete(`/api/users/${id}/followers`);
        setFollowed((s) => {
          const next = new Set(s);
          next.delete(id);
          return next;
        });
      } else {
        await kyInstance.post(`/api/users/${id}/followers`);
        setFollowed((s) => new Set(s).add(id));
      }
      // Keep feed / suggestions caches honest on the way out.
      queryClient.invalidateQueries({ queryKey: ["follower-info", id] });
    } catch (e) {
      toast({ variant: "destructive", description: "Couldn't update follow." });
    } finally {
      setPending((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
    }
  }

  const enough = followed.size >= TARGET_FOLLOWS;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm">
          Follow at least <strong>{TARGET_FOLLOWS}</strong> accounts to build your feed.
        </p>
        <p className="text-xs text-muted-foreground">
          Following so far: {followed.size} / {TARGET_FOLLOWS}
        </p>
      </div>

      {suggestions === null ? (
        <div className="flex items-center justify-center p-8 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : suggestions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No suggestions yet. Try Explore later to find people.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {suggestions.map((s) => {
            const isPending = pending.has(s.id);
            const isFollowed = followed.has(s.id);
            return (
              <li
                key={s.id}
                className="flex items-center gap-3 rounded-xl border p-3"
              >
                <UserAvatar avatarUrl={s.avatarUrl} className="size-9 flex-none" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 flex items-center gap-1 text-sm font-medium">
                    {s.displayName}
                    {s.isVerified && <VerifiedBadge size="sm" />}
                  </p>
                  <p className="line-clamp-1 text-xs text-muted-foreground">
                    @{s.username}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={isFollowed ? "outline" : "default"}
                  onClick={() => toggleFollow(s)}
                  disabled={isPending}
                  className="rounded-full px-3 text-xs"
                >
                  {isPending ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : isFollowed ? (
                    "Following"
                  ) : (
                    "Follow"
                  )}
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex items-center justify-between border-t pt-4">
        <Button variant="ghost" size="sm" onClick={onSkip}>
          Skip onboarding
        </Button>
        <Button onClick={onNext} disabled={!enough}>
          Continue
        </Button>
      </div>
    </div>
  );
}

function AvatarStep({ onDone }: { onDone: () => void }) {
  const { toast } = useToast();
  const { user } = useSession();
  const [preview, setPreview] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { startUpload, isUploading } = useUploadThing("avatar", {
    onClientUploadComplete: () => {
      setUploaded(true);
      toast({ description: "Avatar updated." });
    },
    onUploadError: () => {
      toast({ variant: "destructive", description: "Couldn't upload avatar." });
    },
  });

  const initialUrl = useMemo(() => user.avatarUrl, [user]);

  function pick(file: File) {
    setPreview(URL.createObjectURL(file));
    startUpload([file]);
  }

  return (
    <div className="space-y-4 text-center">
      <p className="text-sm">
        Add an avatar so the rest of BuzzHub knows it&apos;s you.
      </p>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={isUploading}
          className="group relative size-28 overflow-hidden rounded-full border-2 border-dashed border-muted-foreground/40 bg-muted"
          aria-label="Choose avatar"
        >
          {preview || initialUrl ? (
            <img
              src={preview || initialUrl || ""}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <span className="block p-6 text-xs text-muted-foreground">
              Tap to upload
            </span>
          )}
          {isUploading && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
              <Loader2 className="size-6 animate-spin" />
            </span>
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) pick(file);
            e.target.value = "";
          }}
        />
      </div>

      <div className="flex items-center justify-between border-t pt-4">
        <Button variant="ghost" size="sm" onClick={onDone}>
          Skip
        </Button>
        <LoadingButton
          onClick={onDone}
          loading={isUploading}
        >
          {uploaded || preview ? "Done" : "Skip avatar"}
        </LoadingButton>
      </div>
    </div>
  );
}
