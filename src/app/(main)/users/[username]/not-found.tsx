import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UserX, Home, Search } from "lucide-react";

export default function UserNotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className="rounded-full bg-muted p-6">
            <UserX className="h-16 w-16 text-muted-foreground" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">User not found</h1>
          <p className="text-muted-foreground">
            The user you're looking for doesn't exist or may have been deleted.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/search">
              <Search className="mr-2 h-4 w-4" />
              Search Users
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}