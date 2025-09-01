import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";

// Admin endpoint to clean up stories with broken media
export async function POST(req: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find stories older than 24 hours (expired)
    const expiredStories = await prisma.story.deleteMany({
      where: {
        createdAt: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
        },
      },
    });

    // Optional: Find and remove stories with no media items
    const emptyStories = await prisma.story.deleteMany({
      where: {
        items: {
          none: {},
        },
      },
    });

    return Response.json({
      success: true,
      deleted: {
        expired: expiredStories.count,
        empty: emptyStories.count,
      },
    });
  } catch (error) {
    console.error("Error cleaning up stories:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Get cleanup status
export async function GET(req: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const expiredCount = await prisma.story.count({
      where: {
        createdAt: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    });

    const emptyCount = await prisma.story.count({
      where: {
        items: {
          none: {},
        },
      },
    });

    const totalStories = await prisma.story.count();

    return Response.json({
      totalStories,
      expiredStories: expiredCount,
      emptyStories: emptyCount,
    });
  } catch (error) {
    console.error("Error getting cleanup status:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}