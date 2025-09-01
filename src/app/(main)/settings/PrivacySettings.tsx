"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { useMutation } from "@tanstack/react-query";
import kyInstance from "@/lib/ky";
import { Loader2, Lock, Eye, Users, Globe, UserCheck, Shield } from "lucide-react";

interface PrivacySettings {
  profileVisibility: "PUBLIC" | "FOLLOWERS" | "PRIVATE";
  showOnlineStatus: boolean;
  allowTagging: boolean;
  allowMessagesFrom: "EVERYONE" | "FOLLOWERS" | "NO_ONE";
  showActivityStatus: boolean;
  hideStoryFrom: string[];
  closeFriends: string[];
}

export default function PrivacySettings() {
  const [settings, setSettings] = useState<PrivacySettings>({
    profileVisibility: "PUBLIC",
    showOnlineStatus: true,
    allowTagging: true,
    allowMessagesFrom: "EVERYONE",
    showActivityStatus: true,
    hideStoryFrom: [],
    closeFriends: [],
  });

  const updatePrivacyMutation = useMutation({
    mutationFn: (data: PrivacySettings) =>
      kyInstance.put("/api/user/privacy-settings", { json: data }),
    onSuccess: () => {
      toast({
        description: "Privacy settings updated",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        description: "Failed to update privacy settings",
      });
    },
  });

  const handleSave = () => {
    updatePrivacyMutation.mutate(settings);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Account Privacy</CardTitle>
          <CardDescription>
            Control who can see your content and interact with you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>Profile Visibility</Label>
            <RadioGroup
              value={settings.profileVisibility}
              onValueChange={(value) =>
                setSettings({
                  ...settings,
                  profileVisibility: value as "PUBLIC" | "FOLLOWERS" | "PRIVATE",
                })
              }
            >
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="PUBLIC" id="public" />
                <Label htmlFor="public" className="flex items-center gap-2 cursor-pointer">
                  <Globe className="h-4 w-4" />
                  <div>
                    <p className="font-medium">Public</p>
                    <p className="text-sm text-muted-foreground">
                      Anyone can see your profile and posts
                    </p>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="FOLLOWERS" id="followers" />
                <Label htmlFor="followers" className="flex items-center gap-2 cursor-pointer">
                  <Users className="h-4 w-4" />
                  <div>
                    <p className="font-medium">Followers Only</p>
                    <p className="text-sm text-muted-foreground">
                      Only your followers can see your posts
                    </p>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="PRIVATE" id="private" />
                <Label htmlFor="private" className="flex items-center gap-2 cursor-pointer">
                  <Lock className="h-4 w-4" />
                  <div>
                    <p className="font-medium">Private</p>
                    <p className="text-sm text-muted-foreground">
                      You must approve followers, only they can see your posts
                    </p>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Eye className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="online-status">Show Online Status</Label>
                <p className="text-sm text-muted-foreground">
                  Let others see when you're active
                </p>
              </div>
            </div>
            <Switch
              id="online-status"
              checked={settings.showOnlineStatus}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, showOnlineStatus: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UserCheck className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="allow-tagging">Allow Tagging</Label>
                <p className="text-sm text-muted-foreground">
                  Others can mention you in posts and comments
                </p>
              </div>
            </div>
            <Switch
              id="allow-tagging"
              checked={settings.allowTagging}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, allowTagging: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Messaging Privacy</CardTitle>
          <CardDescription>
            Control who can send you direct messages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={settings.allowMessagesFrom}
            onValueChange={(value) =>
              setSettings({
                ...settings,
                allowMessagesFrom: value as "EVERYONE" | "FOLLOWERS" | "NO_ONE",
              })
            }
          >
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="EVERYONE" id="msg-everyone" />
              <Label htmlFor="msg-everyone">Everyone</Label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="FOLLOWERS" id="msg-followers" />
              <Label htmlFor="msg-followers">Only people I follow</Label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="NO_ONE" id="msg-no-one" />
              <Label htmlFor="msg-no-one">No one</Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Story Privacy</CardTitle>
          <CardDescription>
            Manage who can see your stories
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label>Hide Story From</Label>
                <p className="text-sm text-muted-foreground">
                  Select people who can't see your stories
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              Manage
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UserCheck className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label>Close Friends</Label>
                <p className="text-sm text-muted-foreground">
                  Share stories with a select group
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              Edit List
            </Button>
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={handleSave}
        disabled={updatePrivacyMutation.isPending}
        className="w-full"
      >
        {updatePrivacyMutation.isPending && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        Save Privacy Settings
      </Button>
    </div>
  );
}