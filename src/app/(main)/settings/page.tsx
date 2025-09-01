import { Metadata } from "next";
import SettingsTabs from "./SettingsTabs";
import { validateRequest } from "@/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const { user } = await validateRequest();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>
      
      <SettingsTabs />
    </main>
  );
}