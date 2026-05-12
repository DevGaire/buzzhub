// Sentry SDK in the browser. If NEXT_PUBLIC_SENTRY_DSN isn't set,
// Sentry.init silently no-ops and nothing is shipped — safe to deploy
// without configuration.

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Trim traces so we don't bury ourselves in events before launch.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  // Session replay is opt-in by setting NEXT_PUBLIC_SENTRY_REPLAY=1
  replaysSessionSampleRate: process.env.NEXT_PUBLIC_SENTRY_REPLAY ? 0.01 : 0,
  replaysOnErrorSampleRate: process.env.NEXT_PUBLIC_SENTRY_REPLAY ? 1.0 : 0,
  environment: process.env.NODE_ENV,
});

// Required for client-side route-transition tracing under App Router.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
