"use client";

import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface StoryMediaFallbackProps {
  className?: string;
  message?: string;
}

export default function StoryMediaFallback({ 
  className, 
  message = "Media unavailable" 
}: StoryMediaFallbackProps) {
  return (
    <div className={cn(
      "flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-muted/60 to-muted/30",
      className
    )}>
      <ImageOff className="mb-2 h-12 w-12 text-muted-foreground/50" />
      <p className="text-sm text-muted-foreground/70">{message}</p>
    </div>
  );
}