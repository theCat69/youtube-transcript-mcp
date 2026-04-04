<!-- Description: MCP integration test using InMemoryTransport — createLinkedPair(), real Client, vi.mock for dependency isolation, client.callTool() assertions -->

# MCP Integration Tests with InMemoryTransport

Integration tests for MCP tools use `InMemoryTransport.createLinkedPair()` to connect a real
`McpServer` and `Client` over an in-memory transport — no network, no stdio, but full JSON-RPC
message flow. The transport module (`fetchTranscript`) is mocked with `vi.mock()`.

```typescript
// src/server.test.ts

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { createServer } from "./server.js";

// ✅ Module mock — must appear before the module is imported
vi.mock("./transcript.js", () => ({
  fetchTranscript: vi.fn(),
}));

// ✅ Import AFTER vi.mock() so we get the mocked version
import { fetchTranscript } from "./transcript.js";

const mockFetchTranscript = vi.mocked(fetchTranscript);

// ── Helper: create a linked client+server pair ───────────────────────────────

async function createTestClient(): Promise<Client> {
  const server = createServer();
  // ✅ createLinkedPair() returns [clientTransport, serverTransport]
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

// ── Tests ────────────────────────────────────────────────────────────────────

describe("get_transcript tool", () => {
  let client: Client;

  beforeEach(async () => {
    // ✅ mockReset() clears call history and return values before each test
    mockFetchTranscript.mockReset();
    client = await createTestClient();
  });

  it("should return plain text transcript when plain is true", async () => {
    // Arrange
    mockFetchTranscript.mockResolvedValueOnce({
      videoId: "dQw4w9WgXcQ",
      segments: [
        { text: "Hello world", start: 0, duration: 5 },
        { text: "This is a test", start: 5, duration: 3 },
      ],
    });

    // Act — invoke through full MCP JSON-RPC flow
    const result = await client.callTool({
      name: "get_transcript",
      arguments: {
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        plain: true,
      },
    });

    // Assert
    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toBe("Hello world This is a test");
  });

  it("should return generic message for unknown internal errors", async () => {
    // Arrange — simulate an internal error that must not leak
    mockFetchTranscript.mockRejectedValueOnce(
      new Error("ECONNREFUSED ::1:443"),
    );

    // Act
    const result = await client.callTool({
      name: "get_transcript",
      arguments: { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
    });

    // Assert
    expect(result.isError).toBe(true);
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    // ✅ Internal error detail must NOT appear in the response
    expect(text).toBe(
      "Failed to fetch transcript. Please check the video URL and try again.",
    );
  });

  it("should pass lang parameter through to fetchTranscript", async () => {
    // Arrange
    mockFetchTranscript.mockResolvedValueOnce({
      videoId: "dQw4w9WgXcQ",
      segments: [],
    });

    // Act
    await client.callTool({
      name: "get_transcript",
      arguments: {
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        lang: "fr",
      },
    });

    // Assert — verify dependency was called with correct extracted videoId + lang
    expect(mockFetchTranscript).toHaveBeenCalledWith("dQw4w9WgXcQ", "fr");
  });
});
```

## Key Points

- `InMemoryTransport.createLinkedPair()` returns `[clientTransport, serverTransport]` — both must be connected
- `vi.mock("./transcript.js", ...)` must be declared **before** the import of the mocked module
- Use `vi.mocked(fetchTranscript)` to get a typed mock reference
- `mockReset()` in `beforeEach` — clears both call history and return value queue (use `mockClear()` only if you need to preserve return values)
- `client.callTool({ name, arguments })` exercises the full JSON-RPC serialization path
- Cast `result.content` to `Array<{ type: string; text: string }>` to access text content
- `result.isError` is `true | undefined` — use `toBe(true)` or `toBeFalsy()` accordingly
