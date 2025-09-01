import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import streamServerClient from "@/lib/stream";
import { NextRequest } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: { storyId: string } }
) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { storyId } = params;
    const body = await req.json();
    const { content, recipientId } = body;

    if (!content || !recipientId) {
      return Response.json(
        { error: "Content and recipientId are required" },
        { status: 400 }
      );
    }

    // Verify story exists and is still active
    const story = await prisma.story.findUnique({
      where: { 
        id: storyId,
        expiresAt: { gt: new Date() }
      },
      include: {
        user: {
          select: {
            username: true,
            displayName: true,
          }
        },
        items: {
          take: 1,
          include: {
            media: true
          }
        }
      }
    });

    if (!story) {
      return Response.json(
        { error: "Story not found or expired" },
        { status: 404 }
      );
    }

    // Don't allow replying to your own story
    if (story.userId === user.id) {
      return Response.json(
        { error: "Cannot reply to your own story" },
        { status: 400 }
      );
    }

    // Create or get a direct message channel between the users
    const channel = streamServerClient.channel("messaging", {
      members: [user.id, recipientId],
      created_by_id: user.id,
    });

    await channel.create();

    // Send the story reply as a message with metadata
    const message = await channel.sendMessage({
      text: content,
      user_id: user.id,
      attachments: [],
      custom: {
        type: "story_reply",
        storyId: storyId,
        storyPreview: {
          mediaUrl: story.items[0]?.media?.url,
          mediaType: story.items[0]?.media?.type,
        }
      }
    });

    // Create a notification for the story owner
    await prisma.notification.create({
      data: {
        type: "STORY",
        issuerId: user.id,
        recipientId: recipientId,
        storyId: storyId,
      }
    });

    return Response.json({ 
      success: true, 
      messageId: message.message.id 
    });
  } catch (error) {
    console.error("Error sending story reply:", error);
    return Response.json(
      { error: "Failed to send reply" },
      { status: 500 }
    );
  }
}