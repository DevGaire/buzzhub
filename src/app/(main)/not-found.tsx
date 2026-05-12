import Link from "next/link";
import { Compass, Home } from "lucide-react";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl bg-card p-10 text-center shadow-sm">
      <div className="text-6xl">🧭</div>
      <h1 className="text-2xl font-bold">404 — Nothing here</h1>
      <p className="text-sm text-muted-foreground">
        The page you&apos;re looking for has wandered off. It might have been deleted, renamed, or never existed.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          <Home className="size-4" />
          Back to feed
        </Link>
        <Link
          href="/explore"
          className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm"
        >
          <Compass className="size-4" />
          Explore
        </Link>
      </div>
    </main>
  );
}
