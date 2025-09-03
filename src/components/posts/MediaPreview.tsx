"use client";

import { Media } from "@prisma/client";
import Image from "next/image";
import { useState } from "react";

interface MediaPreviewProps {
  media: Media;
}

export default function MediaPreview({ media }: MediaPreviewProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  console.log("🖼️ MediaPreview: Rendering media", {
    id: media.id,
    type: media.type,
    url: media.url,
    urlValid: media.url.startsWith('http')
  });

  if (media.type === "IMAGE") {
    if (imageError) {
      return (
        <div className="mx-auto size-fit max-h-[30rem] rounded-2xl bg-muted flex items-center justify-center p-8">
          <div className="text-center">
            <p className="text-destructive font-medium">❌ Image failed to load</p>
            <p className="text-sm text-muted-foreground mt-2">URL: {media.url}</p>
            <button 
              onClick={() => {
                setImageError(false);
                setImageLoading(true);
              }}
              className="mt-2 text-xs text-primary hover:underline"
            >
              🔄 Retry
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="relative mx-auto size-fit max-h-[30rem] rounded-2xl overflow-hidden">
        {imageLoading && (
          <div className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Loading image...</p>
          </div>
        )}
        <Image
          src={media.url}
          alt="Attachment"
          width={500}
          height={500}
          className="mx-auto size-fit max-h-[30rem] rounded-2xl"
          onError={(e) => {
            console.error("❌ Image failed to load:", media.url, e);
            setImageError(true);
            setImageLoading(false);
          }}
          onLoad={() => {
            console.log("✅ Image loaded successfully:", media.url);
            setImageLoading(false);
          }}
          onLoadStart={() => {
            console.log("🔄 Image loading started:", media.url);
            setImageLoading(true);
          }}
        />
      </div>
    );
  }

  if (media.type === "VIDEO") {
    return (
      <div className="mx-auto size-fit max-h-[30rem] rounded-2xl overflow-hidden">
        <video
          src={media.url}
          controls
          className="mx-auto size-fit max-h-[30rem] rounded-2xl"
          onError={(e) => {
            console.error("❌ Video failed to load:", media.url, e);
          }}
          onLoadStart={() => {
            console.log("🔄 Video loading started:", media.url);
          }}
          onCanPlay={() => {
            console.log("✅ Video can play:", media.url);
          }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto size-fit max-h-[30rem] rounded-2xl bg-muted flex items-center justify-center p-8">
      <p className="text-destructive">❌ Unsupported media type: {media.type}</p>
    </div>
  );
}