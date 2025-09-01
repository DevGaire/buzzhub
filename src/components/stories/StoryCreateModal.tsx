"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import kyInstance from "@/lib/ky";
import { CreateStoryValues, createStorySchema } from "@/lib/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Upload, X } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useUploadThing } from "@/lib/uploadthing";

interface StoryCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface MediaFile {
    file: File;
    preview: string;
    type: "image" | "video";
    mediaId?: string;
    isUploading: boolean;
}

export default function StoryCreateModal({ isOpen, onClose }: StoryCreateModalProps) {
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);

    const form = useForm<CreateStoryValues>({
        resolver: zodResolver(createStorySchema),
        defaultValues: {
            mediaIds: [],
        },
    });

    const { startUpload, isUploading } = useUploadThing("attachment", {
        onBeforeUploadBegin: (files: File[]) => {
            const renamedFiles = files.map((file: File) => {
                const extension = file.name.split(".").pop();
                return new File([file], `story_${crypto.randomUUID()}.${extension}`, {
                    type: file.type,
                });
            });
            
            // Add files to state as uploading
            setMediaFiles(prev => [
                ...prev,
                ...renamedFiles.map(file => ({
                    file,
                    preview: URL.createObjectURL(file),
                    type: file.type.startsWith("image/") ? "image" as const : "video" as const,
                    isUploading: true,
                }))
            ]);
            
            return renamedFiles;
        },
        onClientUploadComplete: (res) => {
            // Update files with mediaId
            setMediaFiles(prev => 
                prev.map(mediaFile => {
                    const uploadResult = res.find(r => r.name === mediaFile.file.name);
                    if (!uploadResult) return mediaFile;
                    
                    return {
                        ...mediaFile,
                        mediaId: uploadResult.serverData.mediaId,
                        isUploading: false,
                    };
                })
            );
        },
        onUploadError: (error: Error) => {
            // Remove failed uploads
            setMediaFiles(prev => prev.filter(f => !f.isUploading));
            toast({
                variant: "destructive",
                description: error.message,
            });
        },
    });

    const createStoryMutation = useMutation({
        mutationFn: (values: CreateStoryValues) =>
            kyInstance.post("/api/stories", { json: values }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["stories"] });
            toast({
                description: "Story created successfully!",
            });
            handleClose();
        },
        onError: (error) => {
            console.error(error);
            toast({
                variant: "destructive",
                description: "Failed to create story. Please try again.",
            });
        },
    });

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        
        if (files.length === 0) return;
        
        // Validate file types
        const validFiles = files.filter(file => 
            file.type.startsWith("image/") || file.type.startsWith("video/")
        );
        
        if (validFiles.length !== files.length) {
            toast({
                variant: "destructive",
                description: "Only image and video files are supported",
            });
        }
        
        // Check limits
        const totalFiles = mediaFiles.length + validFiles.length;
        if (totalFiles > 10) {
            toast({
                variant: "destructive",
                description: "Maximum 10 media files allowed per story",
            });
            return;
        }
        
        const videoCount = [...mediaFiles, ...validFiles].filter(f => 
            f.type === "video" || f.type?.startsWith("video/")
        ).length;
        if (videoCount > 1) {
            toast({
                variant: "destructive",
                description: "Maximum 1 video allowed per story",
            });
            return;
        }
        
        // Start upload
        startUpload(validFiles);
        
        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const removeFile = (index: number) => {
        setMediaFiles(prev => {
            const file = prev[index];
            URL.revokeObjectURL(file.preview);
            return prev.filter((_, i) => i !== index);
        });
    };

    const handleSubmit = async () => {
        const completedFiles = mediaFiles.filter(f => f.mediaId && !f.isUploading);
        
        if (completedFiles.length === 0) {
            toast({
                variant: "destructive",
                description: "Please wait for uploads to complete",
            });
            return;
        }
        
        const mediaIds = completedFiles.map(f => f.mediaId!); // Non-null assertion since we filtered
        
        try {
            await createStoryMutation.mutateAsync({ mediaIds });
        } catch (error) {
            console.error("Story creation error:", error);
            toast({
                variant: "destructive",
                description: "Failed to create story. Please try again.",
            });
        }
    };

    const handleClose = () => {
        // Clean up previews
        mediaFiles.forEach(file => URL.revokeObjectURL(file.preview));
        setMediaFiles([]);
        form.reset();
        onClose();
    };

    const isProcessing = isUploading || createStoryMutation.isPending;
    const hasUploadingFiles = mediaFiles.some(f => f.isUploading);
    const canSubmit = mediaFiles.length > 0 && !hasUploadingFiles && !isProcessing;

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Create Story</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* File input */}
                    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-8">
                        <Upload className="mb-4 size-12 text-muted-foreground" />
                        <p className="mb-2 text-center text-sm text-muted-foreground">
                            Upload photos and videos for your story
                        </p>
                        <p className="mb-4 text-center text-xs text-muted-foreground">
                            Max 10 images or 1 video • JPG, PNG, MP4
                        </p>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isProcessing}
                        >
                            Choose Files
                        </Button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,video/*"
                            multiple
                            className="hidden"
                            onChange={handleFileSelect}
                        />
                    </div>

                    {/* Media preview */}
                    {mediaFiles.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="font-medium">Selected Media</h3>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                {mediaFiles.map((mediaFile, index) => (
                                    <div key={index} className={`relative aspect-square overflow-hidden rounded-lg ${mediaFile.isUploading ? 'opacity-50' : ''}`}>
                                        {mediaFile.type === "image" ? (
                                            <Image
                                                src={mediaFile.preview}
                                                alt={`Preview ${index + 1}`}
                                                fill
                                                className="object-cover"
                                            />
                                        ) : (
                                            <video
                                                src={mediaFile.preview}
                                                className="h-full w-full object-cover"
                                                muted
                                            />
                                        )}
                                        {mediaFile.isUploading && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                                <Loader2 className="size-6 animate-spin text-white" />
                                            </div>
                                        )}
                                        {!mediaFile.isUploading && (
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                size="sm"
                                                className="absolute right-1 top-1 size-6 p-0"
                                                onClick={() => removeFile(index)}
                                                disabled={isProcessing}
                                            >
                                                <X className="size-3" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            disabled={isProcessing}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSubmit}
                            disabled={!canSubmit}
                        >
                            {(isProcessing || hasUploadingFiles) && <Loader2 className="mr-2 size-4 animate-spin" />}
                            {hasUploadingFiles ? "Uploading..." : "Create Story"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}