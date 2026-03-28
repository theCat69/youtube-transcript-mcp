import { describe, it, expect } from "vitest";

import { extractVideoId } from "./utils.js";

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
