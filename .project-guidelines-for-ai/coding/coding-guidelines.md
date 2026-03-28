# Coding Guidelines

This project is a YouTube Transcript MCP server built with TypeScript (strict mode, ESM) on Bun runtime, using `@modelcontextprotocol/sdk` v1.x, Zod v4, undici, and Vitest.

---

## Code Style

### Formatting

- **Indentation**: 2 spaces (no tabs).
- **Quotes**: Double quotes for all strings.
- **Semicolons**: Always use semicolons.
- **Trailing commas**: Use trailing commas in multi-line constructs (arrays, objects, parameters).
- **Line length**: Keep lines under 100 characters where practical.
- **Braces**: K&R style (opening brace on same line as statement).

### Types

- TypeScript strict mode is mandatory (`"strict": true` in tsconfig).
- Prefer `interface` for object shapes; use `type` for unions, intersections, and mapped types.
- Use Zod schemas as the single source of truth for runtime validation; derive TypeScript types with `z.infer<typeof MySchema>`.
- Avoid `any`. Use `unknown` when the type is genuinely unknown, then narrow with type guards.
- Use `as const` for literal values that should not widen.
- Export types with `export type` when only the type is needed (required by `isolatedModules: true`, which is currently enabled). Consider enabling `verbatimModuleSyntax` as a future enhancement for stricter ESM enforcement.

### Functions

- Prefer `function` declarations for top-level named functions (hoistable, clear intent).
- Use arrow functions for inline callbacks and short expressions.
- Keep functions small and focused -- one responsibility per function.
- Use `async`/`await` over raw Promises.
- Always type function parameters and return types explicitly for exported functions.

---

## Naming Conventions

| Element | Convention | Example |
|---|---|---|
| Files | `kebab-case.ts` | `transcript-cache.ts` |
| Variables / functions | `camelCase` | `extractVideoId` |
| Classes | `PascalCase` | `TranscriptFetcher` |
| Interfaces / Types | `PascalCase` (no `I` prefix) | `TranscriptSegment` |
| Constants | `UPPER_SNAKE_CASE` for true constants | `MAX_RESPONSE_SIZE` |
| Derived values | `camelCase` | `defaultTimeout` |
| Zod schemas | `PascalCase` + `Schema` suffix | `VideoIdSchema` |
| Test files | Same name + `.test.ts` suffix, co-located | `utils.test.ts` |
| Generics | Single uppercase letter or descriptive `PascalCase` | `T`, `TResult` |

---

## Import Ordering

Use ESM `import`/`export` syntax exclusively. No `require()`.

Imports must follow this order, separated by blank lines:

1. **Node built-ins** (e.g., `node:fs`, `node:path`)
2. **External packages** (e.g., `zod`, `@modelcontextprotocol/sdk`, `undici`)
3. **Local modules** (relative imports)

### Rules

- Use explicit `.js` extensions in all relative imports: `import { foo } from "./utils.js"`.
- Prefer named exports over default exports.
- Use `import type` for type-only imports (required by `isolatedModules: true`; `verbatimModuleSyntax` is recommended as a future enhancement).

```typescript
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { extractVideoId } from "./utils.js";
import type { TranscriptSegment } from "./types.js";
```

---

## Error Handling

- Throw descriptive `Error` instances with clear messages.
- Use specific error classes for distinct failure modes when appropriate.
- MCP tool handlers must catch errors and return user-friendly error responses using `isError: true` in the tool result.
- Never swallow errors silently. Always log or propagate.
- Use early returns for guard clauses.
- For stdio MCP servers, use `console.error()` for logging -- never `console.log()` (stdout is the transport).

```typescript
export function extractVideoId(input: string): string {
  const match = input.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (!match) {
    throw new Error(`Could not extract video ID from: ${input}`);
  }
  return match[1];
}
```

### MCP Tool Error Pattern

```typescript
async (args, ctx) => {
  try {
    const result = await fetchTranscript(args.url);
    return { content: [{ type: "text", text: result }] };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: message }],
      isError: true,
    };
  }
}
```

---

## Patterns & Architecture

### Project Architecture

The server follows a layered architecture:

```
Entry (index.ts) -> Server Factory (server.ts) -> Core Logic (transcript.ts)
                                                   Shared Types (types.ts)
                                                   Utilities (utils.ts)
                                                    Caching (cache.ts) (planned — not yet implemented)
```

- **`index.ts`**: Entry point. Creates the MCP server, sets up stdio transport, connects.
- **`server.ts`**: Factory function `createServer()` that instantiates `McpServer` and registers tools.
- **`transcript.ts`**: Core transcript fetching logic with dual-strategy (InnerTube API primary, HTML scrape fallback).
- **`types.ts`**: Shared TypeScript interfaces (`TranscriptSegment`, `TranscriptResult`, `CaptionTrack`).
- **`utils.ts`**: Utility functions (video ID extraction, HTML entity decoding).
- **`cache.ts`** (planned — not yet implemented): Transcript caching using `env-paths` for OS-appropriate directories.

### MCP Server Patterns

- Register tools via `server.registerTool()` (not the deprecated `server.tool()`).
- Use Zod schemas for input validation: pass a plain object of Zod fields as `inputSchema` (not `z.object()`).
- Tool handlers are async and return `{ content: [{ type: "text", text: "..." }] }`.
- Use `.describe()` on Zod schema fields to document parameters for LLMs.
- Keep tool descriptions concise but informative (they are shown to LLMs during tool discovery).

```typescript
server.registerTool("get_transcript", {
  description: "Fetch the transcript of a YouTube video",
  inputSchema: {
    url: z.string().describe("YouTube video URL or video ID"),
    lang: z.string().optional().describe("Language code (e.g., 'en')"),
    plain: z.boolean().optional().describe("Return plain text without timestamps"),
  },
}, async ({ url, lang, plain }) => {
  // handler implementation
  return { content: [{ type: "text", text: transcript }] };
});
```

### Zod v4 Patterns

- Import: `import { z } from "zod"` (Zod v4 in this project is imported via the standard `"zod"` path).
- Define schemas at module level for reuse (not inside functions).
- Use `PascalCase` + `Schema` suffix for naming.
- `z.object()` strips unknown keys by default in v4; use `.passthrough()` to preserve them.
- Use `.strict()` to throw on unknown keys (defense against mass assignment).
- Use `safeParse` at API boundaries for graceful error handling; `parse` internally when data is trusted.
- Validate only at boundaries -- do not re-validate trusted internal data.

### Dependency Guidelines

- Use `undici` for HTTP requests. Do not use Node `http` module.
- Use `env-paths` for OS-appropriate cache/config directories.
- Use `zod` for all runtime validation and schema definitions.
- Minimize dependencies -- prefer standard library and Bun built-ins.

### Transcript Fetching Strategy

The transcript fetcher uses a dual-strategy approach:

1. **Primary**: InnerTube ANDROID API (`POST /youtubei/v1/player`) -- bypasses consent pages and age restrictions.
2. **Fallback**: HTML page scraping (`GET /watch?v=...`) -- extracts `ytInitialPlayerResponse` from page source.

Both strategies extract `captionTracks` from the player response, then fetch the transcript XML from the track's `baseUrl`. Two XML formats are supported:
- **Classic**: `<text start="..." dur="...">...</text>`
- **SRV3**: `<p t="..." d="...">...</p>` (milliseconds)
