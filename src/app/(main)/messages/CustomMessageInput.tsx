"use client";

import { useChannelActionContext, useChannelStateContext } from "stream-chat-react";
import { MessageInput } from "stream-chat-react";
import RichMediaSharing from "./RichMediaSharing";
import { useUploadThing } from "@/lib/uploadthing";
import { toast } from "@/components/ui/use-toast";
import { useState } from "react";

interface MediaFile {
    id: string;
    file: File;
    type: 'image' | 'video' | 'document' | 'audio';
    preview?: string;
    caption?: string;
}

export default function CustomMessageInput() {
    const { sendMessage } = useChannelActionContext();
    const { channel } = useChannelStateContext();
    const [isUploading, setIsUploading] = useState(false);

    const { startUpload } = useUploadThing("attachment", {
        onClientUploadComplete: async (res) => {
            setIsUploading(false);
            
            // Create Stream Chat attachments from uploaded files
            const attachments = res.map((uploadResult) => {
                const isImage = uploadResult.type?.startsWith('image/');
                const isVideo = uploadResult.type?.startsWith('video/');
                
                return {
                    type: isImage ? 'image' : isVideo ? 'video' : 'file',
                    asset_url: uploadResult.url,
                    title: uploadResult.name,
                    file_size: uploadResult.size,
                    mime_type: uploadResult.type || 'application/octet-stream',
                    ...(isImage && {
                        image_url: uploadResult.url,
                        fallback: uploadResult.name
                    }),
                    ...(isVideo && {
                        asset_url: uploadResult.url,
                        thumb_url: uploadResult.url
                    })
                };
            });

            // Send message with attachments
            try {
                await sendMessage({
                    text: '', // Empty text since we're sending media
                    attachments
                });

                toast({
                    description: `${attachments.length} file(s) sent successfully!`,
                });
            } catch (error) {
                console.error('Failed to send message with attachments:', error);
                toast({
                    variant: "destructive",
                    description: "Failed to send files. Please try again.",
                });
            }
        },
        onUploadError: (error) => {
            setIsUploading(false);
            console.error('Upload error:', error);
            toast({
                variant: "destructive",
                description: "Failed to upload files. Please try again.",
            });
        },
    });

    const handleSendMedia = async (files: MediaFile[]) => {
        if (!files.length) return;

        setIsUploading(true);
        
        try {
            // Extract File objects from MediaFile array
            const fileObjects = files.map(mediaFile => mediaFile.file);
            
            // Start upload process
            await startUpload(fileObjects);
        } catch (error) {
            setIsUploading(false);
            console.error('Failed to start upload:', error);
            toast({
                variant: "destructive",
                description: "Failed to start upload. Please try again.",
            });
        }
    };

    return (
        <div className="flex items-end gap-2 p-2">
            <RichMediaSharing 
                onSendMedia={handleSendMedia}
                className="flex-shrink-0"
            />
            <div className="flex-1">
                <MessageInput focus disabled={isUploading} />
            </div>
        </div>
    );
}