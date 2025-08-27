import { Metadata } from "next";
import Link from "next/link";
import ForgotPasswordForm from "./ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot password",
};

export default function Page() {
  return (
    <main className="flex h-screen items-center justify-center p-5">
      <div className="w-full max-w-md space-y-6 rounded-2xl bg-card p-8 shadow-2xl">
        <h1 className="text-center text-2xl font-bold">Reset your password</h1>
        <p className="text-sm text-muted-foreground text-center">
          Enter your account email and we will send you a link to reset your password.
        </p>
        <ForgotPasswordForm />
        <p className="text-center text-sm">
          Remembered it? {" "}
          <Link href="/login" className="hover:underline">Back to login</Link>
        </p>
      </div>
    </main>
  );
}
