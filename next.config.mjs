import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value:
      "camera=(self), microphone=(self), display-capture=(self), geolocation=(), payment=(), usb=()",
  },
  {
    key: "X-XSS-Protection",
    value: "0",
  },
];

const nextConfig = {
  experimental: {
    staleTimes: {
      dynamic: 30,
    },
    serverComponentsExternalPackages: ["@node-rs/argon2"],
  },
  transpilePackages: ["emoji-mart", "@emoji-mart/data", "@emoji-mart/react"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "utfs.io",
        pathname: `/a/${process.env.NEXT_PUBLIC_UPLOADTHING_APP_ID}/*`,
      },
      {
        protocol: "https",
        hostname: "*.ufs.sh",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "uploadthing.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "utfs.io",
        pathname: "/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

// Wrap with Sentry. Without SENTRY_AUTH_TOKEN, source-map upload is
// skipped silently (build still succeeds). Without a DSN, the runtime
// inits but ships nothing — safe to deploy unconfigured.
export default withSentryConfig(nextConfig, {
  silent: !process.env.SENTRY_AUTH_TOKEN,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Source maps are uploaded only when an auth token is present.
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
  // Use the `release` env so Sentry tags events with the current deploy.
  release: {
    create: !!process.env.SENTRY_AUTH_TOKEN,
    deploy: process.env.SENTRY_AUTH_TOKEN
      ? { env: process.env.NODE_ENV || "production" }
      : undefined,
  },
  // Hide the source-map upload logs in CI unless we asked for noise.
  hideSourceMaps: true,
});
