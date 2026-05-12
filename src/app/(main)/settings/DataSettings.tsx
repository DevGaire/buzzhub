"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Trash2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import kyInstance from "@/lib/ky";
import { useEffect, useState } from "react";

interface ExportResponse {
  exportedAt: string;
}

export default function DataSettings() {
  const [downloading, setDownloading] = useState(false);
  const [deleteState, setDeleteState] = useState<
    | { kind: "idle" }
    | { kind: "scheduled"; purgesAt: string }
    | { kind: "confirming" }
    | { kind: "busy" }
  >({ kind: "idle" });

  useEffect(() => {
    // Pull current deletion state from /api/me so the card shows the
    // correct primary action without hitting a delete endpoint just to read.
    let cancelled = false;
    kyInstance
      .get("/api/me/status")
      .json<{ deletionRequestedAt: string | null }>()
      .then((r) => {
        if (cancelled) return;
        if (r?.deletionRequestedAt) {
          const requested = new Date(r.deletionRequestedAt);
          const purges = new Date(requested.getTime() + 30 * 24 * 3600_000);
          setDeleteState({ kind: "scheduled", purgesAt: purges.toISOString() });
        }
      })
      .catch(() => {
        // Endpoint may not be deployed yet; treat as idle.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function downloadExport() {
    setDownloading(true);
    try {
      const res = await fetch("/api/me/export");
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Export failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `buzzhub-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ description: "Your data has been downloaded." });
    } catch (e: any) {
      toast({
        variant: "destructive",
        description: e?.message || "Couldn't export your data.",
      });
    } finally {
      setDownloading(false);
    }
  }

  async function scheduleDeletion() {
    setDeleteState({ kind: "busy" });
    try {
      const r = await kyInstance
        .post("/api/me/delete")
        .json<{ purgesAt: string }>();
      toast({
        description: "Account scheduled for deletion. Sign back in to cancel.",
      });
      setDeleteState({ kind: "scheduled", purgesAt: r.purgesAt });
      // Server invalidated the session — bounce to login.
      setTimeout(() => {
        window.location.href = "/login";
      }, 1500);
    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        description: "Couldn't schedule deletion. Try again.",
      });
      setDeleteState({ kind: "confirming" });
    }
  }

  async function cancelDeletion() {
    setDeleteState({ kind: "busy" });
    try {
      await kyInstance.delete("/api/me/delete");
      toast({ description: "Deletion cancelled." });
      setDeleteState({ kind: "idle" });
    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        description: "Couldn't cancel deletion. Try again.",
      });
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Your data</CardTitle>
          <CardDescription>
            Download a JSON copy of everything we hold for your account: profile,
            posts, comments, likes, bookmarks, follow graph and reports you filed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={downloadExport} disabled={downloading}>
            {downloading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {downloading ? "Preparing…" : "Download my data"}
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            Limited to one export per hour.
          </p>
        </CardContent>
      </Card>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Delete account</CardTitle>
          <CardDescription>
            Deleting your account starts a 30-day grace period. After that, all
            your posts, messages, follows and profile info are permanently removed.
            You can change your mind by signing back in during the grace period.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {deleteState.kind === "scheduled" ? (
            <div className="space-y-3 rounded-lg border border-destructive/50 bg-destructive/5 p-3 text-sm">
              <p>
                Your account is scheduled for deletion on{" "}
                <strong>{new Date(deleteState.purgesAt).toLocaleString()}</strong>.
              </p>
              <Button variant="outline" onClick={cancelDeletion}>
                Cancel deletion
              </Button>
            </div>
          ) : deleteState.kind === "confirming" ? (
            <div className="space-y-3">
              <p className="text-sm text-destructive">
                This will sign you out and start the 30-day countdown. Are you sure?
              </p>
              <div className="flex gap-2">
                <Button variant="destructive" onClick={scheduleDeletion}>
                  Yes, schedule deletion
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setDeleteState({ kind: "idle" })}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="destructive"
              onClick={() => setDeleteState({ kind: "confirming" })}
              disabled={deleteState.kind === "busy"}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete my account
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
