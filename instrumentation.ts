// Next.js instrumentation entry. Called once per runtime at boot;
// Sentry uses this to initialise the SDK in Node and Edge contexts.
// The browser-side init lives in instrumentation-client.ts.

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Re-export Sentry's request-error hook so server errors land in Sentry
// even when they're thrown inside React Server Components / route handlers.
export { captureRequestError as onRequestError } from "@sentry/nextjs";
