import Link from "next/link";

export const metadata = {
  title: "Privacy Policy",
  description: "How BuzzHub handles your data.",
};

const LAST_UPDATED = "2026-05-12";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <header>
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← Back
        </Link>
        <h1 className="mt-2 text-3xl font-bold">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">Last updated {LAST_UPDATED}</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">What we collect</h2>
        <ul className="list-disc pl-6 text-sm">
          <li>
            <strong>Account info</strong> — username, email, hashed password, optional
            display name, bio, avatar, cover image. If you sign in with Google, your
            Google ID, name and avatar are also stored.
          </li>
          <li>
            <strong>Content you create</strong> — posts, comments, likes, bookmarks,
            messages, stories, reports.
          </li>
          <li>
            <strong>Activity</strong> — anonymous post impressions (which posts you
            scrolled past), session tokens, and timestamps of follows.
          </li>
          <li>
            <strong>Payment metadata</strong> — if you subscribe, Stripe handles the
            card details. We only store a Stripe customer ID and subscription status.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">How we use it</h2>
        <ul className="list-disc pl-6 text-sm">
          <li>To run the feed, notifications, search and recommendations.</li>
          <li>To send transactional email (sign-up verification, password reset, weekly digest if enabled).</li>
          <li>To enforce our{" "}
            <Link href="/legal/terms" className="underline">Terms of Service</Link>{" "}
            and respond to reports.</li>
          <li>To bill you for paid features (via Stripe).</li>
        </ul>
        <p>
          We do <strong>not</strong> sell your personal data to advertisers or anyone
          else.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Who we share with</h2>
        <ul className="list-disc pl-6 text-sm">
          <li><strong>Stripe</strong> — payment processing for subscriptions.</li>
          <li><strong>Stream</strong> — real-time chat and call features.</li>
          <li><strong>UploadThing</strong> — hosting for uploaded photos and videos.</li>
          <li><strong>Brevo / SMTP provider</strong> — sending the emails listed above.</li>
        </ul>
        <p>Each of these only sees the data they need to perform their function.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Your rights</h2>
        <p>You can, at any time, from{" "}
          <Link href="/settings" className="underline">Settings</Link>:
        </p>
        <ul className="list-disc pl-6 text-sm">
          <li><strong>Export your data</strong> — request a JSON dump of your account, posts, comments, likes, bookmarks and follows.</li>
          <li><strong>Delete your account</strong> — triggers a 30-day grace period after which everything is permanently removed.</li>
          <li>Update or correct your profile info directly in Settings.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Retention</h2>
        <p>
          Active accounts are kept until you delete them. After deletion, all your
          data is permanently removed within 30 days. Cached copies on third-party
          providers (Stripe billing records, email server logs) may persist according
          to those providers&apos; own retention rules.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Cookies</h2>
        <p>
          BuzzHub uses a single session cookie to keep you logged in. It is not used
          for cross-site advertising or tracking.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Children</h2>
        <p>
          BuzzHub is for users aged 13 and over. We do not knowingly collect data
          from anyone younger; if you believe a child has registered, please report
          the account and we will remove it.
        </p>
      </section>
    </main>
  );
}
