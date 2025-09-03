"use server";

import { lucia } from "@/auth";
import prisma from "@/lib/prisma";
import { loginSchema, LoginValues } from "@/lib/validation";
import { verify } from "@node-rs/argon2";
import { isRedirectError } from "next/dist/client/components/redirect";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function login(
  credentials: LoginValues,
): Promise<{ error: string }> {
  try {
    const { username, password } = loginSchema.parse(credentials);

    console.log("🔍 Login: Attempting login with:", username);

    // Support both username and email login
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          {
            username: {
              equals: username,
              mode: "insensitive",
            },
          },
          {
            email: {
              equals: username,
              mode: "insensitive",
            },
          },
        ],
      },
    });

    if (!existingUser) {
      console.log("❌ Login: No user found with username/email:", username);
      return {
        error: "Incorrect username or password",
      };
    }

    if (!existingUser.passwordHash) {
      console.log("❌ Login: User found but no password hash:", existingUser.username);
      return {
        error: "Incorrect username or password",
      };
    }

    console.log("✅ Login: User found:", existingUser.username, "- Has password:", !!existingUser.passwordHash);

    // Block login for unverified email/password users (but allow OAuth users)
    if (!existingUser.googleId && !existingUser.emailVerifiedAt) {
      console.log("❌ Login: Email not verified for user:", existingUser.username);
      return { error: "Please verify your email before logging in." };
    }

    console.log("🔐 Login: Verifying password...");
    const validPassword = await verify(existingUser.passwordHash, password, {
      memoryCost: 19456,
      timeCost: 2,
      outputLen: 32,
      parallelism: 1,
    });

    if (!validPassword) {
      console.log("❌ Login: Invalid password for user:", existingUser.username);
      return {
        error: "Incorrect username or password",
      };
    }

    console.log("✅ Login: Password verified successfully for user:", existingUser.username);

    const session = await lucia.createSession(existingUser.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);
    cookies().set(
      sessionCookie.name,
      sessionCookie.value,
      sessionCookie.attributes,
    );

    console.log("✅ Login: Session created successfully for user:", existingUser.username);
    return redirect("/");
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("❌ Login: Unexpected error:", error);
    return {
      error: "Something went wrong. Please try again.",
    };
  }
}