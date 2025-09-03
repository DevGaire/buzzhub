import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verify } from "@node-rs/argon2";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    console.log("🔍 Debug Login: Attempting login with email:", email);

    // Find user by email
    const user = await prisma.user.findFirst({
      where: { email },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        passwordHash: true,
        googleId: true,
        createdAt: true
      }
    });

    if (!user) {
      console.log("❌ Debug Login: No user found with email:", email);
      return NextResponse.json({ 
        error: "No user found with this email",
        debug: { email, userFound: false }
      }, { status: 404 });
    }

    console.log("✅ Debug Login: User found:", {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      hasPassword: !!user.passwordHash,
      isOAuth: !!user.googleId,
      passwordHashLength: user.passwordHash?.length || 0
    });

    if (!user.passwordHash) {
      console.log("❌ Debug Login: User has no password hash (OAuth only)");
      return NextResponse.json({ 
        error: "This account uses OAuth login only. No password set.",
        debug: { 
          email, 
          userFound: true, 
          hasPassword: false, 
          isOAuth: true,
          suggestion: "Use Google login or set a password via forgot password"
        }
      }, { status: 400 });
    }

    // Verify password
    console.log("🔐 Debug Login: Verifying password...");
    try {
      const validPassword = await verify(user.passwordHash, password, {
        memoryCost: 19456,
        timeCost: 2,
        outputLen: 32,
        parallelism: 1,
      });

      if (validPassword) {
        console.log("✅ Debug Login: Password verification successful!");
        return NextResponse.json({ 
          success: true,
          message: "Login credentials are valid",
          debug: {
            user: {
              username: user.username,
              email: user.email,
              displayName: user.displayName
            },
            passwordValid: true
          }
        });
      } else {
        console.log("❌ Debug Login: Password verification failed");
        return NextResponse.json({ 
          error: "Invalid password",
          debug: { 
            email, 
            userFound: true, 
            hasPassword: true,
            passwordValid: false,
            suggestion: "The password you entered doesn't match the stored password"
          }
        }, { status: 401 });
      }
    } catch (verifyError) {
      console.error("❌ Debug Login: Password verification error:", verifyError);
      return NextResponse.json({ 
        error: "Password verification failed",
        debug: { 
          email, 
          userFound: true, 
          hasPassword: true,
          verificationError: verifyError instanceof Error ? verifyError.message : "Unknown error"
        }
      }, { status: 500 });
    }

  } catch (error) {
    console.error("❌ Debug Login: Unexpected error:", error);
    return NextResponse.json({ 
      error: "Login debug failed", 
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}