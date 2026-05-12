# BuzzHub Roadmap

Single source of truth. Tick boxes as work lands. Phases are ordered: each one assumes the previous is done, but inside a phase items can be done in any order. The last phase is full production deployment.

**How to resume after a context reset:** read this file top-to-bottom, find the first unchecked `[ ]` item, continue from there. Update the "Current focus" line below before you stop.

> **Current focus:** Phase 10 — repo-side launch prep is done. What's left is the operator checklist in Phase 10 below: Vercel project, env vars (`npm run preflight` to audit them locally first), `prisma migrate deploy`, custom domain, deliverability records, Stripe live mode swap, Google OAuth prod callback, uptime monitor, backup verification, smoke pass (`npm run smoke -- <domain>`), soft launch.
> **Last commit:** `86f833cd0` — Phase 10 polish (cron-secret env normalisation, all six Vercel crons wired, preflight env-check script, `.env.example` filled out).

---

## Phase 0 — Hygiene & guardrails

Clean up before piling on features. Small wins, low risk.

- [x] Remove `console.log` debug noise from `src/components/posts/Post.tsx` (MediaPreviews/MediaPreview).
- [x] Delete the `nul` file at repo root (Windows artifact).
- [x] Add `.claude/` to `.gitignore` (currently untracked, easy to commit by accident).
- [x] Remove the `username === "admin"` debug fallback in `src/app/(main)/users/[username]/page.tsx` (now that we have real admin role).
- [ ] Add a test runner: pick Vitest, wire `npm test`, port one happy-path test (e.g. `validateRequest` mock + a server action).
- [x] Sentry is now wired (was a dep but not initialised): `instrumentation.ts` for server/edge runtimes, `instrumentation-client.ts` for the browser (with `onRouterTransitionStart` export for App Router route-tracing), and `next.config.mjs` wrapped with `withSentryConfig`. All Sentry env vars (`SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_AUTH_TOKEN` / `SENTRY_ORG` / `SENTRY_PROJECT`) are optional — without a DSN the SDK no-ops and the build still succeeds. Source-map upload activates when `SENTRY_AUTH_TOKEN` is present. To verify in production, set the DSN, deploy, then trigger an intentional error from `/api/health?fail=1` (TODO if you want a dedicated test route — for now, manually throw in any route handler).
- [x] Audit env vars: write a `src/lib/env.ts` that fails fast at boot if any required var is missing.
- [x] Add `/api/health` route (db ping for uptime checks).

## Phase 1 — Monetization (Stripe)

Make the £5/month verification button real.

- [x] Add Stripe SDK (`stripe`).
- [x] Schema: add `Subscription` model (id, userId, stripeCustomerId, stripeSubscriptionId, status, currentPeriodEnd, plan, createdAt).
- [x] Migration for the new model.
- [x] Env vars: `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID_VERIFIED`, `STRIPE_WEBHOOK_SECRET` all set. Stripe CLI installed via winget; secret retrieved with `stripe listen --print-secret --api-key …`.
- [x] `POST /api/billing/checkout` — creates a Stripe Checkout Session, returns the URL.
- [x] Wire `GetVerifiedClient.tsx` Subscribe button to that endpoint.
- [x] `POST /api/billing/webhook` — handles `customer.subscription.created/updated/deleted`. On active → set `isVerified=true`. On canceled/past_due → set `isVerified=false` only if `verificationSource=PAID`.
- [x] Track grant source: `verificationSource` enum (`PAID`, `ADMIN`, `OFFICIAL`) — admin grants set `ADMIN`, webhook sets `PAID`, `@buzzhub` is `OFFICIAL`.
- [x] Billing portal link in `/settings` → `POST /api/billing/portal` returning a Stripe Customer Portal URL.
- [x] `GET /api/billing/me` — current user's subscription + verification status, used by Settings.
- [ ] Receipt email via Brevo on successful charge (Stripe sends its own; decide if we duplicate).
- [ ] Smoke test: with `stripe listen --forward-to localhost:3000/api/billing/webhook` running, complete a Checkout flow with card 4242 4242 4242 4242 and confirm the badge flips on.

## Phase 2 — Trust & safety

Reports already have a model but no admin UI; add it.

