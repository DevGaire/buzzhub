"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Heart, Flame, ThumbsUp, Laugh, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import kyInstance from "@/lib/ky";
import { toast } from "@/components/ui/use-toast";

interface StoryReplyInputProps {
  storyId: string;
  storyUserId: string;
  className?: string;
  onFocusChange?: (focused: boolean) => void;
  onReplySuccess?: () => void;
}

const quickReactions = [
  { emoji: "❤️", icon: Heart, label: "Love" },
  { emoji: "🔥", icon: Flame, label: "Fire" },
  { emoji: "👍", icon: ThumbsUp, label: "Like" },
  { emoji: "😂", icon: Laugh, label: "Funny" },
  { emoji: "✨", icon: Sparkles, label: "Amazing" },
];

export default function StoryReplyInput({
  storyId,
  storyUserId,
  className,
  onFocusChange,
  onReplySuccess,
}: StoryReplyInputProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const sendReplyMutation = useMutation({
    mutationFn: async (content: string) => {
      return kyInstance.post(`/api/stories/${storyId}/reply`, {
        json: { content, recipientId: storyUserId },
      });
    },
    onSuccess: () => {
      setMessage("");
      toast({
        description: "Reply sent!",
      });
      onReplySuccess?.();
    },
    onError: () => {
      toast({
        variant: "destructive",
        description: "Failed to send reply",
      });
    },
    onSettled: () => {
      setIsSending(false);
    },
  });

  const handleSendMessage = () => {
    if (!message.trim()) return;
    setIsSending(true);
    sendReplyMutation.mutate(message);
  };

  const handleQuickReaction = (emoji: string) => {
    setIsSending(true);
    sendReplyMutation.mutate(emoji);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* Quick Reactions */}
      <div className="flex items-center justify-center gap-2">
        {quickReactions.map((reaction) => (
          <Button
            key={reaction.label}
            variant="ghost"
            size="sm"
            className="h-10 w-10 rounded-full p-0 hover:bg-white/20"
            onClick={() => handleQuickReaction(reaction.emoji)}
            disabled={isSending}
            title={reaction.label}
          >
            <span className="text-2xl">{reaction.emoji}</span>
          </Button>
        ))}
      </div>

      {/* Message Input */}
      <div className="flex gap-2">
        <Input
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            // Pause story when user starts typing
            if (e.target.value && !message) {
              onFocusChange?.(true);
            }
            // Resume story when user clears the input
            else if (!e.target.value && message) {
              onFocusChange?.(false);
            }
          }}
          onFocus={() => onFocusChange?.(true)}
          onBlur={() => {
            // Only resume if input is empty
            if (!message.trim()) {
              onFocusChange?.(false);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder="Reply to story..."
          className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/60"
          disabled={isSending}
        />
        <Button
          onClick={handleSendMessage}
          disabled={!message.trim() || isSending}
          size="icon"
          className="bg-white/20 hover:bg-white/30"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}