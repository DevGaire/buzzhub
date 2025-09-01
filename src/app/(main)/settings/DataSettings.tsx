"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Trash2, Archive, FileText, Database, HardDrive } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { Progress } from "@/components/ui/progress";

export default function DataSettings() {
  const handleDownloadData = () => {
    toast({
      description: "Your data download will be ready in 24 hours",
    });
  };

  const handleClearCache = () => {
    toast({
      description: "Cache cleared successfully",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Your Data</CardTitle>
          <CardDescription>
            Download a copy of your Buzzhub data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              You can request a download of your data at any time. This includes your posts,
              messages, profile information, and more.
            </p>
            
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium">Posts & Comments</p>
                  <p className="text-sm text-muted-foreground">All your content</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <Archive className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium">Media Files</p>
                  <p className="text-sm text-muted-foreground">Photos & videos</p>
                </div>
              </div>
            </div>
            
            <Button onClick={handleDownloadData} className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Request Data Download
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Storage Usage</CardTitle>
          <CardDescription>
            Manage your storage and cached data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>Total Storage Used</span>
              <span className="font-medium">2.4 GB / 5 GB</span>
            </div>
            <Progress value={48} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Posts & Media</p>
                  <p className="text-sm text-muted-foreground">1.8 GB</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <HardDrive className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Cached Data</p>
                  <p className="text-sm text-muted-foreground">600 MB</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleClearCache}>
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Delete All Data</CardTitle>
          <CardDescription>
            Permanently delete all your data from Buzzhub
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            This will delete all your posts, messages, and media files. This action cannot be undone.
          </p>
          <Button variant="destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete All Data
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}