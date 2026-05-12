import Link from "next/link";

export const metadata = {
  title: "Terms of Service",
  description: "BuzzHub's terms of service.",
};

const LAST_UPDATED = "2026-05-12";

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <header>
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← Back
        </Link>
        <h1 className="mt-2 text-3xl font-bold">Terms of Service</h1>
        <p className="text-sm text-muted-foreground">Last updated {LAST_UPDATED}</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">1. Acceptance</h2>
        <p>
          By creating an account or using BuzzHub (the &quot;Service&quot;) you agree to these
          Terms of Service. If you do not agree, do not use the Service.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">2. Eligibility</h2>
        <p>
          You must be at least <strong>13 years old</strong> to use BuzzHub. By signing
          up you represent that you meet this age requirement.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">3. Your account</h2>
        <p>
          You are responsible for the activity that happens under your account and for
          keeping your password secret. Notify us immediately of any unauthorised use.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">4. Acceptable use</h2>
        <p>You agree not to use the Service to:</p>
        <ul className="list-disc pl-6 text-sm">
          <li>post content that is illegal, harassing, hateful, or sexually explicit involving minors;</li>
          <li>impersonate any person or entity, or misrepresent your affiliation;</li>
          <li>infringe another person&apos;s intellectual property rights;</li>
          <li>attempt to gain unauthorised access to other accounts or our systems;</li>
          <li>scrape the Service, run automated tools against it, or use it to send spam.</li>
        </ul>
        <p>
          We may remove content and suspend or terminate accounts that violate these
          terms, at our discretion.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">5. Your content</h2>
        <p>
          You keep ownership of the content you post. By posting, you grant BuzzHub a
          worldwide, non-exclusive, royalty-free licence to host, store, display and
          distribute that content for the purpose of operating the Service.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">6. Paid features</h2>
        <p>
          Paid features (e.g. the verified badge) are billed by Stripe. Subscriptions
          renew automatically until cancelled. You can cancel at any time from{" "}
          <Link href="/settings" className="underline">Settings</Link>.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">7. Termination</h2>
        <p>
          You can delete your account at any time from{" "}
          <Link href="/settings" className="underline">Settings</Link>. Deleted accounts
          enter a 30-day grace period before being permanently removed, during which
          you can change your mind.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">8. Disclaimers</h2>
        <p>
          The Service is provided &quot;as is&quot;. To the maximum extent permitted by law,
          BuzzHub disclaims all warranties, express or implied.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">9. Changes</h2>
        <p>
          We may update these terms. We&apos;ll surface meaningful changes in-app.
          Continued use after a change means you accept the new terms.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">10. Contact</h2>
        <p>
          Questions? See{" "}
          <Link href="/legal/privacy" className="underline">our privacy policy</Link> or
          reach out via the support address listed on the marketing site.
        </p>
      </section>
    </main>
  );
}
