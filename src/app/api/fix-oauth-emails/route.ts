import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST() {
  try {
    console.log("🔧 Starting OAuth email fix...");

    // Find all OAuth users without emails
    const oauthUsersWithoutEmail = await prisma.user.findMany({
      where: {
        googleId: { not: null },
        email: null
      },
      select: {
        id: true,
        username: true,
        googleId: true,
        displayName: true
      }
    });

    console.log(`📊 Found ${oauthUsersWithoutEmail.length} OAuth users without emails`);

    if (oauthUsersWithoutEmail.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No OAuth users need email updates",
        usersFixed: 0
      });
    }

    // For now, we can't automatically fetch emails from Google without re-authentication
    // But we can prepare the users for manual email updates
    const results = [];

    for (const user of oauthUsersWithoutEmail) {
      results.push({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        googleId: user.googleId,
        needsEmailUpdate: true,
        suggestion: "User needs to sign out and sign in again with Google to get email saved"
      });
    }

    return NextResponse.json({
      success: true,
      message: `Found ${oauthUsersWithoutEmail.length} OAuth users that need email updates`,
      usersNeedingFix: results,
      instructions: [
        "These users need to sign out and sign in again with Google",
        "The updated OAuth callback will now save their email addresses",
        "After re-login, they can use the forgot password feature"
      ]
    });

  } catch (error) {
    console.error("❌ Error fixing OAuth emails:", error);
    return NextResponse.json({ 
      error: "Failed to fix OAuth emails", 
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}