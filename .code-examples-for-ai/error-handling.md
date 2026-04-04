<!-- Description: Project error handling pattern — try/catch in MCP handlers, sanitizeErrorMessage() allowlist, console.error() logging, isError:true return -->

# Error Handling

MCP tool handlers must never throw — always catch, sanitize, and return `isError: true`.
A `USER_SAFE_PREFIXES` allowlist controls which error messages can be surfaced to clients verbatim;
all other errors produce a generic message to prevent internal detail leakage.

```typescript
// src/server.ts

/**
 * Error message prefixes considered safe to surface to the MCP client.
 * All other errors are replaced with a generic message to avoid leaking internals.
 */
const USER_SAFE_PREFIXES = [
  "No captions",
  "Invalid",
  "Could not extract",
  "Language ",
];

function sanitizeErrorMessage(message: string): string {
  const isSafe = USER_SAFE_PREFIXES.some((prefix) =>
    message.startsWith(prefix),
  );
  if (isSafe) {
    return message;
  }
  // Generic fallback — never leaks stack traces, file paths, or env vars
  return "Failed to fetch transcript. Please check the video URL and try again.";
}

// Inside the tool handler:
async ({ url, lang, plain }) => {
  try {
    const videoId = extractVideoId(url);
    const result = await fetchTranscript(videoId, lang);
    const text = plain
      ? formatTranscriptPlain(result.segments)
      : formatTranscriptTimestamped(result.segments);
    return {
      content: [{ type: "text" as const, text }],
    };
  } catch (error) {
    // ✅ Normalize unknown thrown values to a string
    const rawMessage =
      error instanceof Error ? error.message : String(error);
    // ✅ console.error() ONLY — never console.log()
    console.error("get_transcript error:", rawMessage);
    // ✅ Sanitize before returning to MCP client
    const message = sanitizeErrorMessage(rawMessage);
    return {
      content: [{ type: "text" as const, text: message }],
      isError: true,
    };
  }
},
```

## Key Points

- `console.log()` is **FORBIDDEN** — stdout is the MCP stdio transport; only `console.error()` for diagnostics
- Always handle the case where a thrown value is not an `Error` instance: `error instanceof Error ? error.message : String(error)`
- `sanitizeErrorMessage()` uses a prefix allowlist — any error not matching a safe prefix gets a generic message
- Add prefixes to `USER_SAFE_PREFIXES` only for messages that are safe to reveal to users (no paths, no internals)
- Return `isError: true` in the tool result — do not re-throw from the handler
- `console.error()` logs the raw message before sanitization so server logs retain full detail
