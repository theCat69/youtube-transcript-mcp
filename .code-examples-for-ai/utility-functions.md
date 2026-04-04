<!-- Description: Pure utility functions — camelCase naming, single responsibility, explicit return types, module-level constants -->

# Utility Functions

Utility functions in `src/utils.ts` are small, pure, named `function` declarations with explicit
parameter and return types. Module-level constants use `UPPER_SNAKE_CASE`. Each function has a
single responsibility.

```typescript
// src/utils.ts

// ✅ Module-level constant — UPPER_SNAKE_CASE
const MAX_INPUT_LENGTH = 2048;

// ✅ function declaration (top-level, hoistable) — not const arrow
// ✅ Explicit parameter and return type
// ✅ Guard clause with early throw
export function extractVideoId(input: string): string {
  if (input.length > MAX_INPUT_LENGTH) {
    throw new Error("Input exceeds maximum allowed length");
  }

  // Handle direct 11-char video IDs
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
    return input;
  }

  const patterns = [
    /(?:youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) {
      return match[1];
    }
  }

  // Truncate before including in error message (prevents log injection)
  const truncated = input.length > 100 ? input.slice(0, 100) + "…" : input;
  throw new Error(`Could not extract video ID from: ${truncated}`);
}

/**
 * Format seconds into a [HH:MM:SS] or [MM:SS] timestamp string.
 */
export function formatTimestamp(seconds: number): string {
  const totalSeconds = Math.floor(seconds);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");

  if (h > 0) {
    const hh = String(h).padStart(2, "0");
    return `[${hh}:${mm}:${ss}]`;
  }
  return `[${mm}:${ss}]`;
}

/**
 * Format transcript segments into timestamped lines.
 */
export function formatTranscriptTimestamped(
  // ✅ Structural typing — accepts any object with the needed fields
  segments: { text: string; start: number }[],
): string {
  return segments
    .map((s) => `${formatTimestamp(s.start)} ${s.text}`)
    .join("\n");
}

/**
 * Format transcript segments into a single plain text line.
 */
export function formatTranscriptPlain(
  segments: { text: string }[],
): string {
  return segments.map((s) => s.text).join(" ");
}
```

## Key Points

- Use `function` declarations for top-level named functions (hoistable)
- Use `UPPER_SNAKE_CASE` for true module-level constants
- Prefer structural typing for array element shapes (accept the minimum required fields)
- Use guard clauses (early return/throw) to reduce nesting
- Truncate user-controlled strings before embedding them in error messages
- All exported functions must have explicit parameter and return type annotations
- `camelCase` for function names; single responsibility per function
