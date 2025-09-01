"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import kyInstance from "@/lib/ky";
import { Loader2, Bell, Mail, Heart, MessageCircle, UserPlus, AtSign, CircleDot } from "lucide-react";

interface NotificationPreferences {
  emailLikes: boolean;
  emailComments: boolean;
  emailFollows: boolean;
  emailMentions: boolean;
  emailStories: boolean;
  pushLikes: boolean;
  pushComments: boolean;
  pushFollows: boolean;
  pushMentions: boolean;
  pushStories: boolean;
  pushMessages: boolean;
}

export default function NotificationSettings() {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    emailLikes: true,
    emailComments: true,
    emailFollows: true,
    emailMentions: true,
    emailStories: false,
    pushLikes: true,
    pushComments: true,
    pushFollows: true,
    pushMentions: true,
    pushStories: true,
    pushMessages: true,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["notification-settings"],
    queryFn: () =>
      kyInstance.get("/api/user/notification-settings").json<NotificationPreferences>(),
  });

  useEffect(() => {
    if (data) {
      setPreferences(data);
    }
  }, [data]);

  const updateSettingsMutation = useMutation({
    mutationFn: (settings: NotificationPreferences) =>
      kyInstance.put("/api/user/notification-settings", { json: settings }),
    onSuccess: () => {
      toast({
        description: "Notification settings updated",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        description: "Failed to update settings",
      });
    },
  });

  const handleToggle = (key: keyof NotificationPreferences) => {
    const newPreferences = {
      ...preferences,
      [key]: !preferences[key],
    };
    setPreferences(newPreferences);
  };

  const handleSave = () => {
    updateSettingsMutation.mutate(preferences);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Email Notifications</CardTitle>
          <CardDescription>
            Choose which notifications you want to receive via email
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Heart className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="email-likes">Likes</Label>
                <p className="text-sm text-muted-foreground">
                  When someone likes your posts
                </p>
              </div>
            </div>
            <Switch
              id="email-likes"
              checked={preferences.emailLikes}
              onCheckedChange={() => handleToggle("emailLikes")}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="email-comments">Comments</Label>
                <p className="text-sm text-muted-foreground">
                  When someone comments on your posts
                </p>
              </div>
            </div>
            <Switch
              id="email-comments"
              checked={preferences.emailComments}
              onCheckedChange={() => handleToggle("emailComments")}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UserPlus className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="email-follows">New Followers</Label>
                <p className="text-sm text-muted-foreground">
                  When someone follows you
                </p>
              </div>
            </div>
            <Switch
              id="email-follows"
              checked={preferences.emailFollows}
              onCheckedChange={() => handleToggle("emailFollows")}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AtSign className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="email-mentions">Mentions</Label>
                <p className="text-sm text-muted-foreground">
                  When someone mentions you in a post
                </p>
              </div>
            </div>
            <Switch
              id="email-mentions"
              checked={preferences.emailMentions}
              onCheckedChange={() => handleToggle("emailMentions")}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CircleDot className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="email-stories">Stories</Label>
                <p className="text-sm text-muted-foreground">
                  When someone you follow posts a story
                </p>
              </div>
            </div>
            <Switch
              id="email-stories"
              checked={preferences.emailStories}
              onCheckedChange={() => handleToggle("emailStories")}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Push Notifications</CardTitle>
          <CardDescription>
            Manage push notifications for your browser
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="push-all">Enable Push Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications even when you're not on Buzzhub
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Request notification permission
                if ("Notification" in window) {
                  Notification.requestPermission().then((permission) => {
                    if (permission === "granted") {
                      toast({
                        description: "Push notifications enabled",
                      });
                    }
                  });
                }
              }}
            >
              Enable
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="push-messages">Messages</Label>
                <p className="text-sm text-muted-foreground">
                  New direct messages
                </p>
              </div>
            </div>
            <Switch
              id="push-messages"
              checked={preferences.pushMessages}
              onCheckedChange={() => handleToggle("pushMessages")}
            />
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={handleSave}
        disabled={updateSettingsMutation.isPending}
        className="w-full"
      >
        {updateSettingsMutation.isPending && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        Save Notification Settings
      </Button>
    </div>
  );
}