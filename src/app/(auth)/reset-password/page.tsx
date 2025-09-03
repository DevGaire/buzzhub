import { Metadata } from "next";
import Link from "next/link";
import ResetPasswordForm from "./ResetPasswordForm";
import prisma from "@/lib/prisma";
import { createHash } from "node:crypto";

export const metadata: Metadata = {
  title: "Reset password",
};

export default async function Page({ searchParams }: { searchParams: { token?: string } }) {
  const token = searchParams?.token ?? "";
  
  let isOAuthUser = false;
  let username = "";
  
  if (token) {
    try {
      const tokenHash = createHash("sha256").update(token).digest("hex");
      const record = await prisma.passwordResetToken.findUnique({
        where: { tokenHash },
        include: { user: true }
      });
      
      if (record && record.expiresAt > new Date()) {
        isOAuthUser = !record.user.passwordHash;
        username = record.user.username;
      }
    } catch (error) {
      console.error("Error checking token:", error);
    }
  }

  return (
    <main className="flex h-screen items-center justify-center p-5">
      <div className="w-full max-w-md space-y-6 rounded-2xl bg-card p-8 shadow-2xl">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">
            {isOAuthUser ? "Set Your Password" : "Choose a New Password"}
          </h1>
          {isOAuthUser && username && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
              <p className="text-blue-800">
                <strong>Hi @{username}!</strong> You currently sign in with Google. 
                Setting a password will allow you to sign in with either Google or email/password.
              </p>
            </div>
          )}
        </div>
        
        <ResetPasswordForm token={token} isOAuthUser={isOAuthUser} />
        
        <p className="text-center text-sm">
          <Link href="/login" className="hover:underline">Back to login</Link>
        </p>
        
        {isOAuthUser && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm">
            <p className="text-green-800">
              <strong>✅ After setting your password:</strong> You'll be able to sign in with either Google or your email and password. Your Google login will continue to work as before.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}