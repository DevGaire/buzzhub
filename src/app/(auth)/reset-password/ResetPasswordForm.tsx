"use client";

import LoadingButton from "@/components/LoadingButton";
import { PasswordInput } from "@/components/PasswordInput";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { resetPasswordSchema, ResetPasswordValues } from "@/lib/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { resetPassword } from "./actions";

interface ResetPasswordFormProps {
  token: string;
  isOAuthUser?: boolean;
}

export default function ResetPasswordForm({ token, isOAuthUser = false }: ResetPasswordFormProps) {
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const [isPending, startTransition] = useTransition();

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "" },
  });

  async function onSubmit(values: ResetPasswordValues) {
    setError(undefined);
    setSuccess(undefined);
    startTransition(async () => {
      const { error, success } = await resetPassword({ ...values, token });
      if (error) setError(error);
      if (success) {
        setSuccess(isOAuthUser 
          ? "Password set successfully! You can now sign in with email/password or Google."
          : success
        );
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        {error && <p className="text-center text-destructive">{error}</p>}
        {success && <p className="text-center text-green-600">{success}</p>}
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {isOAuthUser ? "Set your password" : "New password"}
              </FormLabel>
              <FormControl>
                <PasswordInput 
                  placeholder={isOAuthUser ? "Choose a password" : "New password"} 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <LoadingButton loading={isPending} type="submit" className="w-full">
          {isOAuthUser ? "Set Password" : "Reset Password"}
        </LoadingButton>
      </form>
    </Form>
  );
}