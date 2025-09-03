import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import streamServerClient from "@/lib/stream";
import { createUploadthing, FileRouter } from "uploadthing/next";
import { UploadThingError, UTApi } from "uploadthing/server";

const f = createUploadthing();

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
        const key = oldAvatarUrl.split(
          `/a/${process.env.NEXT_PUBLIC_UPLOADTHING_APP_ID}/`,
        )[1];

        await new UTApi().deleteFiles(key);
      }

      const newAvatarUrl = file.url.replace(
        "/f/",
        `/a/${process.env.NEXT_PUBLIC_UPLOADTHING_APP_ID}/`,
      );

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
          url: file.url.replace(
            "/f/",
            `/a/${process.env.NEXT_PUBLIC_UPLOADTHING_APP_ID}/`,
          ),
          type: mediaType,
        },
      });

      console.log("🎵 UploadThing: Media created with ID:", media.id);

      return { mediaId: media.id };
    }),
} satisfies FileRouter;

export type AppFileRouter = typeof fileRouter;