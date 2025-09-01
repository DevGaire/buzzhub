"use client";

import { ComponentErrorBoundary } from "@/components/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
    Image,
    Film,
    File,
    Paperclip,
    X,
    Upload,
    FileText,
    Download,
    Play,
    Pause,
    Volume2,
    VolumeX
} from "lucide-react";
import { useState, useRef, useCallback } from "react";

interface MediaFile {
    id: string;
    file: File;
    type: 'image' | 'video' | 'document' | 'audio';
    preview?: string;
    caption?: string;
    uploading?: boolean;
    progress?: number;
}

interface RichMediaSharingProps {
    onSendMedia?: (files: MediaFile[]) => Promise<void>;
    maxFiles?: number;
    maxFileSize?: number; // in MB
    className?: string;
}

export default function RichMediaSharing({
    onSendMedia,
    maxFiles = 10,
    maxFileSize = 50,
    className
}: RichMediaSharingProps) {
    const [files, setFiles] = useState<MediaFile[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const getFileType = (file: File): MediaFile['type'] => {
        if (file.type.startsWith('image/')) return 'image';
        if (file.type.startsWith('video/')) return 'video';
        if (file.type.startsWith('audio/')) return 'audio';
        return 'document';
    };

    const createPreview = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
                const url = URL.createObjectURL(file);
                resolve(url);
            } else {
                resolve('');
            }
        });
    };

    const addFiles = useCallback(async (newFiles: FileList | File[]) => {
        const fileArray = Array.from(newFiles);

        // Check file count limit
        if (files.length + fileArray.length > maxFiles) {
            toast({
                variant: "destructive",
                description: `Maximum ${maxFiles} files allowed`,
            });
            return;
        }

        const validFiles: MediaFile[] = [];

        for (const file of fileArray) {
            // Check file size
            if (file.size > maxFileSize * 1024 * 1024) {
                toast({
                    variant: "destructive",
                    description: `File "${file.name}" is too large. Maximum ${maxFileSize}MB allowed.`,
                });
                continue;
            }

            const preview = await createPreview(file);
            validFiles.push({
                id: Math.random().toString(36).substr(2, 9),
                file,
                type: getFileType(file),
                preview
            });
        }

        setFiles(prev => [...prev, ...validFiles]);
        setIsOpen(true);
    }, [files.length, maxFiles, maxFileSize]);

    const removeFile = (id: string) => {
        setFiles(prev => {
            const file = prev.find(f => f.id === id);
            if (file?.preview) {
                URL.revokeObjectURL(file.preview);
            }
            return prev.filter(f => f.id !== id);
        });

        if (files.length === 1) {
            setIsOpen(false);
        }
    };

    const updateCaption = (id: string, caption: string) => {
        setFiles(prev => prev.map(file =>
            file.id === id ? { ...file, caption } : file
        ));
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);

        const droppedFiles = e.dataTransfer.files;
        if (droppedFiles.length > 0) {
            addFiles(droppedFiles);
        }
    }, [addFiles]);

    const handleFileSelect = () => {
        fileInputRef.current?.click();
    };

    const handleSend = async () => {
        if (files.length === 0) return;

        try {
            await onSendMedia?.(files);

            // Clean up previews
            files.forEach(file => {
                if (file.preview) {
                    URL.revokeObjectURL(file.preview);
                }
            });

            setFiles([]);
            setIsOpen(false);

            toast({
                description: `${files.length} file(s) sent successfully!`,
            });
        } catch (error) {
            console.error('Failed to send media:', error);
            toast({
                variant: "destructive",
                description: "Failed to send files. Please try again.",
            });
        }
    };

    return (
        <ComponentErrorBoundary componentName="Rich Media Sharing">
            <div className={cn("relative", className)}>
                {/* File Input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                    className="hidden"
                    onChange={(e) => e.target.files && addFiles(e.target.files)}
                />

                {/* Attachment Button */}
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleFileSelect}
                    className="w-8 h-8 p-0"
                    title="Attach files"
                >
                    <Paperclip className="w-4 h-4" />
                </Button>

                {/* Media Preview Modal */}
                {isOpen && (
                    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-background rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b">
                                <h3 className="text-lg font-semibold">
                                    Share Media ({files.length} file{files.length !== 1 ? 's' : ''})
                                </h3>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setIsOpen(false)}
                                    className="w-8 h-8 p-0"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>

                            {/* Drop Zone */}
                            <div
                                className={cn(
                                    "border-2 border-dashed m-4 p-6 rounded-lg transition-colors",
                                    dragOver
                                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                                        : "border-muted-foreground/20"
                                )}
                                onDrop={handleDrop}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setDragOver(true);
                                }}
                                onDragLeave={() => setDragOver(false)}
                            >
                                <div className="text-center">
                                    <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                                    <p className="text-sm text-muted-foreground">
                                        Drop files here or{" "}
                                        <button
                                            onClick={handleFileSelect}
                                            className="text-blue-500 hover:underline"
                                        >
                                            browse
                                        </button>
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Max {maxFiles} files, {maxFileSize}MB each
                                    </p>
                                </div>
                            </div>

                            {/* File List */}
                            {files.length > 0 && (
                                <div className="max-h-64 overflow-y-auto p-4 space-y-3">
                                    {files.map((file) => (
                                        <MediaFilePreview
                                            key={file.id}
                                            file={file}
                                            onRemove={() => removeFile(file.id)}
                                            onCaptionChange={(caption) => updateCaption(file.id, caption)}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Footer */}
                            <div className="flex items-center justify-between p-4 border-t bg-muted/20">
                                <div className="text-sm text-muted-foreground">
                                    {files.length} file{files.length !== 1 ? 's' : ''} selected
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleSend}
                                        disabled={files.length === 0}
                                    >
                                        Send
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </ComponentErrorBoundary>
    );
}

// Individual file preview component
interface MediaFilePreviewProps {
    file: MediaFile;
    onRemove: () => void;
    onCaptionChange: (caption: string) => void;
}

function MediaFilePreview({ file, onRemove, onCaptionChange }: MediaFilePreviewProps) {
    const [showPreview, setShowPreview] = useState(false);

    const getFileIcon = () => {
        switch (file.type) {
            case 'image':
                return <Image className="w-8 h-8 text-green-500" />;
            case 'video':
                return <Film className="w-8 h-8 text-purple-500" />;
            case 'audio':
                return <Volume2 className="w-8 h-8 text-orange-500" />;
            default:
                return <FileText className="w-8 h-8 text-blue-500" />;
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="flex items-start gap-3 p-3 border rounded-lg bg-card">
            {/* File Icon/Preview */}
            <div className="flex-shrink-0">
                {file.preview && (file.type === 'image' || file.type === 'video') ? (
                    <div
                        className="w-12 h-12 rounded-lg overflow-hidden cursor-pointer bg-muted flex items-center justify-center"
                        onClick={() => setShowPreview(true)}
                    >
                        {file.type === 'image' ? (
                            <img
                                src={file.preview}
                                alt={file.file.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <video
                                src={file.preview}
                                className="w-full h-full object-cover"
                                muted
                            />
                        )}
                    </div>
                ) : (
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                        {getFileIcon()}
                    </div>
                )}
            </div>

            {/* File Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium truncate">
                        {file.file.name}
                    </span>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={onRemove}
                        className="w-6 h-6 p-0 text-destructive hover:text-destructive"
                    >
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                <div className="text-xs text-muted-foreground mb-2">
                    {formatFileSize(file.file.size)} • {file.type}
                </div>

                {/* Caption Input */}
                {(file.type === 'image' || file.type === 'video') && (
                    <Input
                        placeholder="Add a caption..."
                        value={file.caption || ''}
                        onChange={(e) => onCaptionChange(e.target.value)}
                        className="h-8 text-sm"
                    />
                )}
            </div>
        </div>
    );
}

// Shared media viewer component for displaying media in messages
interface SharedMediaViewerProps {
    file: {
        type: 'image' | 'video' | 'document' | 'audio';
        url: string;
        name: string;
        size?: number;
        caption?: string;
    };
    className?: string;
}

export function SharedMediaViewer({ file, className }: SharedMediaViewerProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    const handleVideoToggle = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleAudioToggle = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    return (
        <ComponentErrorBoundary componentName="Shared Media Viewer">
            <div className={cn("relative", className)}>
                {file.type === 'image' && (
                    <div className="relative group">
                        <img
                            src={file.url}
                            alt={file.name}
                            className="max-w-sm max-h-64 rounded-lg object-cover"
                        />
                        {file.caption && (
                            <div className="mt-2 text-sm text-muted-foreground">
                                {file.caption}
                            </div>
                        )}
                    </div>
                )}

                {file.type === 'video' && (
                    <div className="relative group max-w-sm">
                        <video
                            ref={videoRef}
                            src={file.url}
                            className="w-full max-h-64 rounded-lg"
                            onPlay={() => setIsPlaying(true)}
                            onPause={() => setIsPlaying(false)}
                            controls
                        />
                        {file.caption && (
                            <div className="mt-2 text-sm text-muted-foreground">
                                {file.caption}
                            </div>
                        )}
                    </div>
                )}

                {file.type === 'audio' && (
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg max-w-xs">
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleAudioToggle}
                            className="w-8 h-8 p-0"
                        >
                            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </Button>

                        <div className="flex-1">
                            <div className="text-sm font-medium">{file.name}</div>
                            <audio
                                ref={audioRef}
                                src={file.url}
                                onPlay={() => setIsPlaying(true)}
                                onPause={() => setIsPlaying(false)}
                                className="w-full mt-1"
                                controls
                            />
                        </div>
                    </div>
                )}

                {file.type === 'document' && (
                    <div className="flex items-center gap-3 p-3 border rounded-lg max-w-xs">
                        <FileText className="w-8 h-8 text-blue-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{file.name}</div>
                            {file.size && (
                                <div className="text-xs text-muted-foreground">
                                    {(file.size / 1024 / 1024).toFixed(1)} MB
                                </div>
                            )}
                        </div>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(file.url, '_blank')}
                            className="w-8 h-8 p-0"
                        >
                            <Download className="w-4 h-4" />
                        </Button>
                    </div>
                )}
            </div>
        </ComponentErrorBoundary>
    );
}