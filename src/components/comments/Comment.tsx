import { useSession } from "@/app/(main)/SessionProvider";
import kyInstance from "@/lib/ky";
import { CommentData, CommentDataWithLikes, CommentsPage } from "@/lib/types";
import { formatRelativeDate } from "@/lib/utils";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, MessageSquare, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import UserAvatar from "../UserAvatar";
import UserTooltip from "../UserTooltip";
import CommentMoreButton from "./CommentMoreButton";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { useToast } from "../ui/use-toast";
import { cn } from "@/lib/utils";

interface CommentProps {
    comment: CommentData & { 
        _count?: { replies: number; likes: number };
        likes?: { userId: string }[];
    };
    postId: string;
    initialExpanded?: boolean;
}

export default function Comment({ comment, postId, initialExpanded = false }: CommentProps) {
    const { user } = useSession();
    const [showReplies, setShowReplies] = useState(initialExpanded);
    const [showReplyInput, setShowReplyInput] = useState(false);
    const [replyContent, setReplyContent] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(comment.content);
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const isLiked = comment.likes?.some(like => like.userId === user.id) || false;
    const likesCount = comment._count?.likes || 0;

    // Fetch replies
    const { data, fetchNextPage, hasNextPage, isFetching, status } = useInfiniteQuery({
        queryKey: ["comment-replies", comment.id],
        queryFn: ({ pageParam }) =>
            kyInstance
                .get(
                    `/api/posts/${postId}/comments`,
                    {
                        searchParams: {
                            parentId: comment.id,
                            ...(pageParam && { cursor: pageParam }),
                        },
                    }
                )
                .json<CommentsPage>(),
        initialPageParam: null as string | null,
        getNextPageParam: (firstPage) => firstPage.previousCursor,
        enabled: showReplies,
    });

    // Create reply mutation
    const createReplyMutation = useMutation({
        mutationFn: async (content: string) => {
            return kyInstance
                .post(`/api/posts/${postId}/comments`, {
                    json: { content, parentId: comment.id },
                })
                .json<CommentData>();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["comment-replies", comment.id] });
            queryClient.invalidateQueries({ queryKey: ["comments", postId] });
            setReplyContent("");
            setShowReplyInput(false);
            setShowReplies(true);
            toast({ description: "Reply posted" });
        },
        onError: () => {
            toast({
                variant: "destructive",
                description: "Failed to post reply. Please try again.",
            });
        },
    });

    // Edit comment mutation
    const editMutation = useMutation({
        mutationFn: async (content: string) => {
            return kyInstance
                .patch(`/api/posts/${postId}/comments/${comment.id}`, {
                    json: { content },
                })
                .json<CommentData>();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["comments", postId] });
            setIsEditing(false);
            toast({ description: "Comment updated" });
        },
        onError: () => {
            toast({
                variant: "destructive",
                description: "Failed to update comment. Please try again.",
            });
        },
    });

    // Like comment mutation
    const likeMutation = useMutation({
        mutationFn: async () => {
            if (isLiked) {
                await kyInstance.delete(`/api/posts/${postId}/comments/${comment.id}/likes`);
            } else {
                await kyInstance.post(`/api/posts/${postId}/comments/${comment.id}/likes`);
            }
        },
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: ["comments", postId] });
            
            // Optimistic update
            const previousData = queryClient.getQueryData(["comments", postId]);
            
            queryClient.setQueryData(["comments", postId], (old: any) => {
                // Update the comment's like status
                return old;
            });
            
            return { previousData };
        },
        onError: (err, variables, context) => {
            if (context?.previousData) {
                queryClient.setQueryData(["comments", postId], context.previousData);
            }
            toast({
                variant: "destructive",
                description: "Something went wrong. Please try again.",
            });
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["comments", postId] });
        },
    });

    const replies = data?.pages.flatMap((page) => page.comments) || [];
    const replyCount = comment._count?.replies || 0;

    const handleReply = () => {
        if (!replyContent.trim()) return;
        createReplyMutation.mutate(replyContent.trim());
    };

    const handleReplyClick = () => {
        setShowReplyInput(!showReplyInput);
        if (!showReplies && replyCount > 0) {
            setShowReplies(true);
        }
    };

    const handleEdit = () => {
        if (!editContent.trim()) return;
        editMutation.mutate(editContent.trim());
    };

    const handleEditClick = () => {
        setIsEditing(true);
        setEditContent(comment.content);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditContent(comment.content);
    };

    return (
        <div className="py-3">
            <div className="group/comment flex gap-3">
                <span className="hidden sm:inline">
                    <UserTooltip user={comment.user}>
                        <Link href={`/users/${comment.user.username}`}>
                            <UserAvatar avatarUrl={comment.user.avatarUrl} size={40} />
                        </Link>
                    </UserTooltip>
                </span>
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1 text-sm">
                                <UserTooltip user={comment.user}>
                                    <Link
                                        href={`/users/${comment.user.username}`}
                                        className="font-semibold hover:underline"
                                    >
                                        {comment.user.displayName}
                                    </Link>
                                </UserTooltip>
                                <span className="text-muted-foreground">
                                    {formatRelativeDate(comment.createdAt)}
                                </span>
                            </div>
                            {isEditing ? (
                                <div className="mt-1 space-y-2">
                                    <Textarea
                                        value={editContent}
                                        onChange={(e) => setEditContent(e.target.value)}
                                        className="min-h-[60px] resize-none"
                                        disabled={editMutation.isPending}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && !e.shiftKey) {
                                                e.preventDefault();
                                                handleEdit();
                                            }
                                            if (e.key === "Escape") {
                                                handleCancelEdit();
                                            }
                                        }}
                                        autoFocus
                                    />
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            onClick={handleEdit}
                                            disabled={!editContent.trim() || editMutation.isPending}
                                        >
                                            {editMutation.isPending && (
                                                <Loader2 className="mr-2 size-3 animate-spin" />
                                            )}
                                            Save
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={handleCancelEdit}
                                            disabled={editMutation.isPending}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-1 break-words">
                                    {comment.content}
                                    {(comment as any).updatedAt && 
                                     (comment as any).createdAt &&
                                     new Date((comment as any).updatedAt).getTime() > new Date((comment as any).createdAt).getTime() + 1000 && (
                                        <span className="text-xs text-muted-foreground ml-2">(edited)</span>
                                    )}
                                </div>
                            )}
                        </div>
                        {comment.user.id === user.id && !isEditing && (
                            <CommentMoreButton
                                comment={comment}
                                onEditClick={handleEditClick}
                                className="opacity-0 transition-opacity group-hover/comment:opacity-100"
                            />
                        )}
                    </div>
                    
                    {/* Actions */}
                    <div className="mt-2 flex items-center gap-4 text-sm">
                        <button
                            onClick={() => likeMutation.mutate()}
                            disabled={likeMutation.isPending}
                            className={cn(
                                "flex items-center gap-1.5 transition-colors",
                                isLiked ? "text-red-500" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Heart className={cn("size-4", isLiked && "fill-current")} />
                            {likesCount > 0 && (
                                <span className="text-xs">{likesCount}</span>
                            )}
                        </button>
                        
                        <button
                            onClick={handleReplyClick}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Reply
                        </button>
                        
                        {replyCount > 0 && !showReplies && (
                            <button
                                onClick={() => setShowReplies(true)}
                                className="text-primary hover:underline font-medium"
                            >
                                View {replyCount} {replyCount === 1 ? "reply" : "replies"}
                            </button>
                        )}
                    </div>

                    {/* Reply input */}
                    {showReplyInput && (
                        <div className="mt-3 flex gap-2">
                            <UserAvatar avatarUrl={user.avatarUrl} size={32} />
                            <div className="flex-1 space-y-2">
                                <Textarea
                                    value={replyContent}
                                    onChange={(e) => setReplyContent(e.target.value)}
                                    placeholder={`Reply to ${comment.user.displayName}...`}
                                    className="min-h-[60px] resize-none"
                                    disabled={createReplyMutation.isPending}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();
                                            handleReply();
                                        }
                                    }}
                                />
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        onClick={handleReply}
                                        disabled={!replyContent.trim() || createReplyMutation.isPending}
                                    >
                                        {createReplyMutation.isPending && (
                                            <Loader2 className="mr-2 size-3 animate-spin" />
                                        )}
                                        Post
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                            setShowReplyInput(false);
                                            setReplyContent("");
                                        }}
                                        disabled={createReplyMutation.isPending}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Replies */}
                    {showReplies && (
                        <div className="mt-3 space-y-3">
                            {status === "pending" && (
                                <Loader2 className="size-4 animate-spin text-muted-foreground" />
                            )}
                            
                            {replies.map((reply) => (
                                <ReplyItem key={reply.id} reply={reply} postId={postId} />
                            ))}
                            
                            {hasNextPage && (
                                <button
                                    onClick={() => fetchNextPage()}
                                    disabled={isFetching}
                                    className="text-sm text-primary hover:underline font-medium"
                                >
                                    {isFetching ? "Loading..." : "Load more replies"}
                                </button>
                            )}
                            
                            {showReplies && replyCount > 0 && replies.length > 0 && (
                                <button
                                    onClick={() => setShowReplies(false)}
                                    className="text-sm text-muted-foreground hover:text-foreground"
                                >
                                    Hide replies
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Separate component for replies
function ReplyItem({ 
    reply, 
    postId 
}: { 
    reply: CommentData & { 
        _count?: { likes: number };
        likes?: { userId: string }[];
    }; 
    postId: string 
}) {
    const { user } = useSession();
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(reply.content);
    const queryClient = useQueryClient();
    const { toast } = useToast();
    
    const isLiked = reply.likes?.some(like => like.userId === user.id) || false;
    const likesCount = reply._count?.likes || 0;

    // Edit reply mutation
    const editMutation = useMutation({
        mutationFn: async (content: string) => {
            return kyInstance
                .patch(`/api/posts/${postId}/comments/${reply.id}`, {
                    json: { content },
                })
                .json<CommentData>();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["comment-replies"] });
            setIsEditing(false);
            toast({ description: "Reply updated" });
        },
        onError: () => {
            toast({
                variant: "destructive",
                description: "Failed to update reply. Please try again.",
            });
        },
    });

    const handleEdit = () => {
        if (!editContent.trim()) return;
        editMutation.mutate(editContent.trim());
    };

    const handleEditClick = () => {
        setIsEditing(true);
        setEditContent(reply.content);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditContent(reply.content);
    };

    // Like reply mutation
    const likeMutation = useMutation({
        mutationFn: async () => {
            if (isLiked) {
                await kyInstance.delete(`/api/posts/${postId}/comments/${reply.id}/likes`);
            } else {
                await kyInstance.post(`/api/posts/${postId}/comments/${reply.id}/likes`);
            }
        },
        onError: () => {
            toast({
                variant: "destructive",
                description: "Something went wrong. Please try again.",
            });
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["comment-replies"] });
        },
    });

    return (
        <div className="group/reply flex gap-3 pl-2">
            <UserTooltip user={reply.user}>
                <Link href={`/users/${reply.user.username}`}>
                    <UserAvatar avatarUrl={reply.user.avatarUrl} size={32} />
                </Link>
            </UserTooltip>
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1 text-sm">
                            <UserTooltip user={reply.user}>
                                <Link
                                    href={`/users/${reply.user.username}`}
                                    className="font-semibold hover:underline"
                                >
                                    {reply.user.displayName}
                                </Link>
                            </UserTooltip>
                            <span className="text-muted-foreground text-xs">
                                {formatRelativeDate(reply.createdAt)}
                            </span>
                        </div>
                        {isEditing ? (
                            <div className="mt-0.5 space-y-2">
                                <Textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    className="min-h-[50px] resize-none text-sm"
                                    disabled={editMutation.isPending}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();
                                            handleEdit();
                                        }
                                        if (e.key === "Escape") {
                                            handleCancelEdit();
                                        }
                                    }}
                                    autoFocus
                                />
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        onClick={handleEdit}
                                        disabled={!editContent.trim() || editMutation.isPending}
                                    >
                                        {editMutation.isPending && (
                                            <Loader2 className="mr-2 size-3 animate-spin" />
                                        )}
                                        Save
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={handleCancelEdit}
                                        disabled={editMutation.isPending}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-0.5 text-sm break-words">
                                {reply.content}
                                {(reply as any).updatedAt && 
                                 (reply as any).createdAt &&
                                 new Date((reply as any).updatedAt).getTime() > new Date((reply as any).createdAt).getTime() + 1000 && (
                                    <span className="text-xs text-muted-foreground ml-2">(edited)</span>
                                )}
                            </div>
                        )}
                    </div>
                    {reply.user.id === user.id && !isEditing && (
                        <CommentMoreButton
                            comment={reply}
                            onEditClick={handleEditClick}
                            className="opacity-0 transition-opacity group-hover/reply:opacity-100"
                        />
                    )}
                </div>
                
                {/* Reply actions */}
                <div className="mt-1.5 flex items-center gap-4">
                    <button
                        onClick={() => likeMutation.mutate()}
                        disabled={likeMutation.isPending}
                        className={cn(
                            "flex items-center gap-1 text-sm transition-colors",
                            isLiked ? "text-red-500" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Heart className={cn("size-3.5", isLiked && "fill-current")} />
                        {likesCount > 0 && (
                            <span className="text-xs">{likesCount}</span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}