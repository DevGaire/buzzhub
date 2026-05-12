import { Metadata } from "next";
import DraftsList from "./DraftsList";

export const metadata: Metadata = { title: "Drafts" };

export default function Page() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-card p-5 shadow-sm">
        <h1 className="text-2xl font-bold">Drafts</h1>
        <p className="text-sm text-muted-foreground">
          Posts you saved but haven&apos;t published yet.
        </p>
      </div>
      <DraftsList />
    </div>
  );
}
