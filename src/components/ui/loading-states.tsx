import { Loader2, AlertCircle, Wifi, WifiOff } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
    size?: "sm" | "md" | "lg";
    className?: string;
}

export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
    const sizeClasses = {
        sm: "size-4",
        md: "size-6",
        lg: "size-8"
    };

    return (
        <Loader2
            className={cn(
                "animate-spin text-muted-foreground",
                sizeClasses[size],
                className
            )}
        />
    );
}

interface LoadingSkeletonProps {
    className?: string;
    lines?: number;
}

export function LoadingSkeleton({ className, lines = 3 }: LoadingSkeletonProps) {
    return (
        <div className={cn("space-y-3", className)}>
            {Array.from({ length: lines }).map((_, i) => (
                <div key={i} className="space-y-2">
                    <div className="h-4 bg-muted rounded animate-pulse" />
                    {i === 0 && <div className="h-4 bg-muted rounded animate-pulse w-3/4" />}
                </div>
            ))}
        </div>
    );
}

interface LoadingCardProps {
    className?: string;
}

export function LoadingCard({ className }: LoadingCardProps) {
    return (
        <div className={cn("rounded-lg border bg-card p-4 space-y-3", className)}>
            <div className="flex items-center space-x-3">
                <div className="size-10 bg-muted rounded-full animate-pulse" />
                <div className="space-y-2 flex-1">
                    <div className="h-4 bg-muted rounded animate-pulse w-1/3" />
                    <div className="h-3 bg-muted rounded animate-pulse w-1/4" />
                </div>
            </div>
            <div className="space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-4 bg-muted rounded animate-pulse w-4/5" />
            </div>
        </div>
    );
}

interface LoadingPostProps {
    className?: string;
}

export function LoadingPost({ className }: LoadingPostProps) {
    return (
        <div className={cn("space-y-4 rounded-lg bg-card p-4", className)}>
            {/* User info */}
            <div className="flex items-center space-x-3">
                <div className="size-10 bg-muted rounded-full animate-pulse" />
                <div className="space-y-2">
                    <div className="h-4 bg-muted rounded animate-pulse w-24" />
                    <div className="h-3 bg-muted rounded animate-pulse w-16" />
                </div>
            </div>

            {/* Content */}
            <div className="space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
            </div>

            {/* Image placeholder */}
            <div className="h-64 bg-muted rounded-lg animate-pulse" />

            {/* Actions */}
            <div className="flex items-center justify-between">
                <div className="flex space-x-4">
                    <div className="h-8 w-16 bg-muted rounded animate-pulse" />
                    <div className="h-8 w-20 bg-muted rounded animate-pulse" />
                </div>
                <div className="h-8 w-8 bg-muted rounded animate-pulse" />
            </div>
        </div>
    );
}

interface LoadingStateProps {
    message?: string;
    className?: string;
}

export function LoadingState({ message = "Loading...", className }: LoadingStateProps) {
    return (
        <div className={cn("flex flex-col items-center justify-center py-8 space-y-3", className)}>
            <LoadingSpinner size="lg" />
            <p className="text-muted-foreground text-sm">{message}</p>
        </div>
    );
}

interface EmptyStateProps {
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    icon?: React.ReactNode;
    className?: string;
}

export function EmptyState({
    title,
    description,
    action,
    icon,
    className
}: EmptyStateProps) {
    return (
        <div className={cn("flex flex-col items-center justify-center py-12 space-y-4 text-center", className)}>
            <div className="flex size-16 items-center justify-center rounded-full bg-muted/50">
                {icon || <AlertCircle className="size-8 text-muted-foreground" />}
            </div>

            <div className="space-y-2">
                <h3 className="text-lg font-semibold">{title}</h3>
                {description && (
                    <p className="text-muted-foreground max-w-sm">{description}</p>
                )}
            </div>

            {action && (
                <Button onClick={action.onClick} variant="outline">
                    {action.label}
                </Button>
            )}
        </div>
    );
}

interface NetworkErrorProps {
    onRetry?: () => void;
    className?: string;
}

export function NetworkError({ onRetry, className }: NetworkErrorProps) {
    return (
        <div className={cn("flex flex-col items-center justify-center py-8 space-y-4 text-center", className)}>
            <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10">
                <WifiOff className="size-8 text-destructive" />
            </div>

            <div className="space-y-2">
                <h3 className="text-lg font-semibold">Connection Error</h3>
                <p className="text-muted-foreground max-w-sm">
                    Unable to connect to the server. Please check your internet connection.
                </p>
            </div>

            {onRetry && (
                <Button onClick={onRetry} variant="outline" className="gap-2">
                    <Wifi className="size-4" />
                    Try Again
                </Button>
            )}
        </div>
    );
}

interface FullPageLoadingProps {
    message?: string;
}

export function FullPageLoading({ message = "Loading..." }: FullPageLoadingProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col items-center space-y-4">
                <LoadingSpinner size="lg" />
                <p className="text-muted-foreground">{message}</p>
            </div>
        </div>
    );
}