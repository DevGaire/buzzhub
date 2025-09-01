"use client";

import { PostData } from "@/lib/types";
import { PostVisibility } from "@prisma/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Globe, Lock, Loader2, Users } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Textarea } from "../ui/textarea";
import { useToast } from "../ui/use-toast";
import kyInstance from "@/lib/ky";

interface EditPostDialogProps {
  post: PostData;
  open: boolean;
  onClose: () => void;
}

export default function EditPostDialog({
  post,
  open,
  onClose,
}: EditPostDialogProps) {
  const [content, setContent] = useState(post.content);
  const [visibility, setVisibility] = useState<PostVisibility>(
    post.visibility || PostVisibility.PUBLIC
  );

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const response = await kyInstance.patch(`/api/posts/${post.id}`, {
        json: {
          content: content.trim(),
          visibility,
        },
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post-feed"] });
      queryClient.invalidateQueries({ queryKey: ["post", post.id] });
      toast({ description: "Post updated successfully" });
      onClose();
    },
    onError: (error) => {
      console.error(error);
      toast({
        variant: "destructive",
        description: "Failed to update post. Please try again.",
      });
    },
  });

  const handleSubmit = () => {
    if (!content.trim()) {
      toast({
        variant: "destructive",
        description: "Post content cannot be empty",
      });
      return;
    }
    mutation.mutate();
  };

  const getVisibilityIcon = (value: PostVisibility) => {
    switch (value) {
      case PostVisibility.ONLY_ME:
        return <Lock className="size-4" />;
      case PostVisibility.FOLLOWERS:
        return <Users className="size-4" />;
      default:
        return <Globe className="size-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Edit Post</DialogTitle>
          <DialogDescription>
            Make changes to your post. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="content" className="text-sm font-medium">
              Content
            </label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's on your mind?"
              className="min-h-[100px] resize-none"
              disabled={mutation.isPending}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="visibility" className="text-sm font-medium">
              Who can see this post?
            </label>
            <Select
              value={visibility}
              onValueChange={(value) => setVisibility(value as PostVisibility)}
              disabled={mutation.isPending}
            >
              <SelectTrigger id="visibility">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={PostVisibility.PUBLIC}>
                  <div className="flex items-center gap-2">
                    {getVisibilityIcon(PostVisibility.PUBLIC)}
                    <span>Public</span>
                  </div>
                </SelectItem>
                <SelectItem value={PostVisibility.FOLLOWERS}>
                  <div className="flex items-center gap-2">
                    {getVisibilityIcon(PostVisibility.FOLLOWERS)}
                    <span>Followers only</span>
                  </div>
                </SelectItem>
                <SelectItem value={PostVisibility.ONLY_ME}>
                  <div className="flex items-center gap-2">
                    {getVisibilityIcon(PostVisibility.ONLY_ME)}
                    <span>Only me</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={mutation.isPending || !content.trim()}
          >
            {mutation.isPending && (
              <Loader2 className="mr-2 size-4 animate-spin" />
            )}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}