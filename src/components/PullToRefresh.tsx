"use client";

import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
  className?: string;
}

const THRESHOLD = 70; // px the user must pull before release triggers a refresh
const MAX_PULL = 120; // visual cap so the indicator doesn't fly off-screen
const RESISTANCE = 0.55; // rubber-band: actual translate = raw * RESISTANCE

/**
 * Mobile pull-to-refresh wrapper for the feed. Only triggers when the page
 * is at scroll-top — anywhere else, vertical drags pass through to native
 * scrolling. While refreshing, the indicator stays pinned until the
 * caller's promise resolves.
 *
 * Desktop and devices without touch get a pass-through render.
 */
export default function PullToRefresh({
  onRefresh,
  children,
  className,
}: PullToRefreshProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const startYRef = useRef<number | null>(null);
  const pullRef = useRef(0);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    // Coarse pointer => touch-capable. Pull-to-refresh on a mouse is just confusing.
    if (typeof window !== "undefined" && !window.matchMedia?.("(pointer: coarse)").matches) {
      return;
    }

    const onTouchStart = (e: TouchEvent) => {
      if (refreshing) return;
      if (window.scrollY > 0) return;
      if (e.touches.length !== 1) return;
      startYRef.current = e.touches[0].clientY;
      pullRef.current = 0;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (refreshing) return;
      if (startYRef.current === null) return;
      // If the user has started scrolling away from the top mid-gesture,
      // bail. Otherwise we'd fight native scroll on the way back down.
      if (window.scrollY > 0) {
        startYRef.current = null;
        pullRef.current = 0;
        setPull(0);
        return;
      }
      const delta = e.touches[0].clientY - startYRef.current;
      if (delta <= 0) {
        // Pulling up — let the browser scroll normally.
        pullRef.current = 0;
        setPull(0);
        return;
      }
      const visual = Math.min(MAX_PULL, delta * RESISTANCE);
      pullRef.current = visual;
      setPull(visual);
      // Once we're committed to a pull, stop the browser from also scrolling
      // (where it can — Safari iOS will still rubber-band the body).
      if (visual > 4 && e.cancelable) e.preventDefault();
    };

    const onTouchEnd = async () => {
      if (refreshing) return;
      const reached = pullRef.current >= THRESHOLD;
      startYRef.current = null;
      pullRef.current = 0;
      if (!reached) {
        setPull(0);
        return;
      }
      setRefreshing(true);
      setPull(THRESHOLD);
      try {
        await onRefresh();
      } catch {
        // The caller is expected to surface the error via toast.
      } finally {
        setRefreshing(false);
        setPull(0);
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    // Non-passive: we conditionally preventDefault during an active pull.
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [onRefresh, refreshing]);

  const progress = Math.min(1, pull / THRESHOLD);

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      {/* Indicator — sits above the content and slides down with the pull. */}
      <div
        aria-hidden={pull === 0 && !refreshing}
        className="pointer-events-none absolute left-0 right-0 top-0 z-10 flex justify-center"
        style={{
          transform: `translateY(${pull - 40}px)`,
          transition: refreshing || pull === 0 ? "transform 200ms ease-out" : "none",
          opacity: refreshing ? 1 : progress,
        }}
      >
        <div className="rounded-full bg-card/95 p-2 shadow ring-1 ring-border">
          <Loader2
            className={cn("size-5 text-primary", refreshing && "animate-spin")}
            style={{
              transform: refreshing ? undefined : `rotate(${progress * 270}deg)`,
              transition: refreshing ? undefined : "transform 80ms linear",
            }}
          />
        </div>
      </div>
      <div
        style={{
          transform: `translateY(${pull}px)`,
          transition: refreshing || pull === 0 ? "transform 200ms ease-out" : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}
