"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import UserAvatar from "@/components/UserAvatar";
import { Search, UserX } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface BlockedUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  blockedAt: Date;
}

export default function BlockedUsers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [blockedUsers] = useState<BlockedUser[]>([
    // Mock data - would be fetched from API
  ]);

  const handleUnblock = (userId: string) => {
    toast({
      description: "User unblocked successfully",
    });
  };

  const filteredUsers = blockedUsers.filter(
    (user) =>
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Blocked Users</CardTitle>
          <CardDescription>
            People you've blocked can't see your posts or send you messages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search blocked users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <UserX className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                {searchQuery
                  ? "No blocked users found"
                  : "You haven't blocked anyone"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <UserAvatar avatarUrl={user.avatarUrl} size={40} />
                    <div>
                      <p className="font-medium">{user.displayName}</p>
                      <p className="text-sm text-muted-foreground">
                        @{user.username}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUnblock(user.id)}
                  >
                    Unblock
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Muted Words</CardTitle>
          <CardDescription>
            Hide posts and notifications containing specific words
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input placeholder="Add a word or phrase to mute" />
            <Button>Add</Button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {/* Muted words would be displayed as chips here */}
            <div className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm">
              <span>example</span>
              <button className="ml-1 text-muted-foreground hover:text-foreground">
                ×
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}