import { describe, it, expect, vi, beforeEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { createServer } from "./server.js";

// Mock fetchTranscript module
vi.mock("./transcript.js", () => ({
  fetchTranscript: vi.fn(),
}));

import { fetchTranscript } from "./transcript.js";

const mockFetchTranscript = vi.mocked(fetchTranscript);

// ─── Helpers ────────────────────────────────────────────────────────────────

async function createTestClient(): Promise<Client> {
  const server = createServer();
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();

  await server.connect(serverTransport);

  const client = new Client(
    { name: "test-client", version: "1.0.0" },
    { capabilities: {} },
  );
  await client.connect(clientTransport);

  return client;
}

function makeSegments(
  overrides: Partial<{ text: string; start: number; duration: number }>[] = [],
) {
  const defaults = [
    { text: "Hello world", start: 0, duration: 5 },
    { text: "This is a test", start: 5, duration: 3 },
  ];
  return defaults.map((seg, i) => ({ ...seg, ...(overrides[i] ?? {}) }));
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("get_transcript tool", () => {
  let client: Client;

  beforeEach(async () => {
    mockFetchTranscript.mockReset();
    client = await createTestClient();
  });

  it("should return isError true for invalid video URL", async () => {
    // Arrange
    const input = { url: "not-a-valid-url" };

    // Act
    const result = await client.callTool({ name: "get_transcript", arguments: input });

    // Assert
    expect(result.isError).toBe(true);
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("Could not extract video ID");
  });

  it("should return plain text transcript when plain is true", async () => {
    // Arrange
    mockFetchTranscript.mockResolvedValueOnce({
      videoId: "dQw4w9WgXcQ",
      segments: makeSegments(),
    });
    const input = {
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      plain: true,
    };

    // Act
    const result = await client.callTool({ name: "get_transcript", arguments: input });

    // Assert
    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toBe("Hello world This is a test");
  });

  it("should return timestamped transcript when plain is false (default)", async () => {
    // Arrange
    mockFetchTranscript.mockResolvedValueOnce({
      videoId: "dQw4w9WgXcQ",
      segments: makeSegments(),
    });
    const input = {
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    };

    // Act
    const result = await client.callTool({ name: "get_transcript", arguments: input });

    // Assert
    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("[00:00] Hello world");
    expect(text).toContain("[00:05] This is a test");
  });

  it("should pass lang parameter through to fetchTranscript", async () => {
    // Arrange
    mockFetchTranscript.mockResolvedValueOnce({
      videoId: "dQw4w9WgXcQ",
      segments: makeSegments(),
    });
    const input = {
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      lang: "fr",
    };

    // Act
    await client.callTool({ name: "get_transcript", arguments: input });

    // Assert
    expect(mockFetchTranscript).toHaveBeenCalledWith("dQw4w9WgXcQ", "fr");
  });

  it("should return sanitized message for known user-safe error", async () => {
    // Arrange
    mockFetchTranscript.mockRejectedValueOnce(
      new Error("No captions available for this video"),
    );
    const input = { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" };

    // Act
    const result = await client.callTool({ name: "get_transcript", arguments: input });

    // Assert
    expect(result.isError).toBe(true);
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toBe("No captions available for this video");
  });

  it("should return generic message for unknown internal errors", async () => {
    // Arrange
    mockFetchTranscript.mockRejectedValueOnce(
      new Error("ECONNREFUSED ::1:443"),
    );
    const input = { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" };

    // Act
    const result = await client.callTool({ name: "get_transcript", arguments: input });

    // Assert
    expect(result.isError).toBe(true);
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toBe(
      "Failed to fetch transcript. Please check the video URL and try again.",
    );
  });

  it("should return empty text for empty segments", async () => {
    // Arrange
    mockFetchTranscript.mockResolvedValueOnce({
      videoId: "dQw4w9WgXcQ",
      segments: [],
    });
    const input = {
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      plain: true,
    };

    // Act
    const result = await client.callTool({ name: "get_transcript", arguments: input });

    // Assert
    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toBe("");
  });

  it("should reject invalid lang format with validation error", async () => {
    // Arrange — lang contains invalid characters (injection payload)
    const input = {
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      lang: "en; DROP TABLE",
    };

    // Act
    const result = await client.callTool({ name: "get_transcript", arguments: input });

    // Assert
    expect(result.isError).toBe(true);
  });

  it("should return generic message when a non-Error value is thrown", async () => {
    // Arrange — simulate a module throwing a plain string
    mockFetchTranscript.mockRejectedValueOnce("socket hang up");
    const input = { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" };

    // Act
    const result = await client.callTool({ name: "get_transcript", arguments: input });

    // Assert
    expect(result.isError).toBe(true);
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toBe(
      "Failed to fetch transcript. Please check the video URL and try again.",
    );
  });
});
