"use client";

import { ComponentErrorBoundary } from "@/components/ErrorBoundary";
import UserAvatar from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
    Forward,
    X,
    Search,
    Check,
    Send,
    MessageSquare,
    Users,
    Quote
} from "lucide-react";
import { useState, useMemo } from "react";

interface MessageToForward {
    id: string;
    content: string;
    user: {
        id: string;
        name: string;
        avatar?: string;
    };
    timestamp: Date;
    type?: 'text' | 'image' | 'video' | 'file';
    attachments?: Array<{
        url: string;
        name: string;
        type: string;
    }>;
}

interface ForwardRecipient {
    id: string;
    name: string;
    avatar?: string;
    type: 'user' | 'group';
    lastSeen?: Date;
    isOnline?: boolean;
    memberCount?: number;
}

interface MessageForwardingProps {
    message: MessageToForward;
    recipients: ForwardRecipient[];
    onForward: (message: MessageToForward, recipientIds: string[], comment?: string) => Promise<void>;
    onClose: () => void;
    className?: string;
}

export default function MessageForwarding({
    message,
    recipients,
    onForward,
    onClose,
    className
}: MessageForwardingProps) {
    const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [comment, setComment] = useState("");
    const [isForwarding, setIsForwarding] = useState(false);

    // Filter recipients based on search
    const filteredRecipients = useMemo(() => {
        if (!searchQuery) return recipients;

        return recipients.filter(recipient =>
            recipient.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [recipients, searchQuery]);

    const toggleRecipient = (recipientId: string) => {
        setSelectedRecipients(prev =>
            prev.includes(recipientId)
                ? prev.filter(id => id !== recipientId)
                : [...prev, recipientId]
        );
    };

    const handleForward = async () => {
        if (selectedRecipients.length === 0) {
            toast({
                variant: "destructive",
                description: "Please select at least one recipient",
            });
            return;
        }

        setIsForwarding(true);

        try {
            await onForward(message, selectedRecipients, comment || undefined);

            toast({
                description: `Message forwarded to ${selectedRecipients.length} recipient${selectedRecipients.length !== 1 ? 's' : ''}`,
            });

            onClose();
        } catch (error) {
            console.error('Failed to forward message:', error);
            toast({
                variant: "destructive",
                description: "Failed to forward message. Please try again.",
            });
        } finally {
            setIsForwarding(false);
        }
    };

    const formatMessagePreview = (message: MessageToForward) => {
        if (message.type === 'image') return '📷 Photo';
        if (message.type === 'video') return '🎥 Video';
        if (message.type === 'file') return '📎 File';
        return message.content;
    };

    return (
        <ComponentErrorBoundary componentName="Message Forwarding">
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                <div className={cn(
                    "bg-background rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden",
                    className
                )}>
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Forward className="w-5 h-5" />
                            Forward Message
                        </h3>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={onClose}
                            className="w-8 h-8 p-0"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Message Preview */}
                    <div className="p-4 border-b bg-muted/20">
                        <div className="flex items-start gap-3 p-3 bg-card rounded-lg border">
                            <Quote className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <UserAvatar
                                        avatarUrl={message.user.avatar}
                                        size={20}
                                    />
                                    <span className="text-sm font-medium">
                                        {message.user.name}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {message.timestamp.toLocaleString()}
                                    </span>
                                </div>
                                <div className="text-sm text-muted-foreground truncate">
                                    {formatMessagePreview(message)}
                                </div>
                                {message.attachments && message.attachments.length > 0 && (
                                    <div className="mt-1 text-xs text-blue-500">
                                        +{message.attachments.length} attachment{message.attachments.length !== 1 ? 's' : ''}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Search Recipients */}
                    <div className="p-4 border-b">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search recipients..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    {/* Recipients List */}
                    <div className="flex-1 overflow-y-auto max-h-64">
                        {filteredRecipients.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground">
                                <Users className="w-8 h-8 mx-auto mb-2" />
                                <p>No recipients found</p>
                            </div>
                        ) : (
                            <div className="p-2">
                                {filteredRecipients.map((recipient) => (
                                    <RecipientItem
                                        key={recipient.id}
                                        recipient={recipient}
                                        isSelected={selectedRecipients.includes(recipient.id)}
                                        onToggle={() => toggleRecipient(recipient.id)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Selected Recipients Summary */}
                    {selectedRecipients.length > 0 && (
                        <div className="p-4 border-t bg-blue-50 dark:bg-blue-950/20">
                            <div className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                                Selected ({selectedRecipients.length})
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {selectedRecipients.map((recipientId) => {
                                    const recipient = recipients.find(r => r.id === recipientId);
                                    if (!recipient) return null;

                                    return (
                                        <div
                                            key={recipientId}
                                            className="flex items-center gap-2 px-2 py-1 bg-blue-100 dark:bg-blue-900 rounded-full text-sm"
                                        >
                                            <UserAvatar
                                                avatarUrl={recipient.avatar}
                                                size={16}
                                            />
                                            <span className="text-blue-700 dark:text-blue-300">
                                                {recipient.name}
                                            </span>
                                            <button
                                                onClick={() => toggleRecipient(recipientId)}
                                                className="text-blue-500 hover:text-blue-700"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Comment Section */}
                    <div className="p-4 border-t">
                        <Label htmlFor="forward-comment" className="text-sm font-medium">
                            Add a comment (optional)
                        </Label>
                        <textarea
                            id="forward-comment"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Add a comment to this forwarded message..."
                            className="w-full mt-2 p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={2}
                            maxLength={200}
                        />
                        <div className="text-xs text-muted-foreground text-right mt-1">
                            {comment.length}/200
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between p-4 border-t bg-muted/20">
                        <div className="text-sm text-muted-foreground">
                            {selectedRecipients.length === 0
                                ? "Select recipients to forward"
                                : `Forward to ${selectedRecipients.length} recipient${selectedRecipients.length !== 1 ? 's' : ''}`
                            }
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={onClose}
                                disabled={isForwarding}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleForward}
                                disabled={selectedRecipients.length === 0 || isForwarding}
                                className="gap-2"
                            >
                                {isForwarding ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4" />
                                )}
                                Forward
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </ComponentErrorBoundary>
    );
}

// Individual recipient item component
interface RecipientItemProps {
    recipient: ForwardRecipient;
    isSelected: boolean;
    onToggle: () => void;
}

function RecipientItem({ recipient, isSelected, onToggle }: RecipientItemProps) {
    const getStatusIndicator = () => {
        if (recipient.type === 'group') {
            return (
                <div className="text-xs text-muted-foreground">
                    {recipient.memberCount} members
                </div>
            );
        }

        if (recipient.isOnline) {
            return (
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-xs text-muted-foreground">Online</span>
                </div>
            );
        }

        if (recipient.lastSeen) {
            return (
                <div className="text-xs text-muted-foreground">
                    Last seen {recipient.lastSeen.toLocaleDateString()}
                </div>
            );
        }

        return null;
    };

    return (
        <div
            className={cn(
                "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                isSelected
                    ? "bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800"
                    : "hover:bg-muted/50"
            )}
            onClick={onToggle}
        >
            <div className="relative">
                <UserAvatar
                    avatarUrl={recipient.avatar}
                    size={36}
                />
                {recipient.type === 'group' && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                        <Users className="w-2 h-2 text-white" />
                    </div>
                )}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="font-medium truncate">
                        {recipient.name}
                    </span>
                    {recipient.type === 'group' && (
                        <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                            Group
                        </span>
                    )}
                </div>
                {getStatusIndicator()}
            </div>

            <div className={cn(
                "w-5 h-5 border-2 rounded flex items-center justify-center transition-colors",
                isSelected
                    ? "bg-blue-500 border-blue-500"
                    : "border-muted-foreground"
            )}>
                {isSelected && (
                    <Check className="w-3 h-3 text-white" />
                )}
            </div>
        </div>
    );
}

// Forward button component for message actions
interface ForwardButtonProps {
    onForward: () => void;
    className?: string;
}

export function ForwardButton({ onForward, className }: ForwardButtonProps) {
    return (
        <Button
            size="sm"
            variant="ghost"
            onClick={onForward}
            className={cn("w-8 h-8 p-0", className)}
            title="Forward message"
        >
            <Forward className="w-4 h-4" />
        </Button>
    );
}