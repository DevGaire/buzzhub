"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";
import { useMutation } from "@tanstack/react-query";
import kyInstance from "@/lib/ky";
import { Loader2, Key, Shield, Smartphone, History, AlertTriangle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function SecuritySettings() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const changePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      kyInstance.post("/api/user/change-password", { json: data }),
    onSuccess: () => {
      toast({
        description: "Password changed successfully",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: () => {
      toast({
        variant: "destructive",
        description: "Failed to change password",
      });
    },
  });

  const handlePasswordChange = () => {
    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        description: "Passwords do not match",
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        variant: "destructive",
        description: "Password must be at least 8 characters",
      });
      return;
    }

    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            Update your password to keep your account secure
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Current Password</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
            />
            <p className="text-sm text-muted-foreground">
              Must be at least 8 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
          </div>

          <Button
            onClick={handlePasswordChange}
            disabled={changePasswordMutation.isPending}
          >
            {changePasswordMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Change Password
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Two-Factor Authentication</CardTitle>
          <CardDescription>
            Add an extra layer of security to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="2fa">Enable 2FA</Label>
                <p className="text-sm text-muted-foreground">
                  Require a code from your phone to sign in
                </p>
              </div>
            </div>
            <Switch
              id="2fa"
              checked={twoFactorEnabled}
              onCheckedChange={setTwoFactorEnabled}
            />
          </div>

          {twoFactorEnabled && (
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm">
                <Smartphone className="h-4 w-4" />
                <span>Scan this QR code with your authenticator app</span>
              </div>
              <div className="flex justify-center p-4 bg-white rounded">
                {/* QR Code would go here */}
                <div className="h-32 w-32 bg-gray-200 rounded" />
              </div>
              <Input placeholder="Enter verification code" />
              <Button className="w-full">Verify and Enable</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Login Activity</CardTitle>
          <CardDescription>
            Recent login attempts and active sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Device</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Chrome on Windows</TableCell>
                <TableCell>New York, US</TableCell>
                <TableCell>Today, 2:30 PM</TableCell>
                <TableCell>
                  <span className="text-sm text-green-600">Current</span>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Safari on iPhone</TableCell>
                <TableCell>New York, US</TableCell>
                <TableCell>Yesterday, 8:15 AM</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm">
                    Revoke
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-yellow-500/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Suspicious Activity
          </CardTitle>
          <CardDescription>
            We'll alert you to any unusual account activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No suspicious activity detected. We're monitoring your account 24/7.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}