- [x] Admin dashboard at `/admin` (gated by `isAdmin`) — list of OPEN reports with reporter, target, and reason.
- [x] Resolve / reject report actions (POST `/api/admin/reports/[id]` with `{action:"RESOLVE"|"REJECT"}`). Resolving a POST report soft-deletes the post; resolving a COMMENT report deletes the comment.
- [x] User suspension: `suspendedAt` + `suspendedReason` on User; `POST /api/admin/users/[userId]/suspend` toggles. Suspended users can't post or comment (server actions + comment route both reject).
- [x] Soft-delete posts: `deletedAt` on Post; `visiblePostFilter` helper in `src/lib/moderation.ts` applied to all feed queries (for-you, following, profile, bookmarked, search, hashtag, explore, digests).
- [x] Mass-action: bulk hide all posts by a reported user (`POST /api/admin/users/[id]/hide-posts`, "Hide all posts" button on each report).
- [x] Rate limit comments and posts via in-memory bucket (`src/lib/rate-limit.ts`) — 10 posts/min, 30 comments/min per user. Swap for `@upstash/ratelimit` once `UPSTASH_REDIS_REST_URL` is set in env.
- [ ] 2FA via TOTP for admin accounts (lucky we already have email verification scaffolding).
- [x] Admin link in sidebar (visible only when `isAdmin`).

## Phase 3 — Notifications & engagement loop

Convert lurkers into return visitors.

- [x] Web Push notifications: `public/sw.js` service worker, VAPID keys generated by `scripts/setup-vapid.mjs`, opt-in component on `/notifications`.
- [x] Schema: `PushSubscription` model + migration.
- [x] Send push on like / follow / comment / reply (server-side fan-out via `pushToUser` in `src/lib/push.ts`; stale subs auto-pruned on 404/410).
- [x] Send push on mention (post composer) + DM (Stream webhook fans out to recipient via `pushToUser` since Stream user IDs match app IDs).
- [x] Email digest cron at `/api/digests/send` — code path verified to compile, includes new `deletedAt` + `suspendedAt` filters; manual sending verification still on the operator.
- [ ] In-app live notifications via Stream Chat events or pusher (already have Stream) — deferred; existing notification button polling covers the basics.
- [x] "Mark all read" — already shipped: opening `/notifications` calls `PATCH /api/notifications/mark-as-read` automatically (`Notifications.tsx:51`).

## Phase 4 — Discovery & feed quality

- [x] For-You ranking: likes×1 + comments×2 + bookmarks×3 + follow boost×10 / friends-of-friends×4 + recency decay over 72h, with a per-author cap of 2 in the top page for diversity.
- [x] Trending hashtags: `TrendingTag` table + `GET /api/trending/refresh` cron (CORN_SECRET-gated, 24h window). Explore reads cached rows, falls back to live aggregation.
- [x] `/explore` page now reads from `trending_tags` first.
- [x] Search relevance: `/api/search?sort=top` now uses raw SQL with `websearch_to_tsquery` + `ts_rank_cd` over a setweight tsvector (`username='A'`, `displayName='B'`, `content='C'`), plus a log-scaled like/comment/bookmark boost and a 72h-style linear recency penalty. `sort=new` keeps chronological cursor; `sort=top` uses page-offset cursor. Search page tabs fixed to pass `sort` as a real param (was previously concatenated into `q`).
- [x] User recommendations: `GET /api/users/suggestions` — friends-of-friends ranked by overlap, with popular-user backfill, all blocked / followed / suspended IDs filtered out.

## Phase 5 — Creator tooling

