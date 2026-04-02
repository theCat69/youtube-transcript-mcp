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

## Project Structure

```
src/
  index.ts          # Entry point — MCP server setup & stdio transport
  server.ts         # MCP server definition, tool registrations
  transcript.ts     # Core transcript fetching logic
  types.ts          # Shared TypeScript types/interfaces
  utils.ts          # Utility/helper functions
  cache.ts          # Transcript caching (planned — not yet implemented)
  *.test.ts         # Co-located test files (Vitest)
```

## Quick Reference Commands

```bash
bun install              # Install dependencies
bun tsc --noEmit         # Type-check (no emit)
bun vitest run           # Run all tests
bun vitest run --coverage # Run tests with coverage
bun run src/index.ts     # Run the MCP server locally (stdio transport)
bun run build            # Build for production
```

## Critical Inline Rules

These rules must never be violated — violations break the server or introduce security issues:

- **`console.log()` is FORBIDDEN** — stdout is the MCP stdio transport. Use `console.error()` only.
- **`.js` extensions required** on all relative imports: `import { foo } from "./utils.js"`.
- **`server.registerTool()`** — use this, not the deprecated `server.tool()`.
- **`inputSchema` is a plain object** of Zod fields — NOT `z.object({...})`.
- **Error sanitization**: errors returned to MCP clients must go through `sanitizeErrorMessage()`.
- **HTTPS only** with `maxRedirections: 0` for all undici requests.

## Detailed Guidelines (Skills)

All detailed coding, building, testing, documentation, and security guidelines are in the
`.opencode/skills/` directory (version-controlled, loaded by AI agents via the `skill` tool):

- **[project-coding](.opencode/skills/project-coding/SKILL.md)** — Code style, naming conventions, import ordering, error handling, architecture patterns, MCP and Zod patterns, code examples.
- **[project-build](.opencode/skills/project-build/SKILL.md)** — Prerequisites, environment setup, build commands, CI/CD pipeline.
- **[project-test](.opencode/skills/project-test/SKILL.md)** — Test framework, file naming, writing tests, mocking, coverage requirements, running tests.
- **[project-documentation](.opencode/skills/project-documentation/SKILL.md)** — TSDoc format, README standards, API docs, changelog.
- **[project-security](.opencode/skills/project-security/SKILL.md)** — Secrets management, input validation, dependency security, MCP-specific threats, SSRF prevention, error sanitization.

AI agents should load the relevant skill(s) before implementing features.
