"use client";

import StoriesBar from "@/components/stories/StoriesBar";
import PostEditor from "@/components/posts/editor/PostEditor";
import { cn } from "@/lib/utils";

interface UnifiedComposerProps {
  className?: string;
}

export default function UnifiedComposer({ className }: UnifiedComposerProps) {
  return (
    <section className={cn("rounded-2xl bg-card shadow-sm", className)}>
      {/* Top: Stories scroller */}
      <StoriesBar className="border-b rounded-t-2xl" />
      {/* Bottom: Post editor */}
      <div className="p-4">
        <PostEditor />
      </div>
    </section>
  );
}
