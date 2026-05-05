# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**BuzzHub** is a full-featured social media platform (Twitter/X-like) built with Next.js 14 App Router.

## Commands

```bash
npm run dev       # Start development server
npm run build     # Production build (also runs prisma generate via postinstall)
npm run lint      # ESLint
npm start         # Production server

# Database
npx prisma generate          # Regenerate Prisma client after schema changes
npx prisma migrate dev       # Create and apply a new migration
npx prisma migrate deploy    # Apply pending migrations (production)
npx prisma studio            # Visual DB browser
```

No test runner is configured in this project.

## Architecture

### Framework & Routing

Next.js 14 App Router with two route groups:
- `(auth)/` — unauthenticated pages (login, signup, forgot/reset password)
- `(main)/` — authenticated app (feed, messages, notifications, profiles, explore, bookmarks)

Server Components are used by default; client components are marked with `"use client"`. Data fetching uses TanStack Query v5 for client-side and direct Prisma calls in Server Components / Route Handlers.

### Authentication

**Lucia v3** with a `PrismaAdapter` handles session management. The central function is `validateRequest()` in `src/auth.ts` — call this in any Server Component or Route Handler to get `{ user, session }`. Sessions are stored in the `Session` table and sent as cookies.

Two sign-in methods:
1. Email/password — Argon2 password hashing (`@node-rs/argon2`)
2. Google OAuth — Arctic v1 provider, callback at `/api/auth/callback/google`

Password reset and email verification tokens are stored in the `PasswordResetToken` / `EmailVerificationToken` tables with expiry timestamps.

### Database

**Prisma 5 + PostgreSQL (Neon)**. Schema is at `prisma/schema.prisma`. Uses the `fullTextSearch` preview feature for post/user search.

Two connection strings are needed:
- `POSTGRES_PRISMA_URL` — pooled connection used by the Prisma client
- `POSTGRES_URL_NON_POOLING` — direct connection used for migrations

Prisma client singleton is exported from `src/lib/prisma.ts`.

Key relationships:
- `Post` → `Media[]` (IMAGE/VIDEO/AUDIO/GIF), `Like[]`, `Comment[]`, `Bookmark[]`
- `User` → `Follow[]` (follower/following), `Story[]`, `Notification[]`
- `Story` → `StoryMedia[]`, `StoryView[]`; can be grouped into `StoryHighlight`
- `Bookmark` → optionally belongs to a `BookmarkCollection`

### Real-time Messaging & Video Calls

**Stream Chat SDK** (`stream-chat` + `stream-chat-react`) for messaging. **Stream Video SDK** (`@stream-io/video-react-sdk`) for video/audio calls. Both share the same JWT token from `/api/get-token`.

Chat: server client in `src/lib/stream.ts`, UI in `src/app/(main)/messages/`. CSS overrides: `src/app/stream-chat-overrides.css`.

Video/Audio calls:
- `useInitializeVideoClient.ts` — initialises `StreamVideoClient` (runs alongside chat client)
- `CallContext.tsx` — `<CallProvider>` exposes `startCall(userId, { videoEnabled })` to all children
- `ActiveCallModal.tsx` — floating call window (outgoing ring, active call, audio-only mode, minimize pill)
- `IncomingCallHandler.tsx` — listens via `useCalls()` for incoming rings, shows accept/decline banner
- `Chat.tsx` wraps everything: `<StreamVideo> → <CallProvider> → <StreamChat>`

Calling buttons in `ModernChannelHeader` (ChatChannel.tsx) are wired to `useCallContext().startCall`. Calls are only enabled in 1:1 channels. CSS overrides for the video SDK: `src/app/stream-video-overrides.css`.

### File Uploads

**UploadThing** handles all media. File routers are defined in `src/app/api/uploadthing/core.ts`. The `NEXT_PUBLIC_UPLOADTHING_APP_ID` env var must be set on the client. A daily Vercel cron at `/api/clear-uploads` cleans orphaned uploads.

### Email

Nodemailer with Brevo SMTP. Email sending logic lives in `src/lib/email.ts`. See `SMTP_SETUP.md` for Brevo-specific configuration.

### Key Libraries & Where They're Used

| Library | Location |
|---|---|
| TanStack Query v5 | `ReactQueryProvider.tsx`, all client data hooks |
| Zod validation | `src/lib/validation.ts` — shared schemas |
| TipTap editor | Post composer (`src/components/composer/`) |
| shadcn/ui + Radix | `src/components/ui/` |
| react-hook-form | Auth forms and post composer |
| date-fns | Timestamp formatting throughout |
| ky | HTTP client wrapper in `src/lib/ky.ts` |

### API Routes

All REST endpoints are under `src/app/api/`. Auth-protected routes call `validateRequest()` and return 401 if unauthenticated. Cron/webhook endpoints validate against `CORN_SECRET`.

### Environment Variables

Required in `.env`:

```
POSTGRES_PRISMA_URL          # Pooled DB (Prisma client)
POSTGRES_URL_NON_POOLING     # Direct DB (migrations)
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
UPLOADTHING_SECRET
NEXT_PUBLIC_UPLOADTHING_APP_ID
NEXT_PUBLIC_STREAM_KEY
STREAM_SECRET
CORN_SECRET                  # Cron/webhook auth secret
NEXT_PUBLIC_BASE_URL         # e.g. http://localhost:3000
SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / MAIL_FROM
```

### Path Alias

`@/*` maps to `./src/*` (configured in `tsconfig.json`).
