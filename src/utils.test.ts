import { describe, it, expect } from "vitest";

import {
  extractVideoId,
  formatTimestamp,
  formatTranscriptTimestamped,
  formatTranscriptPlain,
} from "./utils.js";

describe("extractVideoId", () => {
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
      "https://youtube.com/shorts/dQw4w9WgXcQ",
      "dQw4w9WgXcQ",
      "shorts URL",
    ],
    [
      "dQw4w9WgXcQ",
      "dQw4w9WgXcQ",
      "raw 11-character video ID",
    ],
  ])("should extract ID from %s (%s)", (input, expected) => {
    expect(extractVideoId(input)).toBe(expected);
  });

  it("should throw on invalid input", () => {
    expect(() => extractVideoId("not-a-valid-url")).toThrow(
      "Could not extract video ID from: not-a-valid-url",
    );
  });

  it("should throw on excessively long input", () => {
    const longInput = "a".repeat(3000);
    expect(() => extractVideoId(longInput)).toThrow();
  });
});

describe("formatTimestamp", () => {
  it.each([
    [0, "[00:00]"],
    [5, "[00:05]"],
    [65, "[01:05]"],
    [599, "[09:59]"],
  ])("should format %d seconds as %s (MM:SS)", (input, expected) => {
    expect(formatTimestamp(input)).toBe(expected);
  });

  it.each([
    [3600, "[01:00:00]"],
    [3661, "[01:01:01]"],
    [36000, "[10:00:00]"],
  ])("should format %d seconds as %s (HH:MM:SS)", (input, expected) => {
    expect(formatTimestamp(input)).toBe(expected);
  });

  it.each([
    [1.7, "[00:01]"],
    [59.9, "[00:59]"],
  ])("should floor fractional seconds (%d → %s)", (input, expected) => {
    expect(formatTimestamp(input)).toBe(expected);
  });
});

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

describe("formatTranscriptPlain", () => {
  it("should join segments with spaces", () => {
    // Arrange
    const segments = [
      { text: "Hello" },
      { text: "world" },
    ];

    // Act + Assert
    expect(formatTranscriptPlain(segments)).toBe("Hello world");
  });

  it("should return empty string for empty segments", () => {
    expect(formatTranscriptPlain([])).toBe("");
  });
});
