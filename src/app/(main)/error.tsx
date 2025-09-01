"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { logError } from "@/lib/error-handling";

interface ErrorPageProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function MainErrorPage({ error, reset }: ErrorPageProps) {
    useEffect(() => {
        // Log the error
        logError(error);
    }, [error]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="max-w-md w-full space-y-6 text-center p-6">
                <div className="flex justify-center">
                    <div className="size-20 bg-destructive/10 rounded-full flex items-center justify-center">
                        <AlertTriangle className="size-10 text-destructive" />
                    </div>
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl font-bold">Oops! Something went wrong</h1>
                    <p className="text-muted-foreground">
                        There was an error loading this page. Please try refreshing or go back to the home feed.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button onClick={reset} className="gap-2">
                        <RefreshCw className="size-4" />
                        Try again
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => window.location.href = "/"}
                        className="gap-2"
                    >
                        <Home className="size-4" />
                        Go to feed
                    </Button>
                </div>
            </div>
        </div>
    );
}