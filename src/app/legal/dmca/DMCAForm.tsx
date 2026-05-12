"use client";

import LoadingButton from "@/components/LoadingButton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import kyInstance from "@/lib/ky";
import { useState } from "react";

const TARGET_TYPES = [
  { value: "POST", label: "A post" },
  { value: "COMMENT", label: "A comment" },
  { value: "USER", label: "A user's profile" },
] as const;

type TargetType = (typeof TARGET_TYPES)[number]["value"];

export default function DMCAForm() {
  const { toast } = useToast();
  const [targetType, setTargetType] = useState<TargetType>("POST");
  const [targetId, setTargetId] = useState("");
  const [originalWork, setOriginalWork] = useState("");
  const [details, setDetails] = useState("");
  const [signature, setSignature] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!targetId.trim() || !originalWork.trim() || !signature.trim() || !agreed) return;
    setBusy(true);
    try {
      // Reuse the standard report flow with a [DMCA] prefix so the admin
      // queue surfaces them prominently. The Report.reason field is plain
      // text, so we pack the structured fields into a small block.
      const reason = [
        `[DMCA]`,
        `Original work: ${originalWork.trim()}`,
        details.trim() ? `Details: ${details.trim()}` : null,
        `Signed: ${signature.trim()}`,
      ]
        .filter(Boolean)
        .join("\n");
      await kyInstance.post("/api/report", {
        json: { targetType, targetId: targetId.trim(), reason },
      });
      setDone(true);
      toast({ description: "Takedown notice received." });
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        description: "Couldn't submit the notice. Try again or email us.",
      });
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border bg-card p-5 text-sm">
        <p className="font-medium">Notice received.</p>
        <p className="mt-1 text-muted-foreground">
          We&apos;ll review it within a few business days and contact you if we need
          more information.
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-3"
          onClick={() => {
            setDone(false);
            setTargetId("");
            setOriginalWork("");
            setDetails("");
            setSignature("");
            setAgreed(false);
          }}
        >
          Submit another
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-2xl border bg-card p-5 text-sm"
    >
      <div>
        <label className="mb-1 block font-medium">What is the infringing content?</label>
        <select
          value={targetType}
          onChange={(e) => setTargetType(e.target.value as TargetType)}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        >
          {TARGET_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block font-medium">
          {targetType === "USER" ? "Username or profile URL" : "Post or comment ID / URL"}
        </label>
        <input
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          placeholder={targetType === "POST" ? "e.g. cluxxx... or /posts/cluxxx..." : ""}
          required
        />
      </div>
      <div>
        <label className="mb-1 block font-medium">Description of the original copyrighted work</label>
        <textarea
          value={originalWork}
          onChange={(e) => setOriginalWork(e.target.value)}
          rows={3}
          className="w-full resize-y rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="e.g. The photograph at https://… taken on YYYY-MM-DD"
          required
        />
      </div>
      <div>
        <label className="mb-1 block font-medium">Additional details (optional)</label>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={3}
          className="w-full resize-y rounded-md border bg-background px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block font-medium">Electronic signature (full legal name)</label>
        <input
          value={signature}
          onChange={(e) => setSignature(e.target.value)}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          required
        />
      </div>
      <label className="flex items-start gap-2 text-xs">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          I have a good-faith belief that the use of the material described above is
          not authorised by the copyright owner, its agent, or the law, and the
          information in this notice is accurate. I understand that knowingly false
          notices may result in liability.
        </span>
      </label>
      <LoadingButton
        type="submit"
        loading={busy}
        disabled={
          !targetId.trim() ||
          !originalWork.trim() ||
          !signature.trim() ||
          !agreed
        }
      >
        Submit notice
      </LoadingButton>
    </form>
  );
}
