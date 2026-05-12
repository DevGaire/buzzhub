"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import Comments from "./Comments";
import { PostData } from "@/lib/types";

interface CommentsSheetProps {
  post: PostData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialExpandedCommentId?: string | null;
}

/**
 * Mobile bottom-sheet for comments. Slides up from the bottom, takes
 * 80vh by default, taps-outside or swipe-down dismiss. Used only at
 * narrow breakpoints — desktop keeps the inline thread.
 */
export default function CommentsSheet({
  post,
  open,
  onOpenChange,
  initialExpandedCommentId,
}: CommentsSheetProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-2xl border-t bg-background pb-[env(safe-area-inset-bottom)] shadow-2xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom"
          aria-describedby={undefined}
        >
          {/* Grab handle */}
          <div className="flex items-center justify-center pt-2.5">
            <div className="h-1.5 w-10 rounded-full bg-muted-foreground/30" />
          </div>
          <div className="flex items-center justify-between px-4 pb-2 pt-2">
            <DialogPrimitive.Title className="text-sm font-semibold">
              Comments
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Close"
              className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-5" />
            </DialogPrimitive.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
            <Comments
              post={post}
              initialExpandedCommentId={initialExpandedCommentId}
            />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
