import Link from "next/link";

export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="text-5xl">📡</div>
      <h1 className="text-xl font-bold">You&apos;re offline</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        BuzzHub needs an internet connection. Once you&apos;re back online, head to the feed and pull to refresh.
      </p>
      <Link
        href="/"
        className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Try again
      </Link>
    </main>
  );
}
