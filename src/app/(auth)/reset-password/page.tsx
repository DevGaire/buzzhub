import { Metadata } from "next";
import Link from "next/link";
import ResetPasswordForm from "./ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset password",
};

export default function Page({ searchParams }: { searchParams: { token?: string } }) {
  const token = searchParams?.token ?? "";
  return (
    <main className="flex h-screen items-center justify-center p-5">
      <div className="w-full max-w-md space-y-6 rounded-2xl bg-card p-8 shadow-2xl">
        <h1 className="text-center text-2xl font-bold">Choose a new password</h1>
        <ResetPasswordForm token={token} />
        <p className="text-center text-sm">
          <Link href="/login" className="hover:underline">Back to login</Link>
        </p>
      </div>
    </main>
  );
}