- [x] Drafts: `Post.status` enum (`DRAFT` / `PUBLISHED`, default `PUBLISHED`) + index on `(userId, status)`. `/drafts` page lists, edits inline, deletes, or publishes. Composer has a "Save as draft" button next to Post; drafts skip rate-limit and mention notifications. On publish, `createdAt` is refreshed and mention notifications fire. `visiblePostFilter` excludes drafts; `/posts/[id]` page + GET API return 404 to non-authors; following / digests queries also filter `status: PUBLISHED`. Migration: `prisma/migrations/20260512000000_add_post_drafts`.
- [x] Scheduled posts: `Post.scheduledFor` + `SCHEDULED` enum value. Composer has a "Schedule" toggle with `datetime-local` picker; `/drafts` page lists drafts and scheduled together, with Reschedule / Move-to-drafts / Publish-now controls. Cron at `GET /api/posts/publish-scheduled` (CORN_SECRET-gated, batch of 100) flips due scheduled posts to PUBLISHED, refreshes `createdAt`, and fires mention notifications. Skips authors who were suspended after scheduling. Trending refresh also now filters to `status='PUBLISHED'`. Migration `prisma/migrations/20260512100000_add_scheduled_posts` adds the enum value, column, and `(status, scheduledFor)` index. Vercel cron entry added (`* * * * *`); operator must also set `CORN_SECRET` in env so Vercel's Bearer token matches.
- [x] Multi-image carousels: new `<MediaCarousel />` (no new deps — CSS scroll-snap + IntersectionObserver-free active-index tracking via scrollLeft). One slide visible at a time on multi-attachment posts; prev/next chevrons, dot indicators, "n / N" counter, keyboard arrows, touch swipe (native), lazy preload (`loading="lazy"` / `preload="none"` for off-screen). Single-attachment posts skip the carousel chrome. Replaced the old grid-style `MediaPreviews` in `Post.tsx`.
- [x] Analytics dashboard at `/analytics`: `PostImpression` model (postId, viewerId?, createdAt) + `(postId, createdAt)` index. `Follow.createdAt` added so we can chart follower growth. Client `<Post>` fires a once-per-page-view beacon to `POST /api/posts/[postId]/impression` via IntersectionObserver (≥50% visible for ≥700ms; author self-views skipped; rate-limited 240/min/user). Page shows: 6 summary cards (posts, followers, impressions, likes, comments, bookmarks received), two 30-day sparklines (new followers / impressions per day) drawn as inline SVG (no chart deps), and a Top 5 posts list ranked by impressions in the last 30 days. Migration `prisma/migrations/20260512200000_add_analytics`.
- [ ] Live streaming via Stream Video (SDK already integrated for calls).

## Phase 6 — Performance & scale

- [ ] Audit images: enforce `next/image` everywhere with explicit width/height; add `placeholder="blur"` where feasible.
- [x] Add Redis caching for hot reads: trending tags, suggested users, user-by-username lookups. New `src/lib/cache.ts` wraps `@upstash/redis` (already installed) — `cached<T>(key, ttl, loader)` cache-aside, plus `cacheGet/Set/Del`. If `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` aren't set, every op is a no-op so the app keeps working. Trending tags cached 60s and invalidated by `/api/trending/refresh`; suggestions cache the *candidate ID list* per user for 60s while user-card hydration still happens fresh so newly-followed accounts disappear immediately. Env schema updated to treat both Upstash vars as optional. User-by-username cache key is staged in `cacheKeys` but not yet wired (low-priority, profile pages aren't a hot-spot yet).
- [x] N+1 audit on `/api/posts/for-you`: the three follow/block lookups are now parallel (Promise.all → 1 round-trip instead of 3). No real N+1 — the route uses Prisma `include` once and operates on the resulting array in JS.
- [ ] Add DB indexes for any sequential scans seen in `EXPLAIN ANALYZE` of feed queries.
- [ ] Lighthouse pass: target ≥ 90 on Performance, Accessibility, Best Practices, SEO.
- [ ] Bundle analyzer (`@next/bundle-analyzer`) — find and split anything over 200kB.

## Phase 7 — Mobile / PWA

- [x] Web manifest + icons: `public/manifest.webmanifest` with standalone display, theme/background colors, app shortcuts (New post / Notifications / Drafts). SVG `icon.svg` (any) and `icon-maskable.svg` (with safe-zone inset) cover all modern PWA installers. `viewport.themeColor` set in root layout.
- [x] Service worker for offline shell + cached avatars: `public/sw.js` upgraded — app-shell cache (`/offline`, manifest, icons), stale-while-revalidate for upload-CDN media (utfs.io + *.ufs.sh), HTML navigations are network-first with `/offline` fallback, API/auth paths bypass the SW entirely (never cached, so no per-user data leaks). Versioned cache keys so the SW cleans up old buckets on activation. SW is registered universally by a new `<PWAInit />` at the root (used to only register on push opt-in).
- [x] Install prompt component: `<InstallPWA />` captures `beforeinstallprompt` via PWAInit, then shows a dismissable bottom-right card. Hidden if already running standalone, hidden for 14 days after dismissal (localStorage).
- [x] Camera capture for stories on mobile: `StoryCreateModal` gains two extra buttons next to Choose Files — Take photo (`<input type="file" accept="image/*" capture="environment">`) and Record video (`accept="video/*"`). The native `capture` attribute triggers the OS camera UI on mobile. Files flow through the same `startUpload` pipeline as gallery picks, so no Stream/permission state machine is needed. Buttons are gated to coarse-pointer devices (`matchMedia("(pointer: coarse)")`) so desktop UX stays clean.
- [x] Pull-to-refresh on the feed: new `<PullToRefresh />` (no deps) — only arms when the page is at scroll-top, gated to coarse-pointer devices, rubber-band resistance, 70px threshold, sticky indicator while the caller's refresh promise resolves. Wired into both For-You and Following feeds (`queryClient.resetQueries(['post-feed', …])`).
- [x] Bottom sheet for comments (mobile): new `<CommentsSheet />` built directly on Radix Dialog — slides up from the bottom, 85vh max, grab handle, safe-area-inset padding. `Post.tsx` renders inline comments on `lg:` and up, sheet below — same `showComments` state drives both.

