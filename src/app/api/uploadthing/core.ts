import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import streamServerClient from "@/lib/stream";
import { createUploadthing, FileRouter } from "uploadthing/next";
import { UploadThingError, UTApi } from "uploadthing/server";

const f = createUploadthing();

/**
 * Normalise any UploadThing file URL to the app-authenticated form
 * (https://utfs.io/a/<appId>/<key>) so Next.js Image can load it.
 * Works with both the old utfs.io/f/ and the newer <appId>.ufs.sh/f/ formats.
 */
function normalizeUploadthingUrl(rawUrl: string): string {
  const appId = process.env.NEXT_PUBLIC_UPLOADTHING_APP_ID;
  const match = rawUrl.match(/\/f\/([^/?#]+)/);
  if (match && appId) {
    return `https://utfs.io/a/${appId}/${match[1]}`;
  }
  return rawUrl; // Already in correct form or unknown format — use as-is
}

/**
 * Extract the file key from a stored UploadThing URL so UTApi.deleteFiles
 * can delete it regardless of which URL format was stored.
 */
function extractUploadthingKey(storedUrl: string): string | null {
  // Matches /f/<key> or /a/<appId>/<key>
  const match =
    storedUrl.match(/\/f\/([^/?#]+)/) ||
    storedUrl.match(/\/a\/[^/]+\/([^/?#]+)/);
  return match ? match[1] : null;
}

export const fileRouter = {
  avatar: f({
    image: { maxFileSize: "512KB" },
  })
    .middleware(async () => {
      const { user } = await validateRequest();

      if (!user) throw new UploadThingError("Unauthorized");

      return { user };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const oldAvatarUrl = metadata.user.avatarUrl;

      if (oldAvatarUrl) {
        const key = extractUploadthingKey(oldAvatarUrl);
        if (key) await new UTApi().deleteFiles(key);
      }

      const newAvatarUrl = normalizeUploadthingUrl(file.url);

      await Promise.all([
        prisma.user.update({
          where: { id: metadata.user.id },
          data: {
            avatarUrl: newAvatarUrl,
          },
        }),
        streamServerClient.partialUpdateUser({
          id: metadata.user.id,
          set: {
            image: newAvatarUrl,
          },
        }),
      ]);

      return { avatarUrl: newAvatarUrl };
    }),
  cover: f({ image: { maxFileSize: "4MB" } })
    .middleware(async () => {
      const { user } = await validateRequest();
      if (!user) throw new UploadThingError("Unauthorized");
      return { user };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const oldCoverUrl = metadata.user.coverUrl;
      if (oldCoverUrl) {
        const key = extractUploadthingKey(oldCoverUrl);
        if (key) await new UTApi().deleteFiles(key);
      }
      const newCoverUrl = normalizeUploadthingUrl(file.url);
      await prisma.user.update({
        where: { id: metadata.user.id },
        data: { coverUrl: newCoverUrl },
      });
      return { coverUrl: newCoverUrl };
    }),
  attachment: f({
    image: { maxFileSize: "4MB", maxFileCount: 5 },
    video: { maxFileSize: "64MB", maxFileCount: 5 },
    audio: { maxFileSize: "16MB", maxFileCount: 5 },
  })
    .middleware(async () => {
      const { user } = await validateRequest();

      if (!user) throw new UploadThingError("Unauthorized");

      return {};
    })
    .onUploadComplete(async ({ file }) => {
      console.log("🎵 UploadThing: Processing file", {
        name: file.name,
        type: file.type,
        size: file.size
      });

      // Determine media type based on file type
      let mediaType: "IMAGE" | "VIDEO" | "AUDIO" | "GIF" = "IMAGE";
      
      if (file.type.startsWith("image/gif")) {
        mediaType = "GIF";
      } else if (file.type.startsWith("image/")) {
        mediaType = "IMAGE";
      } else if (file.type.startsWith("video/")) {
        mediaType = "VIDEO";
      } else if (file.type.startsWith("audio/")) {
        mediaType = "AUDIO";
      }

      console.log("🎵 UploadThing: Detected media type:", mediaType);

      const media = await prisma.media.create({
        data: {
          url: normalizeUploadthingUrl(file.url),
          type: mediaType,
        },
      });

      console.log("🎵 UploadThing: Media created with ID:", media.id);

      return { mediaId: media.id };
    }),
} satisfies FileRouter;

export type AppFileRouter = typeof fileRouter;