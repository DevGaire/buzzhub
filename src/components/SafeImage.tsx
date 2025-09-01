"use client";

import Image, { ImageProps } from "next/image";
import { useState } from "react";
import avatarPlaceholder from "@/assets/avatar-placeholder.png";

interface SafeImageProps extends Omit<ImageProps, 'onError'> {
  fallbackSrc?: string | any;
}

export default function SafeImage({ 
  src, 
  fallbackSrc = avatarPlaceholder, 
  alt,
  ...props 
}: SafeImageProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  return (
    <Image
      {...props}
      src={hasError ? fallbackSrc : imgSrc}
      alt={alt}
      onError={() => {
        if (!hasError) {
          setHasError(true);
          setImgSrc(fallbackSrc);
        }
      }}
      unoptimized={hasError}
    />
  );
}