## Phase 8 — Compliance & legal

- [x] `/terms` and `/privacy` pages: hand-written at `src/app/legal/{terms,privacy}/page.tsx`. Statically rendered; covers acceptable use, paid features, deletion grace, data collection, retention, GDPR rights, third-party processors. Signup checkbox links to both.
- [x] Cookie consent banner — N/A. We only set the auth session cookie; no analytics shipped, no consent needed. (Add this back if Phase 10 introduces analytics.) The privacy page documents the single session cookie explicitly.
- [x] GDPR data export endpoint: `GET /api/me/export` returns a downloadable JSON dump (profile, posts, comments, likes, bookmarks, follows, followers, reports) with `Content-Disposition: attachment`. Rate-limited to 1/hour/user. Settings → Data triggers the download client-side.
- [x] Account deletion with 30-day grace: `User.deletionRequestedAt` (migration `20260512300000_add_account_deletion`). `POST /api/me/delete` schedules + invalidates session, `DELETE /api/me/delete` cancels, `GET /api/me/status` reads current state for the Settings UI. Cron at `GET /api/users/purge-deleted` (CORN_SECRET-gated, batch of 50, skips admins) hard-deletes users whose grace expired — cascading deletes on User clean up posts/comments/follows/sessions. Vercel cron entry at `30 3 * * *`. Settings → Data card shows scheduled state with a Cancel button.
- [x] Age gate on signup (≥ 13): `signUpSchema` now requires `ageConfirmed: z.literal(true)`. Signup form renders a checkbox with linked Terms + Privacy. Server action re-parses through the same schema so the check can't be bypassed.
- [x] DMCA takedown flow: public-facing `/legal/dmca` page with a structured form (target type/id, original work, optional details, electronic signature, sworn-statement checkbox). Submits to the existing `/api/report` endpoint with a `[DMCA]` reason prefix so admins see them as a distinct class in the existing report queue. Sign-in required to submit through the form; email fallback documented for users who can't sign in.

## Phase 9 — UX polish

- [x] Onboarding wizard: new `OnboardingWizard.tsx` mounted in the (main) layout. Reads `/api/me/status` (now also returns `followingCount` / `avatarUrl` / `createdAt`) and only auto-opens for accounts with 0 follows that are <7 days old. Two steps: (1) follow ≥ 5 from `/api/users/suggestions` (button toggles in-place), (2) optional avatar upload via the existing UploadThing "avatar" endpoint. Either step can be skipped. Dismissal is sticky via localStorage. Interests-by-tag step skipped — would require a new schema and was a nice-to-have; revisit if discovery wants it.
- [x] Skeleton loaders on the feed, profile, comments — already shipped (`PostsLoadingSkeleton`, profile/comments loaders existed pre-roadmap).
- [x] Empty states for every list: new `<EmptyState />` (icon/emoji, title, description, action). Wired into For-You feed, Following feed, and the Drafts list. The other lists' empty copy is already serviceable; the component is in place for them when they need it.
- [x] Custom 404 / 500 pages: (main) `not-found.tsx` rewritten with a proper card + Home/Explore CTAs. New root `src/app/not-found.tsx` for paths outside the (main) group (legal, login). New `src/app/global-error.tsx` as a dependency-free backstop when the root error boundary itself blows up. The existing (main) `error.tsx` already covered the 500 case.
- [x] Subtle animations on like / follow buttons: `LikeButton` uses Tailwind's `transition-all` + `animate-in zoom-in-50` with a `key` swap so the pop replays on every toggle. `FollowButton` gains a 95%-scale `active:` press-down.
- [x] Confirm-on-destructive-actions modal: new reusable `<ConfirmDialog />` built on the project's AlertDialog primitive. Awaits the caller's onConfirm and shows a spinner while it's pending; blocks close mid-action so destructive operations can't be half-cancelled. Replaces the `window.confirm()` call in Drafts → Delete. Post / Comment / Story delete dialogs already existed.

