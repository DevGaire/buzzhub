"use client";

import { MessageUIComponentProps, useMessageContext } from "stream-chat-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CustomMessage(props: MessageUIComponentProps) {
    const { message, isMyMessage } = useMessageContext();
    const [imageError, setImageError] = useState<Record<string, boolean>>({});

    if (!message) return null;

    const isOwn = isMyMessage();

    const handleImageError = (attachmentId: string) => {
        setImageError(prev => ({ ...prev, [attachmentId]: true }));
    };

    const formatFileSize = (bytes?: number) => {
        if (!bytes) return '';
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    };

    return (
        <div className={cn(
            "flex gap-3 p-3 max-w-md",
            isOwn ? "ml-auto flex-row-reverse" : "mr-auto"
        )}>
            {/* Avatar */}
            {!isOwn && (
                <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarImage src={message.user?.image} />
                    <AvatarFallback>
                        {message.user?.name?.[0] || message.user?.id?.[0] || '?'}
                    </AvatarFallback>
                </Avatar>
            )}

            {/* Message Content */}
            <div className={cn(
                "flex flex-col gap-2",
                isOwn ? "items-end" : "items-start"
            )}>
                {/* User name (for others' messages) */}
                {!isOwn && (
                    <span className="text-xs text-muted-foreground font-medium">
                        {message.user?.name || message.user?.id}
                    </span>
                )}

                {/* Text content */}
                {message.text && (
                    <div className={cn(
                        "px-3 py-2 rounded-lg max-w-xs break-words",
                        isOwn 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-muted"
                    )}>
                        {message.text}
                    </div>
                )}

                {/* Attachments */}
                {message.attachments && message.attachments.length > 0 && (
                    <div className="flex flex-col gap-2">
                        {message.attachments.map((attachment, index) => {
                            const attachmentId = `${message.id}-${index}`;
                            
                            // Image attachment
                            if (attachment.type === 'image' && attachment.image_url) {
                                return (
                                    <div key={attachmentId} className="relative">
                                        {!imageError[attachmentId] ? (
                                            <img
                                                src={attachment.image_url}
                                                alt={attachment.title || 'Image'}
                                                className="max-w-xs max-h-64 rounded-lg object-cover cursor-pointer"
                                                onError={() => handleImageError(attachmentId)}
                                                onClick={() => window.open(attachment.image_url, '_blank')}
                                            />
                                        ) : (
                                            <div className="w-48 h-32 bg-muted rounded-lg flex items-center justify-center">
                                                <span className="text-sm text-muted-foreground">
                                                    Failed to load image
                                                </span>
                                            </div>
                                        )}
                                        {attachment.title && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {attachment.title}
                                            </p>
                                        )}
                                    </div>
                                );
                            }

                            // Video attachment
                            if (attachment.type === 'video' && attachment.asset_url) {
                                return (
                                    <div key={attachmentId} className="relative">
                                        <video
                                            className="max-w-xs max-h-64 rounded-lg"
                                            controls
                                        >
                                            <source src={attachment.asset_url} type={attachment.mime_type} />
                                            Your browser does not support the video tag.
                                        </video>
                                        {attachment.title && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {attachment.title}
                                            </p>
                                        )}
                                    </div>
                                );
                            }

                            // File attachment
                            if (attachment.type === 'file' && attachment.asset_url) {
                                return (
                                    <div key={attachmentId} className="flex items-center gap-3 p-3 border rounded-lg max-w-xs">
                                        <FileText className="w-8 h-8 text-blue-500 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium truncate">
                                                {attachment.title || 'File'}
                                            </div>
                                            {attachment.file_size && (
                                                <div className="text-xs text-muted-foreground">
                                                    {formatFileSize(attachment.file_size)}
                                                </div>
                                            )}
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => window.open(attachment.asset_url, '_blank')}
                                            className="w-8 h-8 p-0"
                                        >
                                            <Download className="w-4 h-4" />
                                        </Button>
                                    </div>
                                );
                            }

                            return null;
                        })}
                    </div>
                )}

                {/* Timestamp */}
                <span className="text-xs text-muted-foreground">
                    {message.created_at && new Date(message.created_at).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                    })}
                </span>
            </div>
        </div>
    );
}