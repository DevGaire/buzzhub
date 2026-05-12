#!/usr/bin/env node
/**
 * Post-deploy smoke check. Pings the routes that have to be green for
 * the app to be considered live: /api/health, /manifest.webmanifest,
 * the offline shell, and the legal pages. Anonymous-friendly only —
 * any auth-gated route is left to the manual smoke pass.
 *
 * Usage: node scripts/smoke.mjs https://buzzhub.example
 *        BASE_URL=https://buzzhub.example node scripts/smoke.mjs
 *
 * Exits non-zero on any failure so CI / a deploy hook can fail-fast.
 */

const base =
  process.argv[2] ||
  process.env.BASE_URL ||
  process.env.NEXT_PUBLIC_BASE_URL ||
  "http://localhost:3000";

const checks = [
  { path: "/api/health", expect: 200, expectJson: { status: "ok" } },
  { path: "/manifest.webmanifest", expect: 200 },
  { path: "/icon.svg", expect: 200 },
  { path: "/offline", expect: 200 },
  { path: "/login", expect: 200 },
  { path: "/legal/terms", expect: 200 },
  { path: "/legal/privacy", expect: 200 },
  { path: "/legal/dmca", expect: 200 },
];

const start = Date.now();
let passed = 0;
let failed = 0;
const failures = [];

for (const c of checks) {
  const url = `${base.replace(/\/$/, "")}${c.path}`;
  const t0 = Date.now();
  try {
    const res = await fetch(url, { redirect: "manual" });
    const ms = Date.now() - t0;
    const ok = res.status === c.expect;

    let jsonOk = true;
    if (ok && c.expectJson) {
      const body = await res.json().catch(() => null);
      for (const [k, v] of Object.entries(c.expectJson)) {
        if (body?.[k] !== v) {
          jsonOk = false;
          break;
        }
      }
    }

    if (ok && jsonOk) {
      passed++;
      console.log(`✓ ${c.path}  ${res.status}  ${ms}ms`);
    } else {
      failed++;
      const msg = `${c.path} → ${res.status}${jsonOk ? "" : " (body mismatch)"}`;
      failures.push(msg);
      console.log(`✗ ${msg}  ${ms}ms`);
    }
  } catch (e) {
    failed++;
    failures.push(`${c.path} → ${e?.message || e}`);
    console.log(`✗ ${c.path}  ${e?.message || e}`);
  }
}

const elapsed = Date.now() - start;
console.log(
  `\n${passed}/${checks.length} passed in ${elapsed}ms against ${base}`,
);
if (failed > 0) {
  console.log("Failures:");
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