## Phase 10 — Production deployment

The finish line. Don't run this until the previous phases are green.

**Code-side (done in-repo):**
- [x] Pin Node version: `package.json` `"engines": { "node": ">=20.0.0" }`.
- [x] `/api/health` route shipped (Phase 0; pings DB).
- [x] Sentry release tagging on deploy via `withSentryConfig` — auto-creates a release and tags events with it when `SENTRY_AUTH_TOKEN` is set.
- [x] Smoke-test script at `scripts/smoke.mjs` (runs anonymous checks against `/api/health`, manifest, icons, `/offline`, `/login`, `/legal/*`). Run with `npm run smoke -- https://<domain>` after each deploy.
- [x] Preflight env-check script at `scripts/preflight.mjs`. `npm run preflight` reports required-vs-set, warns on common foot-guns (Upstash half-set, Stripe key without webhook secret, etc.).
- [x] Cron-secret env-var normalisation: cron routes now read `CRON_SECRET` first, with `CORN_SECRET` accepted as a fallback. Operators only need to set `CRON_SECRET` going forward.
- [x] `.env.example` extended with Stripe, VAPID, Upstash, Sentry sections.
- [x] Vercel cron entries in `vercel.json`: clear-uploads, clear-stories, publish-scheduled, purge-deleted, trending/refresh, digests/send all wired.

**Vercel cron entries:** `vercel.json` now wires all six — `/api/clear-uploads` daily, `/api/clear-stories` daily, `/api/posts/publish-scheduled` every minute, `/api/users/purge-deleted` daily, `/api/trending/refresh` hourly, `/api/digests/send` weekly. Hobby plan tops out at 2 daily cron jobs — drop or downgrade frequency if you're not on Pro.

**Operator-only (do these in the Vercel dashboard / DNS / external services):**
- [ ] Create a production Vercel project; link to this repo.
- [ ] Set env vars in the host. The full template lives in `.env.example`. Required: DB, Google OAuth, UploadThing, Stream, `CRON_SECRET` (the cron routes now read `CRON_SECRET` first, falling back to `CORN_SECRET` for backwards compat — setting just `CRON_SECRET` is enough), `NEXT_PUBLIC_BASE_URL`, SMTP, `MAIL_FROM`, Stripe live keys, VAPID keys. Optional: Upstash Redis, Sentry. Run `npm run preflight` locally to spot anything missing before deploy.
- [ ] Production database: use the Neon production branch; turn on PITR.
- [ ] Run `prisma migrate deploy` on the production DB. Pending migrations: `20260512000000_add_post_drafts`, `20260512100000_add_scheduled_posts`, `20260512200000_add_analytics`, `20260512300000_add_account_deletion`.
- [ ] Run `node scripts/bootstrap-admin.mjs <your-email>` against the production DB.
- [ ] Verify the `@buzzhub` community account exists in production (bootstrap script seeds it).
- [ ] Custom domain + SSL on Vercel.
- [ ] Email deliverability: SPF / DKIM / DMARC records on the domain for the SMTP / Brevo sender.
- [ ] Stripe live mode: swap test keys for live, register the production webhook URL (`https://<domain>/api/billing/webhook`), copy the live signing secret into `STRIPE_WEBHOOK_SECRET`.
- [ ] Google OAuth: add production callback URL `https://<domain>/api/auth/callback/google` (or whatever your auth route is) to the OAuth client.
- [ ] Synthetic monitoring: free uptime check on `/` and `/api/health` (BetterStack, UptimeRobot, etc.).
- [ ] Backup verification: confirm Neon PITR is active, take one manual `pg_dump`, verify restore on a throwaway DB.
- [ ] Smoke-test in production: `npm run smoke -- https://<domain>` (covers anonymous routes), then manually run signup → post → comment → like → DM → upload → subscribe.
- [ ] Soft launch: invite ≤ 50 users, watch Sentry + DB metrics for 48h.
- [ ] Public launch.

---

## Resume protocol

When a new conversation starts and someone says "continue the roadmap":
1. Read this file.
2. Read `MEMORY.md` and `memory/roadmap_pointer.md`.
3. Find the first unchecked item under the **Current focus** phase.
4. If that phase is fully checked, update **Current focus** to the next phase and start there.
5. After meaningful progress, edit this file to tick boxes and update **Current focus** + **Last commit**.
