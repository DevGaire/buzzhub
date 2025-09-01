"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { ErrorBoundary as ReactErrorBoundary } from "react-error-boundary";
import { logError } from "@/lib/error-handling";

interface ErrorFallbackProps {
    error: Error;
    resetErrorBoundary: () => void;
}

function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
    return (
        <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4 rounded-lg border border-destructive/20 bg-destructive/5 p-8 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="size-8 text-destructive" />
            </div>

            <div className="space-y-2">
                <h2 className="text-lg font-semibold text-foreground">
                    Something went wrong
                </h2>
                <p className="text-sm text-muted-foreground max-w-md">
                    An unexpected error occurred. This has been logged and our team has been notified.
                </p>

                {process.env.NODE_ENV === "development" && (
                    <details className="mt-4 max-w-md text-left">
                        <summary className="cursor-pointer text-sm font-medium">
                            Error details (dev only)
                        </summary>
                        <pre className="mt-2 overflow-auto rounded bg-muted p-2 text-xs">
                            {error.message}
                            {"\n"}
                            {error.stack}
                        </pre>
                    </details>
                )}
            </div>

            <div className="flex gap-2">
                <Button onClick={resetErrorBoundary} className="gap-2">
                    <RefreshCw className="size-4" />
                    Try again
                </Button>
                <Button
                    variant="outline"
                    onClick={() => window.location.href = "/"}
                >
                    Go home
                </Button>
            </div>
        </div>
    );
}

interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ComponentType<ErrorFallbackProps>;
    onError?: (error: Error, errorInfo?: { componentStack?: string }) => void;
}

export default function ErrorBoundary({
    children,
    fallback = ErrorFallback,
    onError
}: ErrorBoundaryProps) {
    return (
        <ReactErrorBoundary
            FallbackComponent={fallback}
            onError={(error, errorInfo) => {
                logError(error, { componentStack: errorInfo.componentStack || undefined });
                onError?.(error, { componentStack: errorInfo.componentStack || undefined });
            }}
            onReset={() => {
                // Clear any cached state that might have caused the error
                window.location.reload();
            }}
        >
            {children}
        </ReactErrorBoundary>
    );
}

// Smaller error boundary for specific components
export function ComponentErrorBoundary({
    children,
    componentName = "Component"
}: {
    children: React.ReactNode;
    componentName?: string;
}) {
    return (
        <ErrorBoundary
            fallback={({ error, resetErrorBoundary }) => (
                <div className="flex items-center justify-center p-4 rounded-lg border border-destructive/20 bg-destructive/5">
                    <div className="text-center space-y-2">
                        <AlertTriangle className="size-5 text-destructive mx-auto" />
                        <p className="text-sm text-muted-foreground">
                            {componentName} failed to load
                        </p>
                        <Button size="sm" variant="outline" onClick={resetErrorBoundary}>
                            Retry
                        </Button>
                    </div>
                </div>
            )}
        >
            {children}
        </ErrorBoundary>
    );
}