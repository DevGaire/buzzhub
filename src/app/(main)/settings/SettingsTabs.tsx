"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User, 
  Bell, 
  Shield, 
  Palette, 
  Key,
  UserX,
  Database,
  CreditCard
} from "lucide-react";
import AccountSettings from "./AccountSettings";
import NotificationSettings from "./NotificationSettings";
import PrivacySettings from "./PrivacySettings";
import AppearanceSettings from "./AppearanceSettings";
import SecuritySettings from "./SecuritySettings";
import BlockedUsers from "./BlockedUsers";
import DataSettings from "./DataSettings";
import SubscriptionSettings from "./SubscriptionSettings";

export default function SettingsTabs() {
  return (
    <Tabs defaultValue="account" className="space-y-6">
      <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
        <TabsTrigger value="account" className="flex items-center gap-2">
          <User className="h-4 w-4" />
          <span className="hidden sm:inline">Account</span>
        </TabsTrigger>
        <TabsTrigger value="notifications" className="flex items-center gap-2">
          <Bell className="h-4 w-4" />
          <span className="hidden sm:inline">Notifications</span>
        </TabsTrigger>
        <TabsTrigger value="privacy" className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          <span className="hidden sm:inline">Privacy</span>
        </TabsTrigger>
        <TabsTrigger value="appearance" className="flex items-center gap-2">
          <Palette className="h-4 w-4" />
          <span className="hidden sm:inline">Appearance</span>
        </TabsTrigger>
        <TabsTrigger value="security" className="flex items-center gap-2">
          <Key className="h-4 w-4" />
          <span className="hidden sm:inline">Security</span>
        </TabsTrigger>
        <TabsTrigger value="blocked" className="flex items-center gap-2">
          <UserX className="h-4 w-4" />
          <span className="hidden sm:inline">Blocked</span>
        </TabsTrigger>
        <TabsTrigger value="data" className="flex items-center gap-2">
          <Database className="h-4 w-4" />
          <span className="hidden sm:inline">Data</span>
        </TabsTrigger>
        <TabsTrigger value="subscription" className="flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          <span className="hidden sm:inline">Premium</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="account">
        <AccountSettings />
      </TabsContent>

      <TabsContent value="notifications">
        <NotificationSettings />
      </TabsContent>

      <TabsContent value="privacy">
        <PrivacySettings />
      </TabsContent>

      <TabsContent value="appearance">
        <AppearanceSettings />
      </TabsContent>

      <TabsContent value="security">
        <SecuritySettings />
      </TabsContent>

      <TabsContent value="blocked">
        <BlockedUsers />
      </TabsContent>

      <TabsContent value="data">
        <DataSettings />
      </TabsContent>

      <TabsContent value="subscription">
        <SubscriptionSettings />
      </TabsContent>
    </Tabs>
  );
}