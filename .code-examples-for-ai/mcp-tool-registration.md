<!-- Description: How to register an MCP tool with server.registerTool(), using a plain Zod field object for inputSchema and sanitizeErrorMessage() for error safety -->

# MCP Tool Registration

Use `server.registerTool()` (never the deprecated `server.tool()`) to register a tool.
`inputSchema` must be a **plain object of Zod fields** — NOT `z.object({...})` — the SDK wraps it internally.

```typescript
// src/server.ts

server.registerTool(
  "get_transcript",
  {
    description:
      "Fetch the transcript of a YouTube video. " +
      "Accepts a YouTube URL or video ID. " +
      "Returns the transcript with timestamps by default.",
    // ✅ inputSchema is a plain object of Zod fields (NOT z.object({...}))
    inputSchema: {
      url: z
        .string()
        .max(2048)
        .describe("YouTube video URL or video ID"),
      lang: z
        .string()
        .regex(
          /^[a-zA-Z]{2,3}(-[a-zA-Z]{2,8})?$/,
          "Invalid language code format",
        )
        .max(10)
        .optional()
        .describe(
          "Language code (e.g. 'en', 'es'). " +
          "Defaults to the video's primary language.",
        ),
      plain: z
        .boolean()
        .optional()
        .describe(
          "When true, returns the transcript as plain text " +
          "without timestamps. Defaults to false.",
        ),
    },
  },
  async ({ url, lang, plain }) => {
    try {
      const videoId = extractVideoId(url);
      const result = await fetchTranscript(videoId, lang);
      const text = plain
        ? formatTranscriptPlain(result.segments)
        : formatTranscriptTimestamped(result.segments);
      // ✅ Success result: content array with type:"text" as const
      return {
        content: [{ type: "text" as const, text }],
      };
    } catch (error) {
      const rawMessage =
        error instanceof Error ? error.message : String(error);
      console.error("get_transcript error:", rawMessage);
      // ✅ Error messages sanitized before returning to MCP client
      const message = sanitizeErrorMessage(rawMessage);
      // ✅ isError:true signals tool failure to the MCP client
      return {
        content: [{ type: "text" as const, text: message }],
        isError: true,
      };
    }
  },
);
```

## Key Points

- `server.registerTool()` — use this, NOT the deprecated `server.tool()`
- `inputSchema` is a **plain object** `{ field: z.schema() }` — NOT `z.object({ field: z.schema() })`
- Every Zod field should have `.describe(...)` — the SDK exposes descriptions to LLM clients
- Tool handler returns `{ content: [{ type: "text" as const, text }] }` on success
- Tool handler returns `{ content: [...], isError: true }` on failure — never throws
- All errors are sanitized via `sanitizeErrorMessage()` before sending to client
- `console.error()` only — never `console.log()` (stdout is the MCP transport wire)
