import kyInstance from "@/lib/ky";

// In-flight request shared between chat and video client hooks so /api/get-token
// is only called once per mount cycle instead of twice.
let pendingToken: Promise<string> | null = null;
let tokenExpiry = 0;

export function getStreamToken(): Promise<string> {
  const now = Date.now();
  if (pendingToken && now < tokenExpiry) return pendingToken;

  pendingToken = kyInstance
    .get("/api/get-token")
    .json<{ token: string }>()
    .then((r) => r.token);

  // Token is valid for 1 hour; cache for 50 minutes
  tokenExpiry = now + 50 * 60 * 1000;

  // Clear on failure so the next call retries
  pendingToken.catch(() => {
    pendingToken = null;
    tokenExpiry = 0;
  });

  return pendingToken;
}
