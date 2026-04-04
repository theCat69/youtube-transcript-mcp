---
name: project-code-examples
description: Catalog of project code examples — what patterns exist and where to find them in .code-examples-for-ai/
---

# Project Code Examples

These examples demonstrate the coding patterns used in this project. Each file contains a real
snippet extracted directly from the source code, annotated with the rules and constraints that apply.

## Location

`.code-examples-for-ai/`

## Available Examples

| File | Description |
|---|---|
| `mcp-tool-registration.md` | `server.registerTool()` with plain Zod field `inputSchema`, `sanitizeErrorMessage()`, and `isError: true` pattern |
| `error-handling.md` | `USER_SAFE_PREFIXES` allowlist, `sanitizeErrorMessage()`, `console.error()` only, `isError: true` return |
| `http-fetch-undici.md` | Safe undici usage: HTTPS-only, `maxRedirections: 0`, `AbortSignal.timeout()`, 5 MB response cap, hostname allowlist |
| `types-interfaces.md` | TypeScript `interface` definitions — PascalCase naming, optional fields, `import type` usage |
| `utility-functions.md` | Pure utility functions — `function` declarations, `UPPER_SNAKE_CASE` constants, explicit return types |
| `vitest-unit-test.md` | `describe`/`it.each` parameterized tests, AAA pattern, `toThrow` assertions, `restoreMocks` behavior |
| `mcp-integration-test.md` | `InMemoryTransport.createLinkedPair()`, real `Client`, `vi.mock()`, `client.callTool()` assertions |

## Maintenance

This index is maintained by the AI. Developers may add entries manually. One file per pattern.
When a new coding pattern is introduced that is not yet represented, create a new `.md` file in
`.code-examples-for-ai/` and add a row to the table above.
