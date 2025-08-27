import { Metadata } from "next";
import VerifyEmailForm from "./verify/VerifyEmailForm";

export const metadata: Metadata = {
  title: "Verify email",
};

export default function Page({ searchParams }: { searchParams: { token?: string } }) {
  const token = searchParams?.token ?? "";
  return (
    <main className="flex h-screen items-center justify-center p-5">
      <div className="w-full max-w-md space-y-6 rounded-2xl bg-card p-8 shadow-2xl">
        <h1 className="text-center text-2xl font-bold">Verify your email</h1>
        <VerifyEmailForm token={token} />
      </div>
    </main>
  );
}
