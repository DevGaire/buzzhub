import { google, lucia } from "@/auth";
import kyInstance from "@/lib/ky";
import prisma from "@/lib/prisma";
import streamServerClient from "@/lib/stream";
import { slugify } from "@/lib/utils";
import { OAuth2RequestError } from "arctic";
import { generateIdFromEntropySize } from "lucia";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");

  const storedState = cookies().get("state")?.value;
  const storedCodeVerifier = cookies().get("code_verifier")?.value;

  if (
    !code ||
    !state ||
    !storedState ||
    !storedCodeVerifier ||
    state !== storedState
  ) {
    return new Response(null, { status: 400 });
  }

  try {
    const tokens = await google.validateAuthorizationCode(
      code,
      storedCodeVerifier,
    );

    const googleUser = await kyInstance
      .get("https://www.googleapis.com/oauth2/v1/userinfo", {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      })
      .json<{ id: string; name: string; email: string; picture?: string }>();

    console.log("🔍 Google OAuth: User data received:", {
      id: googleUser.id,
      name: googleUser.name,
      email: googleUser.email
    });

    // Check by googleId first
    let existingUser = await prisma.user.findUnique({
      where: { googleId: googleUser.id },
    });

    // If no user found by googleId, check by email (user may have signed up with email/password)
    if (!existingUser && googleUser.email) {
      const userByEmail = await prisma.user.findUnique({
        where: { email: googleUser.email },
      });
      if (userByEmail) {
        // Link the Google account to the existing email-based user
        existingUser = await prisma.user.update({
          where: { id: userByEmail.id },
          data: { googleId: googleUser.id },
        });
        console.log("🔗 Google OAuth: Linked Google account to existing email user:", existingUser.username);
      }
    }

    if (existingUser) {
      console.log("✅ Google OAuth: Existing user found:", existingUser.username);

      const session = await lucia.createSession(existingUser.id, {});
      const sessionCookie = lucia.createSessionCookie(session.id);
      cookies().set(
        sessionCookie.name,
        sessionCookie.value,
        sessionCookie.attributes,
      );
      return new Response(null, {
        status: 302,
        headers: {
          Location: "/",
        },
      });
    }

    const userId = generateIdFromEntropySize(10);
    const username = slugify(googleUser.name) + "-" + userId.slice(0, 4);

    console.log("🆕 Google OAuth: Creating new user:", {
      username,
      email: googleUser.email,
      displayName: googleUser.name
    });

    await prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: {
          id: userId,
          username,
          displayName: googleUser.name,
          email: googleUser.email,
          googleId: googleUser.id,
        },
      });
      await streamServerClient.upsertUser({
        id: userId,
        username,
        name: username,
      });
    });

    console.log("✅ Google OAuth: New user created successfully with email");

    const session = await lucia.createSession(userId, {});
    const sessionCookie = lucia.createSessionCookie(session.id);
    cookies().set(
      sessionCookie.name,
      sessionCookie.value,
      sessionCookie.attributes,
    );

    return new Response(null, {
      status: 302,
      headers: {
        Location: "/",
      },
    });
  } catch (error) {
    console.error("❌ Google OAuth Error:", error);
    if (error instanceof OAuth2RequestError) {
      return new Response(null, {
        status: 400,
      });
    }
    return new Response(null, {
      status: 500,
    });
  }
}