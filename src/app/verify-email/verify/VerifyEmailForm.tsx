"use client";

import LoadingButton from "@/components/LoadingButton";
import { useState, useTransition } from "react";
import { verifyEmail } from "./actions";

export default function VerifyEmailForm({ token }: { token: string }) {
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function onVerify() {
    setError(undefined);
    setSuccess(undefined);
    startTransition(async () => {
      const { error, success } = await verifyEmail({ token });
      if (error) setError(error);
      if (success) setSuccess(success);
    });
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-center text-destructive">{error}</p>}
      {success && <p className="text-center text-green-600">{success}</p>}
      <LoadingButton loading={isPending} type="button" className="w-full" onClick={onVerify}>
        Verify email
      </LoadingButton>
    </div>
  );
}
