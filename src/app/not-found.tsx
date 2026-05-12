import Link from "next/link";

// Root-level not-found: rendered when a request lands outside the (main)
// route group (legal pages, login/signup, raw 404s). Kept intentionally
// dependency-free so it works even when there's no session provider.
export default function RootNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="text-6xl">🧭</div>
      <h1 className="text-2xl font-bold">404 — Nothing here</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        The page you&apos;re looking for has wandered off.
      </p>
      <Link
        href="/"
        className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Go home
      </Link>
    </main>
  );
}
