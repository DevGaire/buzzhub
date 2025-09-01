"use client";

import { useSession } from "./SessionProvider";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";

export default function ProfileLink() {
  const { user } = useSession();
  
  return (
    <Button variant="ghost" asChild className="flex items-center justify-start gap-3">
      <Link href="/my-profile">
        <User />
        <span className="hidden lg:inline">Profile</span>
      </Link>
    </Button>
  );
}