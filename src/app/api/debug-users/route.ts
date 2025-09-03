import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    console.log("🔍 Debug: Fetching all users from database...");

    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        passwordHash: true,
        emailVerifiedAt: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log("📊 Debug: Found", users.length, "users in database");

    const userSummary = users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      hasPassword: !!user.passwordHash,
      emailVerified: !!user.emailVerifiedAt,
      createdAt: user.createdAt,
      accountType: user.passwordHash ? 'Email/Password' : 'OAuth (Google)'
    }));

    return NextResponse.json({
      success: true,
      totalUsers: users.length,
      users: userSummary
    });

  } catch (error) {
    console.error("❌ Debug: Error fetching users:", error);
    return NextResponse.json({ 
      error: "Failed to fetch users", 
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}