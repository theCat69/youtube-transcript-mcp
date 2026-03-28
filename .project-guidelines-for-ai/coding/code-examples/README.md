# Code Examples

This folder holds example code snippets that AI agents should follow when implementing features in this project.

## Purpose

Developers should add representative code examples here that demonstrate the project's established patterns, conventions, and idioms. AI agents will reference these examples to maintain consistency when generating or modifying code.

## Expected Example Types

Given this project's tech stack, examples should cover:

- **TypeScript (strict mode, ESM)**: Function signatures, type definitions, interface patterns, Zod schema definitions and type inference.
- **Bun runtime**: File operations, environment access, build configuration.
- **@modelcontextprotocol/sdk v1.x**: Tool registration with `server.registerTool()`, input/output schemas, error handling in tool handlers, transport setup.
- **Zod v4**: Schema definition patterns, `safeParse` vs `parse`, custom refinements, `.describe()` usage for MCP tool parameters.
- **undici**: HTTP request patterns, response handling, error handling for network failures.
- **Vitest**: Test structure (`describe`/`it`/`expect`), mocking with `vi.fn()` and `vi.mock()`, async test patterns, parameterized tests with `it.each()`.

## How to Add Examples

1. Create a Markdown file named after the pattern or concept (e.g., `mcp-tool-registration.md`, `zod-schema-patterns.md`).
2. Include a brief description of the pattern.
3. Provide a complete, runnable code snippet that follows the project's coding guidelines.
4. Highlight any non-obvious conventions (e.g., `.js` extensions in imports, `isError: true` for MCP errors).

## Existing Project Patterns

Refer to `../coding-guidelines.md` for the full coding style guide. Key patterns to exemplify:

- MCP tool registration with Zod input schemas (plain object of fields, not `z.object()`)
- Dual-strategy transcript fetching (InnerTube + HTML scrape)
- Error handling with `isError: true` in MCP tool results
- Co-located test files with `vi.mock()` for HTTP mocking
- HTML entity decoding for transcript text
