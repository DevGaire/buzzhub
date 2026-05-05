import SearchField from "@/components/SearchField";
import UserButton from "@/components/UserButton";
import Link from "next/link";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-card/95 backdrop-blur-md shadow-sm">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-4 px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-sm">
            <span className="text-primary-foreground font-bold text-[17px] leading-none">B</span>
          </div>
          <span className="hidden font-bold text-xl tracking-tight sm:block">buzzhub</span>
        </Link>

        {/* Search — centered, capped width */}
        <div className="flex-1 max-w-md mx-auto">
          <SearchField />
        </div>

        {/* Right: avatar/dropdown */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <UserButton />
        </div>
      </div>
    </header>
  );
}
