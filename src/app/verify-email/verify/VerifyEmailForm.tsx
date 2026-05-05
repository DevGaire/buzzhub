"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { verifyEmail } from "./actions";

export default function VerifyEmailForm({ token }: { token: string }) {
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const [isPending, startTransition] = useTransition();

  // Auto-verify as soon as the page loads with a valid token
  useEffect(() => {
    if (!token) return;
    startTransition(async () => {
      const result = await verifyEmail({ token });
      if (result.error) setError(result.error);
      if (result.success) setSuccess(result.success);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!token) {
    return (
      <p className="text-center text-destructive">
        No verification token provided. Please use the link from your email.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {isPending && (
        <p className="text-center text-muted-foreground">Verifying your email…</p>
      )}
      {error && (
        <div className="space-y-3 text-center">
          <p className="text-destructive">{error}</p>
          <p className="text-sm text-muted-foreground">
            The link may have expired.{" "}
            <Link href="/login" className="text-primary hover:underline">
              Go to login
            </Link>
          </p>
        </div>
      )}
      {success && (
        <div className="space-y-4 text-center">
          <p className="text-green-600">{success}</p>
          <Button className="w-full" asChild>
            <Link href="/login">Go to login</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
