"use client";

import { ComponentErrorBoundary } from "@/components/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Paperclip, Image, FileText } from "lucide-react";
import { useRef, useCallback } from "react";

interface SimpleMediaSharingProps {
    onSendMedia?: (files: File[]) => Promise<void>;
    maxFiles?: number;
    maxFileSize?: number; // in MB
    className?: string;
}

export default function SimpleMediaSharing({
    onSendMedia,
    maxFiles = 5,
    maxFileSize = 25,
    className
}: SimpleMediaSharingProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = useCallback(async (files: FileList | null) => {
        if (!files || files.length === 0) return;

        const fileArray = Array.from(files);

        // Check file count limit
        if (fileArray.length > maxFiles) {
            toast({
                variant: "destructive",
                description: `Maximum ${maxFiles} files allowed`,
            });
            return;
        }

        // Check file sizes
        const oversizedFiles = fileArray.filter(file => file.size > maxFileSize * 1024 * 1024);
        if (oversizedFiles.length > 0) {
            toast({
                variant: "destructive",
                description: `Some files are too large. Maximum ${maxFileSize}MB allowed.`,
            });
            return;
        }

        try {
            await onSendMedia?.(fileArray);
            toast({
                description: `${fileArray.length} file(s) uploaded successfully!`,
            });
        } catch (error) {
            console.error('Failed to send media:', error);
            toast({
                variant: "destructive",
                description: "Failed to upload files. Please try again.",
            });
        }

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [onSendMedia, maxFiles, maxFileSize]);

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <ComponentErrorBoundary componentName="Simple Media Sharing">
            <div className={cn("relative", className)}>
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files)}
                />

                <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleClick}
                    className="w-8 h-8 p-0"
                    title="Attach files"
                >
                    <Paperclip className="w-4 h-4" />
                </Button>
            </div>
        </ComponentErrorBoundary>
    );
}

// Simple file preview component
interface FilePreviewProps {
    file: File;
    onRemove?: () => void;
    className?: string;
}

export function SimpleFilePreview({ file, onRemove, className }: FilePreviewProps) {
    const getFileIcon = () => {
        if (file.type.startsWith('image/')) {
            return <Image className="w-6 h-6 text-green-500" />;
        }
        return <FileText className="w-6 h-6 text-blue-500" />;
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className={cn("flex items-center gap-2 p-2 border rounded", className)}>
            {getFileIcon()}
            <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{file.name}</div>
                <div className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                </div>
            </div>
            {onRemove && (
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={onRemove}
                    className="w-6 h-6 p-0 text-destructive"
                >
                    ×
                </Button>
            )}
        </div>
    );
}