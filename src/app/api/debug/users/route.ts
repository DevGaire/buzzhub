import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { user } = await validateRequest();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all users (limited to 10 for safety)
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        createdAt: true,
      },
      take: 10,
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      currentUser: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
      },
      totalUsers: await prisma.user.count(),
      users: users,
      profileUrls: users.map(u => `/users/${u.username}`)
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}