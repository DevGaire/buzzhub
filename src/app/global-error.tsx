"use client";

// Backstop for unhandled errors at the root. Replaces the entire document,
// so it has to render its own <html>/<body>. Kept minimal — no providers,
// no Tailwind class dependencies that aren't safe-listed.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
          background: "#0a0a0a",
          color: "#fafafa",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 420 }}>
          <div style={{ fontSize: 48 }}>💥</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0.5rem 0" }}>
            Something broke
          </h1>
          <p style={{ opacity: 0.7, marginBottom: 16 }}>
            An unexpected error stopped the app from rendering. Try reloading.
          </p>
          <button
            onClick={() => reset()}
            style={{
              background: "#7c3aed",
              color: "#fff",
              border: 0,
              padding: "0.5rem 1rem",
              borderRadius: 999,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
          {error?.digest && (
            <p style={{ opacity: 0.4, marginTop: 16, fontSize: 12 }}>
              Reference: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
