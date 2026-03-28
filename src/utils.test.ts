import { describe, it, expect } from "vitest";

import {
  extractVideoId,
  formatTimestamp,
  formatTranscriptTimestamped,
  formatTranscriptPlain,
} from "./utils.js";

describe("extractVideoId", () => {
  it("should extract ID from standard YouTube URL", () => {
    expect(extractVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ"))
      .toBe("dQw4w9WgXcQ");
  });

  it("should extract ID from short URL", () => {
    expect(extractVideoId("https://youtu.be/dQw4w9WgXcQ"))
      .toBe("dQw4w9WgXcQ");
  });

  it("should extract ID from embed URL", () => {
    expect(extractVideoId("https://youtube.com/embed/dQw4w9WgXcQ"))
      .toBe("dQw4w9WgXcQ");
  });

  it("should extract ID from shorts URL", () => {
    expect(extractVideoId("https://youtube.com/shorts/dQw4w9WgXcQ"))
      .toBe("dQw4w9WgXcQ");
  });

  it("should accept a raw 11-character video ID", () => {
    expect(extractVideoId("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
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
  it("should format seconds as [MM:SS]", () => {
    expect(formatTimestamp(0)).toBe("[00:00]");
    expect(formatTimestamp(5)).toBe("[00:05]");
    expect(formatTimestamp(65)).toBe("[01:05]");
    expect(formatTimestamp(599)).toBe("[09:59]");
  });

  it("should format with hours as [HH:MM:SS]", () => {
    expect(formatTimestamp(3600)).toBe("[01:00:00]");
    expect(formatTimestamp(3661)).toBe("[01:01:01]");
    expect(formatTimestamp(36000)).toBe("[10:00:00]");
  });

  it("should floor fractional seconds", () => {
    expect(formatTimestamp(1.7)).toBe("[00:01]");
    expect(formatTimestamp(59.9)).toBe("[00:59]");
  });
});

describe("formatTranscriptTimestamped", () => {
  it("should format segments with timestamps", () => {
    const segments = [
      { text: "Hello world", start: 0 },
      { text: "This is a test", start: 5.5 },
      { text: "Third segment", start: 3661 },
    ];
    const result = formatTranscriptTimestamped(segments);
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
    const segments = [
      { text: "Hello" },
      { text: "world" },
    ];
    expect(formatTranscriptPlain(segments)).toBe("Hello world");
  });

  it("should return empty string for empty segments", () => {
    expect(formatTranscriptPlain([])).toBe("");
  });
});
