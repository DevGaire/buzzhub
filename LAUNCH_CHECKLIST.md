# BuzzHub — Launch Readiness Checklist

Generated 2026-04-29. Items are grouped by **Done in this commit / Pending (do before launch) / Decisions you must make**.

---

## ✅ Done in this commit

| Area | Change |
|---|---|
| Debug surface | `src/middleware.ts` returns 404 for `/api/debug*`, `/api/test-email`, `/api/fix-oauth-emails`, `/debug-*` pages when `NODE_ENV === "production"`. |
| HTTP security headers | `next.config.mjs` now sets HSTS (2y, preload), `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` locking down camera/mic/screen-capture to self and disabling geolocation/payment/usb. |
| Env documentation | `.env.example` lists every variable the app reads. |
| Env validation | `src/env.ts` checks required vars at module load — throws in prod, warns in dev. |
| Date-as-React-child landmine | `src/lib/ky.ts` reviver now only converts strings that match a strict ISO-8601 pattern, so display strings like `"08:30 PM"` no longer become invalid `Date` objects. |

---

## 🔥 Pending — must do before launch

### 1. Remove or rotate exposed debug routes
The debug routes are now blocked at runtime, but they still ship in the bundle. Recommended: delete them in a follow-up commit once you've confirmed nothing depends on them.
- `src/app/api/debug/`
- `src/app/api/debug-login/route.ts`
- `src/app/api/debug-forgot-password/route.ts`
- `src/app/api/debug-media/route.ts`
- `src/app/api/debug-users/route.ts` ← **leaks `passwordHash` for every user**
- `src/app/api/test-email/route.ts`
- `src/app/api/fix-oauth-emails/route.ts`
- `src/app/debug-forgot/`, `debug-login/`, `debug-media/`, `debug-users/` (page routes)

### 2. Add rate limiting on auth surface
Lucia + Argon2 is solid, but signup/login/forgot-password/reset-password have no throttling. Pick one:
- **Upstash Redis + `@upstash/ratelimit`** (recommended, free tier covers most apps)
- **In-memory** with `lru-cache` (works but loses state on serverless cold-starts)

Endpoints to protect: `/api/auth/*`, `(auth)/login`, `(auth)/signup`, `(auth)/forgot-password`, `(auth)/reset-password`.

### 3. Add Content Security Policy
HSTS+frame headers are set, but CSP is missing. CSP requires per-site tuning because of inline styles from Stream Chat, UploadThing, Tailwind, etc. Suggested starting policy in report-only mode:
```
Content-Security-Policy-Report-Only: default-src 'self';
  script-src 'self' 'unsafe-inline' https://*.uploadthing.com https://*.getstream.io;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https://*.ufs.sh https://utfs.io https://uploadthing.com;
  connect-src 'self' https://*.getstream.io wss://*.getstream.io https://*.uploadthing.com;
  media-src 'self' blob: https://*.ufs.sh;
  font-src 'self' data:;
  frame-ancestors 'none';
```
Run for a week, watch reports, then promote to enforced.

### 4. Add error monitoring
Currently you only have `console.error`. Pick one:
- **Sentry** (`@sentry/nextjs`) — best DX
- **Vercel Observability** if you're on Vercel Pro
Capture both client and server errors; redact `authorization`, `cookie`, `x-webhook-secret` headers.

### 5. Tighten Stream webhook auth
`src/app/api/stream-webhook/route.ts` checks a custom `x-webhook-secret` header. Stream sends an `x-signature` HMAC; verifying that instead is much stronger. See `streamServerClient.verifyWebhook()` in the SDK.

### 6. Email verification + signup throttling
Confirm `(auth)/signup/actions.ts` always calls the email-verification flow, and that the verification token table has TTL cleanup. Check that signup with the same email twice within a short window gives a generic message (anti-enumeration).

### 7. CORN_SECRET vs CRON_SECRET typo in CLAUDE.md
The codebase reads `CRON_SECRET`. CLAUDE.md still says `CORN_SECRET`. Fix the doc.

### 8. Add `sharp` for image optimization
Production build warns: `For production Image Optimization with Next.js, the optional 'sharp' package is strongly recommended.` Run `npm i sharp`.

### 9. Database hardening
- Add `@@index` on `Post.userId`, `Post.createdAt DESC`, `Comment.postId`, `Like.postId`, `Notification.recipientId+isRead`, `Bookmark.userId+createdAt` if not already there. Confirm against `prisma/schema.prisma`.
- Set up automated backups in Neon (it has PITR — confirm enabled).
- Decide on a soft-delete strategy for `User` to preserve referential integrity vs hard deletes that may break orphaned posts/comments.

### 10. UploadThing limits
Verify `src/app/api/uploadthing/core.ts` enforces:
- File size caps (avatar/cover/post media — separate routers)
- MIME-type allow-list (no `application/x-msdownload` etc.)
- Max files per upload
- Auth check (`validateRequest`) before accepting uploads

### 11. Clean up production console logs
Many routes have emoji-prefixed `console.log` calls (search "🔍" / "📊"). They leak query plans and user data. Either:
- Wrap in `if (process.env.NODE_ENV !== "production")`
- Replace with a structured logger (`pino`, `next-logger`)

### 12. Cookie / session config
- Lucia is set to `expires: false` (session lives until browser closes). For a social app, consider sliding-window with explicit max-age (e.g. 30 days).
- Consider adding `sameSite: "lax"` explicitly (it is the default but pin it).

### 13. CORS posture for API routes
No explicit CORS configuration today. If you ever expose an API publicly, add an allow-list. For now, default same-origin is fine.

### 14. Tests
No test runner is configured. At minimum add:
- Unit: validation schemas in `src/lib/validation.ts`
- Integration: auth flow happy path + token expiry
- E2E (Playwright): signup → verify email → login → post → comment

### 15. Monitoring & SLOs
- Hook up Vercel Analytics or a real APM (Sentry Performance)
- Add a `/api/health` route that pings DB and Stream and returns 200/503

### 16. CI/CD
- Add a GitHub Actions workflow: `npm run lint`, `tsc --noEmit`, `npm run build` on every PR.
- Block merges into `Final-Project` until CI passes.

### 17. Legal / compliance
- Add Terms of Service + Privacy Policy pages (linked from footer + signup form)
- DPA in place with Neon, UploadThing, Stream, Brevo
- Cookie consent banner if you target EU users
- Data export + delete endpoints (GDPR right to access / erasure)

### 18. Performance pass
- Audit Largest Contentful Paint on `/` and `/users/[username]`. The home feed loads `Post.tsx` with eager media — virtualization (`@tanstack/react-virtual`) on long feeds will help.
- Set Stream Chat `presenceCheck` interval down (currently using defaults).
- Add `Cache-Control` to `/api/posts/for-you` for short-lived (s-maxage=10) caching once feed correctness is settled.

---

## 🤔 Decisions I need from you before implementing

1. **Where to host?** Vercel vs Fly vs Railway changes the answer for cron, env management, and observability.
2. **Rate limiter backend?** Upstash, Vercel KV, or in-memory.
3. **Error monitoring vendor?** Sentry, BetterStack, Datadog?
4. **Email provider** stays Brevo, or switch to Resend/Postmark for better deliverability?
5. **Domain + SSL** plan — naked domain vs `app.` subdomain, certificate ownership?
6. **Background-job runner** for digests, story cleanup beyond Vercel cron limits?

Tell me the answers and I'll implement #2, #3, #4, #15, #16 immediately. The rest (CSP tuning, schema indexes, deleting debug routes, sharp install) I can do without further input — just say "go".
