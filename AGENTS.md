# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project Overview

YouTube Transcript Retriever — an MCP (Model Context Protocol) server that fetches
transcripts from YouTube videos. Built with TypeScript, runs on Bun.

## Tech Stack

- **Runtime**: Bun
- **Language**: TypeScript (strict mode, ESM modules)
- **Framework**: `@modelcontextprotocol/sdk` v1.x (MCP server SDK)
- **HTTP**: `undici` (fetch/request client)
- **Validation**: `zod` v4
- **Testing**: Vitest + `@vitest/coverage-v8`
- **Dev tools**: `tsx` (TypeScript execution), `typescript` (type checking)

## Build / Lint / Test Commands

```bash
# Install dependencies
bun install

# Type-check (no emit)
bun tsc --noEmit

# Run all tests
bun vitest run

# Run tests in watch mode
bun vitest

# Run a single test file
bun vitest run src/foo.test.ts

# Run tests matching a name pattern
bun vitest run -t "pattern"

# Run tests with coverage
bun vitest run --coverage

# Run the MCP server locally (stdio transport)
bun run src/index.ts

# Build (if configured)
bun run build
```

### Running a Single Test — Quick Reference

```bash
# By file path (most common)
bun vitest run path/to/file.test.ts

# By test name
bun vitest run -t "should extract video ID"

# Both combined
bun vitest run src/transcript.test.ts -t "handles missing captions"
```

## Project Structure

```
src/
  index.ts          # Entry point — MCP server setup & stdio transport
  server.ts         # MCP server definition, tool registrations
  transcript.ts     # Core transcript fetching logic
  types.ts          # Shared TypeScript types/interfaces
  utils.ts          # Utility/helper functions
  cache.ts          # Transcript caching (uses env-paths for OS dirs)
  *.test.ts         # Co-located test files (Vitest)
```

## Code Style Guidelines

### Imports

- Use ESM `import`/`export` syntax exclusively. No `require()`.
- Use explicit file extensions in relative imports: `import { foo } from "./utils.js"`.
- Order: Node built-ins → external packages → local modules, separated by blank lines.
- Prefer named exports over default exports.

```typescript
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { extractVideoId } from "./utils.js";
import type { TranscriptSegment } from "./types.js";
```

### Formatting

- **Indentation**: 2 spaces.
- **Quotes**: Double quotes for strings.
- **Semicolons**: Always use semicolons.
- **Trailing commas**: Use trailing commas in multi-line constructs.
- **Line length**: Keep lines under 100 characters where practical.
- **Braces**: Opening brace on the same line (K&R style).

### Types

- Use TypeScript strict mode (`"strict": true` in tsconfig).
- Prefer `interface` for object shapes; use `type` for unions, intersections, mapped types.
- Use Zod schemas as the source of truth for runtime validation; infer types with `z.infer<>`.
- Avoid `any`. Use `unknown` when the type is genuinely unknown, then narrow.
- Use `as const` for literal values that should not widen.
- Export types with `export type` when only the type is needed (enables isolatedModules).

```typescript
const VideoIdSchema = z.string().regex(/^[a-zA-Z0-9_-]{11}$/);
type VideoId = z.infer<typeof VideoIdSchema>;

interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}
```

### Naming Conventions

- **Files**: `kebab-case.ts` (e.g., `video-utils.ts`, `transcript-cache.ts`).
- **Variables/functions**: `camelCase`.
- **Classes**: `PascalCase`.
- **Interfaces/Types**: `PascalCase` (no `I` prefix).
- **Constants**: `UPPER_SNAKE_CASE` for true constants, `camelCase` for derived values.
- **Zod schemas**: `PascalCase` with `Schema` suffix (e.g., `VideoIdSchema`).
- **Test files**: Same name as module with `.test.ts` suffix, co-located.

### Error Handling

- Throw descriptive `Error` instances with clear messages.
- Use specific error classes for distinct failure modes when appropriate.
- MCP tool handlers should catch errors and return user-friendly error responses
  (use `isError: true` in the MCP tool result).
- Never swallow errors silently. Always log or propagate.
- Use early returns for guard clauses.

```typescript
export function extractVideoId(input: string): string {
  const match = input.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (!match) {
    throw new Error(`Could not extract video ID from: ${input}`);
  }
  return match[1];
}
```

### Functions

- Prefer `function` declarations for top-level named functions (hoistable, clear intent).
- Use arrow functions for inline callbacks and short expressions.
- Keep functions small and focused — one responsibility.
- Use async/await over raw promises.
- Always type function parameters and return types explicitly for exported functions.

### Testing (Vitest)

- Co-locate tests next to source: `foo.ts` → `foo.test.ts`.
- Use `describe` blocks to group related tests.
- Test names should read as sentences: `"should extract video ID from full URL"`.
- Use `vi.fn()` and `vi.mock()` for mocking. Prefer dependency injection over module mocking.
- Use `beforeEach` for shared setup; avoid shared mutable state between tests.
- Test edge cases: invalid input, network errors, empty responses.

```typescript
import { describe, it, expect } from "vitest";
import { extractVideoId } from "./utils.js";

describe("extractVideoId", () => {
  it("should extract ID from standard YouTube URL", () => {
    expect(extractVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ"))
      .toBe("dQw4w9WgXcQ");
  });

  it("should throw on invalid input", () => {
    expect(() => extractVideoId("not-a-url")).toThrow();
  });
});
```

### MCP Server Patterns

- Register tools via `server.tool()` with Zod schemas for input validation.
- Tool handlers are async — always return `{ content: [...] }` objects.
- Use `text` content type for transcript data.
- Keep tool descriptions concise but informative (they are shown to LLMs).
- Validate all external input at the boundary using Zod.

### Dependencies

- Use `undici` for HTTP requests (YouTube page/API fetching). Do not use Node `http`.
- Use `env-paths` for OS-appropriate cache/config directories.
- Use `zod` for all runtime validation and schema definitions.
- Minimize dependencies — prefer standard library and Bun built-ins.

### Git & Commits

- Write clear, imperative commit messages: "Add transcript caching" not "Added caching".
- Keep commits focused on a single change.
- Do not commit `.env`, credentials, or `node_modules/`.
