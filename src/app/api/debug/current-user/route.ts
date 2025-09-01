import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { user: sessionUser } = await validateRequest();
    
    if (!sessionUser) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }

    // Get the full user data from database
    const dbUser = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        createdAt: true,
        _count: {
          select: {
            posts: true,
            followers: true,
            following: true,
          }
        }
      }
    });

    if (!dbUser) {
      return NextResponse.json({ 
        error: "User not found in database",
        sessionUser: sessionUser 
      }, { status: 404 });
    }

    return NextResponse.json({
      message: "Current user information",
      session: {
        id: sessionUser.id,
        username: sessionUser.username,
        displayName: sessionUser.displayName,
      },
      database: dbUser,
      profileUrl: `/users/${dbUser.username}`,
      directLinks: {
        exactUsername: `/users/${dbUser.username}`,
        lowercase: `/users/${dbUser.username.toLowerCase()}`,
        uppercase: `/users/${dbUser.username.toUpperCase()}`,
      },
      debug: {
        usernameLength: dbUser.username.length,
        hasSpaces: dbUser.username.includes(' '),
        hasSpecialChars: /[^a-zA-Z0-9_-]/.test(dbUser.username),
      }
    });
  } catch (error) {
    console.error("Error fetching current user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user data", details: error },
      { status: 500 }
    );
  }
}