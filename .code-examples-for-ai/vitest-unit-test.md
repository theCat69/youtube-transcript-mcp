<!-- Description: Vitest unit test structure — describe/it.each parameterized tests, AAA pattern, toThrow assertions, no mocking needed for pure functions -->

# Vitest Unit Tests

Unit tests for pure utility functions require no mocking. Use `describe` to group tests per function,
`it.each()` for parameterized cases, and the AAA (Arrange-Act-Assert) pattern.
`restoreMocks: true` is set globally in `vitest.config.ts`.

```typescript
// src/utils.test.ts

import { describe, it, expect } from "vitest";

import {
  extractVideoId,
  formatTimestamp,
  formatTranscriptTimestamped,
  formatTranscriptPlain,
} from "./utils.js"; // ✅ .js extension required

// ── Parameterized tests with it.each ────────────────────────────────────────

describe("extractVideoId", () => {
  // ✅ it.each: [[input, expected, label], ...] — label appears in test name
  it.each([
    [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "dQw4w9WgXcQ",
      "standard YouTube URL",
    ],
    [
      "https://youtu.be/dQw4w9WgXcQ",
      "dQw4w9WgXcQ",
      "short URL",
    ],
    [
      "https://youtube.com/embed/dQw4w9WgXcQ",
      "dQw4w9WgXcQ",
      "embed URL",
    ],
    [
      "dQw4w9WgXcQ",
      "dQw4w9WgXcQ",
      "raw 11-character video ID",
    ],
  ])("should extract ID from %s (%s)", (input, expected) => {
    // ✅ toBe for primitive string comparison
    expect(extractVideoId(input)).toBe(expected);
  });

  it("should throw on invalid input", () => {
    // ✅ Inline lambda to test synchronous throws
    expect(() => extractVideoId("not-a-valid-url")).toThrow(
      "Could not extract video ID from: not-a-valid-url",
    );
  });

  it("should throw on excessively long input", () => {
    const longInput = "a".repeat(3000);
    expect(() => extractVideoId(longInput)).toThrow();
  });
});

// ── AAA pattern for multi-step tests ────────────────────────────────────────

describe("formatTranscriptTimestamped", () => {
  it("should format segments with timestamps", () => {
    // Arrange
    const segments = [
      { text: "Hello world", start: 0 },
      { text: "This is a test", start: 5.5 },
      { text: "Third segment", start: 3661 },
    ];

    // Act
    const result = formatTranscriptTimestamped(segments);

    // Assert
    expect(result).toBe(
      "[00:00] Hello world\n" +
      "[00:05] This is a test\n" +
      "[01:01:01] Third segment",
    );
  });

  it("should return empty string for empty segments", () => {
    expect(formatTranscriptTimestamped([])).toBe("");
  });
});
```

## Key Points

- Import `{ describe, it, expect, vi, beforeEach }` from `"vitest"` (never from `"@jest/globals"`)
- `it.each([[input, expected, label], ...])` — third element is a human-readable label in the test name
- `expect(() => fn()).toThrow(message)` for synchronous throws; `expect(promise).rejects.toThrow()` for async
- `toBe()` for primitives; `toEqual()` for deep object/array comparison
- `restoreMocks: true` in `vitest.config.ts` means all `vi.spyOn` and `vi.fn` are restored automatically
- Use `mockReset()` in `beforeEach` when you need to clear call history on a persistent `vi.fn()`
- Test names read as sentences: `"should extract ID from standard YouTube URL"`
