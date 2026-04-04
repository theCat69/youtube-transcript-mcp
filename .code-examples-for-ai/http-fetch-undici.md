<!-- Description: Safe undici HTTP fetch pattern — HTTPS-only, maxRedirections:0, AbortSignal.timeout, 5MB response body cap, hostname allowlist validation -->

# HTTP Fetch with undici

All HTTP requests use `undici` with mandatory security constraints: HTTPS only, zero redirections,
a 10-second timeout via `AbortSignal.timeout()`, and a 5 MB response body cap to prevent memory exhaustion.
Transcript URLs are also validated against a hostname allowlist before fetching.

```typescript
// src/transcript.ts

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Extended request options that include maxRedirections.
 * undici v7 processes maxRedirections via the redirect interceptor;
 * the TypeScript type omits it from RequestOptions, so we extend locally.
 */
type RequestOpts = Parameters<typeof request>[1] & { maxRedirections?: number };

// ── 1. Response body cap (size-limited async read) ───────────────────────────

async function readResponseText(
  body: Dispatcher.ResponseData["body"],
  maxSize: number = MAX_RESPONSE_SIZE,
): Promise<string> {
  const chunks: Buffer[] = [];
  let totalSize = 0;
  for await (const chunk of body) {
    totalSize += chunk.length;
    if (totalSize > maxSize) {
      // Destroy the stream to free resources
      body.destroy();
      throw new Error("Response body exceeds maximum allowed size");
    }
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf-8");
}

// ── 2. Hostname allowlist check (SSRF prevention) ────────────────────────────

function validateTranscriptUrl(url: string): void {
  const parsed = new URL(url);

  if (parsed.protocol !== "https:") {
    throw new Error(
      `Untrusted transcript URL protocol: ${parsed.protocol}`,
    );
  }

  const hostname = parsed.hostname.toLowerCase();
  const ALLOWED_HOSTNAMES = [
    "www.youtube.com",
    "youtube.com",
    "video.google.com",
    "www.google.com",
  ];
  const ALLOWED_SUFFIXES = [
    ".youtube.com",
    ".google.com",
  ];

  const isAllowed = ALLOWED_HOSTNAMES.includes(hostname) ||
    ALLOWED_SUFFIXES.some((suffix) => hostname.endsWith(suffix));

  if (!isAllowed) {
    throw new Error(
      `Untrusted transcript URL hostname: ${hostname}`,
    );
  }
}

// ── 3. Making the request ────────────────────────────────────────────────────

async function fetchCaptionTracksInnerTube(
  videoId: string,
): Promise<CaptionTrack[]> {
  const body = JSON.stringify({
    context: {
      client: {
        clientName: "ANDROID",
        clientVersion: "20.10.38",
        hl: "en",
      },
    },
    videoId,
  });

  const opts: RequestOpts = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": ANDROID_USER_AGENT,
    },
    body,
    headersTimeout: REQUEST_TIMEOUT_MS,
    bodyTimeout: REQUEST_TIMEOUT_MS,
    // ✅ Never follow redirects
    maxRedirections: 0,
    // ✅ AbortSignal.timeout() cancels the request after 10s
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  };

  const { statusCode, body: responseBody } = await request(INNERTUBE_URL, opts);

  if (statusCode !== 200) {
    throw new Error(
      `InnerTube API returned status ${statusCode}`,
    );
  }

  // ✅ readResponseText enforces the 5 MB cap
  const responseText = await readResponseText(responseBody);
  const playerResponse: unknown = JSON.parse(responseText);

  return extractCaptionTracks(playerResponse);
}
```

## Key Points

- Import `request` from `undici` — never use Node's built-in `http`/`https` modules
- Always set `maxRedirections: 0` — redirects could bypass the hostname allowlist (SSRF risk)
- Always set `signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)` — prevents hung connections
- Call `readResponseText()` (not `response.text()`) to enforce the 5 MB body size cap
- Call `validateTranscriptUrl()` before fetching any caption track URL from external data
- Call `body.destroy()` when aborting mid-stream to release the socket
- `RequestOpts` extends undici's type with `maxRedirections?: number` (the TS type omits it in v7)
