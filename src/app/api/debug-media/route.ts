import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    console.log("🔍 Debug: Fetching media attachments...");

    // Get recent posts with media attachments
    const postsWithMedia = await prisma.post.findMany({
      where: {
        attachments: {
          some: {}
        }
      },
      include: {
        attachments: true,
        user: {
          select: {
            username: true,
            displayName: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    console.log(`📊 Debug: Found ${postsWithMedia.length} posts with media`);

    const mediaDebugInfo = postsWithMedia.map(post => ({
      postId: post.id,
      user: post.user.username,
      createdAt: post.createdAt,
      content: post.content.substring(0, 50) + "...",
      attachments: post.attachments.map(media => ({
        id: media.id,
        type: media.type,
        url: media.url,
        urlValid: media.url.startsWith('http'),
        isUploadThingUrl: media.url.includes('uploadthing') || media.url.includes('ufs.sh'),
        createdAt: media.createdAt
      }))
    }));

    return NextResponse.json({
      success: true,
      totalPostsWithMedia: postsWithMedia.length,
      posts: mediaDebugInfo
    });

  } catch (error) {
    console.error("❌ Debug: Error fetching media:", error);
    return NextResponse.json({ 
      error: "Failed to fetch media debug info", 
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}