import { toast } from "@/components/ui/use-toast";

export interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  backoff?: boolean;
  onRetry?: (attempt: number, error: Error) => void;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { 
    maxAttempts = 3, 
    delayMs = 1000, 
    backoff = true,
    onRetry 
  } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxAttempts) {
        throw lastError;
      }

      onRetry?.(attempt, lastError);

      const delay = backoff ? delayMs * Math.pow(2, attempt - 1) : delayMs;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

export function isNetworkError(error: unknown): boolean {
  if (!error) return false;
  
  const errorString = error.toString().toLowerCase();
  const networkErrorPatterns = [
    'fetch',
    'network',
    'connection',
    'timeout',
    'econnrefused',
    'enotfound',
    'econnreset'
  ];
  
  return networkErrorPatterns.some(pattern => errorString.includes(pattern));
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  
  return 'An unknown error occurred';
}

export function handleError(error: unknown, context?: string) {
  const message = getErrorMessage(error);
  
  console.error(`Error${context ? ` in ${context}` : ''}:`, error);
  
  // Show user-friendly error message
  toast({
    variant: "destructive",
    title: "Error",
    description: isNetworkError(error) 
      ? "Network error. Please check your connection and try again."
      : message || "Something went wrong. Please try again.",
  });
}

export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function createErrorHandler(context: string) {
  return (error: unknown) => handleError(error, context);
}

// Enhanced error boundary logging
export function logError(error: Error, errorInfo?: { componentStack?: string }) {
  console.group('🚨 Application Error');
  console.error('Error:', error);
  console.error('Error Stack:', error.stack);
  
  if (errorInfo?.componentStack) {
    console.error('Component Stack:', errorInfo.componentStack);
  }
  
  console.error('User Agent:', navigator.userAgent);
  console.error('URL:', window.location.href);
  console.error('Timestamp:', new Date().toISOString());
  console.groupEnd();

  // In production, send to error tracking service
  if (process.env.NODE_ENV === 'production') {
    // TODO: Integrate with error tracking service
    // errorTrackingService.captureException(error, {
    //   extra: errorInfo,
    //   tags: { context: 'error-boundary' }
    // });
  }
}