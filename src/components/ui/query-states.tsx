import { UseQueryResult, UseInfiniteQueryResult } from "@tanstack/react-query";
import { LoadingState, EmptyState, NetworkError } from "./loading-states";
import { ComponentErrorBoundary } from "../ErrorBoundary";
import { isNetworkError } from "@/lib/error-handling";
import { RefreshCw, AlertCircle, Wifi } from "lucide-react";
import { Button } from "./button";

interface QueryWrapperProps<T> {
    query: UseQueryResult<T>;
    loadingComponent?: React.ReactNode;
    errorComponent?: React.ReactNode;
    emptyComponent?: React.ReactNode;
    children: (data: T) => React.ReactNode;
    emptyCheck?: (data: T) => boolean;
    loadingMessage?: string;
    errorMessage?: string;
}

export function QueryWrapper<T>({
    query,
    loadingComponent,
    errorComponent,
    emptyComponent,
    children,
    emptyCheck,
    loadingMessage = "Loading...",
    errorMessage
}: QueryWrapperProps<T>) {
    const { data, isLoading, error, refetch, isRefetching } = query;

    if (isLoading) {
        return loadingComponent || <LoadingState message={loadingMessage} />;
    }

    if (error) {
        if (errorComponent) {
            return <>{errorComponent}</>;
        }

        if (isNetworkError(error)) {
            return (
                <NetworkError
                    onRetry={() => refetch()}
                />
            );
        }

        return (
            <div className="flex flex-col items-center justify-center py-8 space-y-4 text-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10">
                    <AlertCircle className="size-8 text-destructive" />
                </div>

                <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Something went wrong</h3>
                    <p className="text-muted-foreground max-w-sm">
                        {errorMessage || "Unable to load data. Please try again."}
                    </p>
                </div>

                <Button
                    onClick={() => refetch()}
                    variant="outline"
                    className="gap-2"
                    disabled={isRefetching}
                >
                    <RefreshCw className={`size-4 ${isRefetching ? 'animate-spin' : ''}`} />
                    Try Again
                </Button>
            </div>
        );
    }

    if (!data || (emptyCheck && emptyCheck(data))) {
        return emptyComponent || (
            <EmptyState
                title="No data available"
                description="There's nothing to show here yet."
            />
        );
    }

    return (
        <ComponentErrorBoundary componentName="Data Display">
            {children(data)}
        </ComponentErrorBoundary>
    );
}

interface InfiniteQueryWrapperProps<T> {
    query: UseInfiniteQueryResult<{ pages: T[]; pageParams: any[] }>;
    loadingComponent?: React.ReactNode;
    errorComponent?: React.ReactNode;
    emptyComponent?: React.ReactNode;
    children: (data: T[], hasNextPage: boolean, fetchNextPage: () => void, isFetchingNextPage: boolean) => React.ReactNode;
    emptyCheck?: (pages: T[]) => boolean;
    loadingMessage?: string;
    errorMessage?: string;
}

export function InfiniteQueryWrapper<T>({
    query,
    loadingComponent,
    errorComponent,
    emptyComponent,
    children,
    emptyCheck,
    loadingMessage = "Loading...",
    errorMessage
}: InfiniteQueryWrapperProps<T>) {
    const {
        data,
        isLoading,
        error,
        refetch,
        hasNextPage,
        fetchNextPage,
        isFetchingNextPage,
        isRefetching
    } = query;

    if (isLoading) {
        return loadingComponent || <LoadingState message={loadingMessage} />;
    }

    if (error) {
        if (errorComponent) {
            return <>{errorComponent}</>;
        }

        if (isNetworkError(error)) {
            return (
                <NetworkError
                    onRetry={() => refetch()}
                />
            );
        }

        return (
            <div className="flex flex-col items-center justify-center py-8 space-y-4 text-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10">
                    <AlertCircle className="size-8 text-destructive" />
                </div>

                <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Something went wrong</h3>
                    <p className="text-muted-foreground max-w-sm">
                        {errorMessage || "Unable to load data. Please try again."}
                    </p>
                </div>

                <Button
                    onClick={() => refetch()}
                    variant="outline"
                    className="gap-2"
                    disabled={isRefetching}
                >
                    <RefreshCw className={`size-4 ${isRefetching ? 'animate-spin' : ''}`} />
                    Try Again
                </Button>
            </div>
        );
    }

    const pages = data?.pages || [];

    if (pages.length === 0 || (emptyCheck && emptyCheck(pages))) {
        return emptyComponent || (
            <EmptyState
                title="No data available"
                description="There's nothing to show here yet."
            />
        );
    }

    return (
        <ComponentErrorBoundary componentName="Infinite Data Display">
            {children(pages, hasNextPage || false, fetchNextPage, isFetchingNextPage)}
        </ComponentErrorBoundary>
    );
}

// Specialized wrappers for common use cases
interface PostsQueryWrapperProps {
    query: UseInfiniteQueryResult<any>;
    children: (posts: any[], hasNextPage: boolean, fetchNextPage: () => void, isFetchingNextPage: boolean) => React.ReactNode;
}

export function PostsQueryWrapper({ query, children }: PostsQueryWrapperProps) {
    return (
        <InfiniteQueryWrapper
            query={query}
            emptyCheck={(pages) => pages.every((page: any) => page.posts?.length === 0)}
            emptyComponent={
                <EmptyState
                    title="No posts yet"
                    description="Be the first to share something!"
                />
            }
            loadingMessage="Loading posts..."
            errorMessage="Failed to load posts."
        >
            {(pages, hasNextPage, fetchNextPage, isFetchingNextPage) => {
                const posts = pages.flatMap((page: any) => page.posts || []);
                return children(posts, hasNextPage, fetchNextPage, isFetchingNextPage);
            }}
        </InfiniteQueryWrapper>
    );
}

interface CommentsQueryWrapperProps {
    query: UseInfiniteQueryResult<any>;
    children: (comments: any[], hasNextPage: boolean, fetchNextPage: () => void, isFetchingNextPage: boolean) => React.ReactNode;
}

export function CommentsQueryWrapper({ query, children }: CommentsQueryWrapperProps) {
    return (
        <InfiniteQueryWrapper
            query={query}
            emptyCheck={(pages) => pages.every((page: any) => page.comments?.length === 0)}
            emptyComponent={
                <EmptyState
                    title="No comments yet"
                    description="Be the first to leave a comment!"
                />
            }
            loadingMessage="Loading comments..."
            errorMessage="Failed to load comments."
        >
            {(pages, hasNextPage, fetchNextPage, isFetchingNextPage) => {
                const comments = pages.flatMap((page: any) => page.comments || []);
                return children(comments, hasNextPage, fetchNextPage, isFetchingNextPage);
            }}
        </InfiniteQueryWrapper>
    );
}