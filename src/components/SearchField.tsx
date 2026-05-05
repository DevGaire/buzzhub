"use client";

import { SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SearchField() {
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const q = (form.q as HTMLInputElement).value.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <form onSubmit={handleSubmit} method="GET" action="/search" className="w-full">
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          name="q"
          placeholder="Search anything..."
          className="w-full rounded-xl border border-input bg-secondary/60 py-2 pl-9 pr-4 text-sm outline-none ring-offset-background transition-colors placeholder:text-muted-foreground focus:border-primary/50 focus:bg-card focus:ring-2 focus:ring-primary/20"
        />
      </div>
    </form>
  );
}
