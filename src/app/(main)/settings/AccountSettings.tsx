"use client";

import { useState } from "react";
import { useSession } from "../SessionProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { useMutation } from "@tanstack/react-query";
import kyInstance from "@/lib/ky";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { logout } from "@/app/(auth)/actions";

interface UpdateProfileData {
  displayName?: string;
  bio?: string;
  username?: string;
  email?: string;
}

export default function AccountSettings() {
  const { user } = useSession();
  const [displayName, setDisplayName] = useState(user.displayName);
  const [bio, setBio] = useState("");
  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState("");

  const updateProfileMutation = useMutation({
    mutationFn: (data: UpdateProfileData) =>
      kyInstance.patch("/api/user/profile", { json: data }),
    onSuccess: () => {
      toast({
        description: "Profile updated successfully",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        description: "Failed to update profile",
      });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: () => kyInstance.delete("/api/user/account"),
    onSuccess: () => {
      toast({
        description: "Account deleted successfully",
      });
      logout();
    },
    onError: () => {
      toast({
        variant: "destructive",
        description: "Failed to delete account",
      });
    },
  });

  const handleSave = () => {
    updateProfileMutation.mutate({
      displayName,
      bio,
      username,
      email,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>
            Update your profile information that&apos;s visible to other users
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your display name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="@username"
            />
            <p className="text-sm text-muted-foreground">
              Your unique username for your profile URL
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself"
              rows={4}
              maxLength={500}
            />
            <p className="text-sm text-muted-foreground">
              {bio.length}/500 characters
            </p>
          </div>

          <Button
            onClick={handleSave}
            disabled={updateProfileMutation.isPending}
          >
            {updateProfileMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save Changes
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions for your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Are you absolutely sure?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your
                  account and remove all your data from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteAccountMutation.mutate()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete Account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}