"use client";

import { QueryClient, QueryClientProvider, DefaultOptions } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";
import { toast } from "@/components/ui/use-toast";
import { isNetworkError, withRetry } from "@/lib/error-handling";

// Enhanced default options with error handling and retry logic
const queryConfig: DefaultOptions = {
  queries: {
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors (client errors)
      if (error && typeof error === 'object' && 'status' in error) {
        const status = error.status as number;
        if (status >= 400 && status < 500) {
          return false;
        }
      }

      // Retry network errors up to 3 times
      if (isNetworkError(error)) {
        return failureCount < 3;
      }

      // Default retry logic for other errors
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  },
  mutations: {
    retry: (failureCount, error) => {
      // Only retry network errors for mutations
      if (isNetworkError(error)) {
        return failureCount < 2;
      }
      return false;
    },
    onError: (error) => {
      console.error('Mutation error:', error);

      // Show user-friendly error toast
      const message = isNetworkError(error)
        ? "Network error. Please check your connection and try again."
        : "Something went wrong. Please try again.";

      toast({
        variant: "destructive",
        title: "Error",
        description: message,
      });
    },
  },
};

export default function ReactQueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: queryConfig,
  }));

  return (
    <QueryClientProvider client={client}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
