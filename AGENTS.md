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

## Detailed Guidelines

All detailed coding, building, testing, documentation, and security guidelines have been
organized into the `.project-guidelines-for-ai/` directory:

- **[Coding Guidelines](.project-guidelines-for-ai/coding/coding-guidelines.md)** — Code style, naming conventions, import ordering, error handling, architecture patterns, MCP and Zod patterns.
- **[Code Examples](.project-guidelines-for-ai/coding/code-examples/README.md)** — Example code snippets demonstrating project patterns.
- **[Building Guidelines](.project-guidelines-for-ai/building/building-guidelines.md)** — Prerequisites, environment setup, build commands, CI/CD pipeline.
- **[Testing Guidelines](.project-guidelines-for-ai/testing/testing-guidelines.md)** — Test framework, file naming, writing tests, mocking, coverage, running tests.
- **[Documentation Guidelines](.project-guidelines-for-ai/documentation/documentation-guidelines.md)** — TSDoc format, README standards, API docs, changelog.
- **[Security Guidelines](.project-guidelines-for-ai/security/security-guidelines.md)** — Secrets management, input validation, dependency security, MCP-specific threats, SSRF prevention.

AI agents should read the relevant guideline files before implementing features.
