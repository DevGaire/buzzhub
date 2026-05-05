"use client";

import { useSession } from "@/app/(main)/SessionProvider";
import { PostData } from "@/lib/types";
import kyInstance from "@/lib/ky";
import { MoreHorizontal, Trash2, Edit, Lock, Users, Globe, Pin, PinOff } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import DeletePostDialog from "./DeletePostDialog";
import EditPostDialog from "./EditPostDialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "../ui/use-toast";

interface PostMoreButtonProps {
  post: PostData;
  className?: string;
}

export default function PostMoreButton({ post, className }: PostMoreButtonProps) {
  const { user } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const isPinned = user.pinnedPostId === post.id;

  const { mutate: togglePin, isPending: isPinning } = useMutation({
    mutationFn: () =>
      kyInstance.post(`/api/posts/${post.id}/pin`).json<{ pinned: boolean }>(),
    onSuccess: ({ pinned }) => {
      toast({ description: pinned ? "Post pinned to your profile" : "Post unpinned" });
      queryClient.invalidateQueries({ queryKey: ["user-posts"] });
    },
    onError: () => toast({ variant: "destructive", description: "Failed to update pin" }),
  });

  const getVisibilityIcon = () => {
    switch (post.visibility) {
      case "ONLY_ME": return <Lock className="size-4" />;
      case "FOLLOWERS": return <Users className="size-4" />;
      default: return <Globe className="size-4" />;
    }
  };

  const getVisibilityLabel = () => {
    switch (post.visibility) {
      case "ONLY_ME": return "Only me";
      case "FOLLOWERS": return "Followers only";
      default: return "Public";
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" className={className}>
            <MoreHorizontal className="size-5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
            <span className="flex items-center gap-3">
              <Edit className="size-4" />
              Edit post
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => togglePin()}
            disabled={isPinning}
          >
            <span className="flex items-center gap-3">
              {isPinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
              {isPinned ? "Unpin from profile" : "Pin to profile"}
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <span className="flex items-center gap-3 text-muted-foreground">
              {getVisibilityIcon()}
              {getVisibilityLabel()}
            </span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowDeleteDialog(true)}>
            <span className="flex items-center gap-3 text-destructive">
              <Trash2 className="size-4" />
              Delete
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DeletePostDialog
        post={post}
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
      />
      <EditPostDialog
        post={post}
        open={showEditDialog}
        onClose={() => setShowEditDialog(false)}
      />
    </>
  );
}
