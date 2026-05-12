import { validateRequest } from "@/auth";
import Link from "next/link";
import DMCAForm from "./DMCAForm";

export const metadata = {
  title: "DMCA Takedown",
  description: "Submit a DMCA copyright takedown request.",
};

export default async function DMCAPage() {
  const { user } = await validateRequest();

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <header>
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← Back
        </Link>
        <h1 className="mt-2 text-3xl font-bold">DMCA Takedown</h1>
        <p className="text-sm text-muted-foreground">
          File a copyright takedown notice under the DMCA.
        </p>
      </header>

      <section className="space-y-3 text-sm">
        <p>
          If you believe a post, comment, or other content on BuzzHub infringes a
          copyright you own or are authorised to enforce, you can submit a takedown
          notice using the form below.
        </p>
        <p>
          Your notice must include the URL or ID of the infringing content, a
          description of the original work, and a good-faith statement that you are
          the copyright owner or authorised representative. False notices are unlawful.
        </p>
      </section>

      {user ? (
        <DMCAForm />
      ) : (
        <div className="rounded-2xl border bg-card p-5 text-sm">
          <p>
            You need to be signed in to submit a takedown notice through this form.
            If you can&apos;t sign in, email a notice to the support address on our
            marketing site instead.
          </p>
          <Link
            href="/login"
            className="mt-3 inline-block rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Sign in
          </Link>
        </div>
      )}
    </main>
  );
}
