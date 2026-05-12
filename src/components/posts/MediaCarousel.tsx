"use client";

import { cn } from "@/lib/utils";
import { Media } from "@prisma/client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

interface MediaCarouselProps {
  attachments: Media[];
}

/**
 * Single-row carousel for posts with multiple attachments. Uses native
 * CSS scroll-snap so touch/trackpad swipe just works. Arrows and dots
 * drive scrollTo for click navigation; an IntersectionObserver tracks
 * the active slide. Single-attachment posts skip the carousel chrome.
 */
export default function MediaCarousel({ attachments }: MediaCarouselProps) {
  if (attachments.length === 1) {
    return (
      <div className="overflow-hidden rounded-2xl">
        <Slide media={attachments[0]} isActive />
      </div>
    );
  }

  return <Carousel attachments={attachments} />;
}

function Carousel({ attachments }: MediaCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState(0);

  // Pick the slide whose center is closest to the track center.
  const handleScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const center = track.scrollLeft + track.clientWidth / 2;
    let bestIdx = 0;
    let bestDist = Infinity;
    slideRefs.current.forEach((el, i) => {
      if (!el) return;
      const slideCenter = el.offsetLeft + el.clientWidth / 2;
      const d = Math.abs(slideCenter - center);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    });
    setActive(bestIdx);
  }, []);

  const scrollToIndex = (i: number) => {
    const track = trackRef.current;
    const slide = slideRefs.current[i];
    if (!track || !slide) return;
    track.scrollTo({ left: slide.offsetLeft, behavior: "smooth" });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.activeElement !== trackRef.current) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        scrollToIndex(Math.max(0, active - 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        scrollToIndex(Math.min(attachments.length - 1, active + 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, attachments.length]);

  return (
    <div className="relative">
      <div
        ref={trackRef}
        onScroll={handleScroll}
        tabIndex={0}
        role="region"
        aria-label="Post media carousel"
        aria-roledescription="carousel"
        className={cn(
          "flex w-full snap-x snap-mandatory overflow-x-auto rounded-2xl",
          "scrollbar-none",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        )}
        style={{ scrollbarWidth: "none" }}
      >
        {attachments.map((m, i) => (
          <div
            key={m.id}
            ref={(el) => {
              slideRefs.current[i] = el;
            }}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${attachments.length}`}
            className="relative w-full flex-shrink-0 snap-center"
          >
            <Slide media={m} isActive={i === active} />
          </div>
        ))}
      </div>

      {active > 0 && (
        <button
          type="button"
          aria-label="Previous"
          onClick={() => scrollToIndex(active - 1)}
          className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/85 p-1.5 shadow backdrop-blur hover:bg-background"
        >
          <ChevronLeft className="size-5" />
        </button>
      )}
      {active < attachments.length - 1 && (
        <button
          type="button"
          aria-label="Next"
          onClick={() => scrollToIndex(active + 1)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/85 p-1.5 shadow backdrop-blur hover:bg-background"
        >
          <ChevronRight className="size-5" />
        </button>
      )}

      <div className="pointer-events-none absolute right-2 top-2 rounded-full bg-background/80 px-2 py-0.5 text-xs font-medium backdrop-blur">
        {active + 1} / {attachments.length}
      </div>

      <div className="mt-2 flex items-center justify-center gap-1.5">
        {attachments.map((m, i) => (
          <button
            key={m.id}
            type="button"
            aria-label={`Go to slide ${i + 1}`}
            aria-current={i === active}
            onClick={() => scrollToIndex(i)}
            className={cn(
              "h-1.5 rounded-full transition-all",
              i === active ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/40 hover:bg-muted-foreground/70",
            )}
          />
        ))}
      </div>
    </div>
  );
}

function Slide({ media, isActive }: { media: Media; isActive: boolean }) {
  const [imgError, setImgError] = useState(false);

  if (media.type === "IMAGE" || media.type === "GIF") {
    if (imgError) {
      return (
        <div className="flex aspect-square w-full items-center justify-center bg-muted">
          <p className="text-sm text-destructive">Media failed to load</p>
        </div>
      );
    }
    return (
      <div className="relative mx-auto flex max-h-[36rem] w-full items-center justify-center bg-black">
        <Image
          src={media.url}
          alt={media.type === "GIF" ? "GIF" : "Attachment"}
          width={1200}
          height={900}
          unoptimized={media.type === "GIF"}
          loading={isActive ? "eager" : "lazy"}
          onError={() => setImgError(true)}
          className="max-h-[36rem] w-auto object-contain"
        />
      </div>
    );
  }

  if (media.type === "VIDEO") {
    return (
      <div className="flex max-h-[36rem] w-full items-center justify-center bg-black">
        <video
          src={media.url}
          controls
          preload={isActive ? "metadata" : "none"}
          className="max-h-[36rem] w-auto"
        />
      </div>
    );
  }

  if (media.type === "AUDIO") {
    return (
      <div className="flex w-full items-center justify-center bg-muted/40 p-6">
        <div className="w-full max-w-md">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex size-12 flex-shrink-0 items-center justify-center rounded-full bg-primary/20">
              🎵
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Audio</p>
              <p className="text-xs text-muted-foreground">Tap play</p>
            </div>
          </div>
          <audio
            controls
            preload={isActive ? "metadata" : "none"}
            className="w-full"
          >
            <source src={media.url} />
          </audio>
        </div>
      </div>
    );
  }

  return (
    <div className="flex aspect-video w-full items-center justify-center bg-muted">
      <p className="text-sm text-destructive">Unsupported media: {media.type}</p>
    </div>
  );
}
