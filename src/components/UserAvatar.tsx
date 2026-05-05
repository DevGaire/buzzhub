"use client";

import avatarPlaceholder from "@/assets/avatar-placeholder.png";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useState } from "react";

interface UserAvatarProps {
  avatarUrl: string | null | undefined;
  size?: number;
  className?: string;
  showOnline?: boolean;
}

export default function UserAvatar({
  avatarUrl,
  size,
  className,
  showOnline,
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);

  if (showOnline) {
    return (
      <div className="relative inline-flex flex-shrink-0">
        <Image
          src={imageError || !avatarUrl ? avatarPlaceholder : avatarUrl}
          alt="User avatar"
          width={size ?? 48}
          height={size ?? 48}
          className={cn(
            "aspect-square h-fit flex-none rounded-full bg-secondary object-cover",
            className,
          )}
          onError={() => setImageError(true)}
        />
        <span className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-card bg-green-500" />
      </div>
    );
  }

  return (
    <Image
      src={imageError || !avatarUrl ? avatarPlaceholder : avatarUrl}
      alt="User avatar"
      width={size ?? 48}
      height={size ?? 48}
      className={cn(
        "aspect-square h-fit flex-none rounded-full bg-secondary object-cover",
        className,
      )}
      onError={() => setImageError(true)}
    />
  );
}
