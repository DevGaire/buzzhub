import { Metadata } from "next";
import DraftsList from "./DraftsList";

export const metadata: Metadata = { title: "Drafts" };

export default function Page() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-card p-5 shadow-sm">
        <h1 className="text-2xl font-bold">Drafts & Scheduled</h1>
        <p className="text-sm text-muted-foreground">
          Posts you saved or scheduled. Scheduled posts publish automatically when their time comes.
        </p>
      </div>
      <DraftsList />
    </div>
  );
}
