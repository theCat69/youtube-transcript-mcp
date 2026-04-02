---
name: project-documentation
description: Project-specific documentation standards for code, README, API docs, and changelog
---

# Documentation Guidelines

Standards for documenting code and maintaining project documentation in this TypeScript/Bun MCP server project.

---

## Code Documentation

### Format: TSDoc

Use TSDoc (`/** */` comments) for all exported functions, classes, interfaces, and types.

### Required Tags

| Tag | Usage |
|---|---|
| `@param` | Document each parameter with name and description |
| `@returns` | Describe the return value |
| `@throws` | Document error conditions and what errors are thrown |
| `@example` | Provide runnable code snippets |
| `@see` | Cross-reference related functions or types |

### Example

```typescript
/**
 * Extracts a YouTube video ID from a URL or direct ID string.
 *
 * Supports standard YouTube URLs, short URLs (youtu.be), and bare 11-character IDs.
 *
 * @param input - A YouTube URL or 11-character video ID.
 * @returns The 11-character video ID.
 * @throws {Error} If the input does not contain a valid video ID.
 *
 * @example
 * ```typescript
 * extractVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
 * // => "dQw4w9WgXcQ"
 * ```
 */
export function extractVideoId(input: string): string {
  // implementation
}
```

### When to Document

- **Always document**: Exported functions, interfaces, types, classes, constants.
- **Optional**: Private/internal functions (add comments only if logic is non-obvious).
- **Zod schemas**: Use `.describe()` on schema fields, especially for MCP tool input schemas (descriptions are shown to LLMs).

```typescript
const inputSchema = {
  url: z.string().describe("YouTube video URL or 11-character video ID"),
  lang: z.string().optional().describe("Language code for transcript (e.g., 'en', 'es')"),
};
```

### Inline Comments

- Explain **why**, not **what** (the code should be self-explanatory for "what").
- Use `//` for single-line comments, `/* */` for multi-line blocks.
- Add comments for complex regex patterns, non-obvious logic, and workarounds.

---

## README Format

The project README should include:

1. **Title and description**: What the project does in one sentence.
2. **Installation**: `bun install` and any prerequisites.
3. **Usage**: How to run the MCP server, example client configuration.
4. **Available tools**: List MCP tools with their parameters and expected outputs.
5. **Development**: Build, test, and type-check commands.
6. **Configuration**: Required environment variables (if any).
7. **License**: Project license.

### MCP Tool Documentation

Document each registered MCP tool with:

- Tool name
- Description
- Input parameters (name, type, required/optional, description)
- Example output
- Error cases

---

## API Documentation

This project exposes MCP tools (not REST APIs). Document tools as described in "README Format".

For internal APIs (exported functions between modules):

- Document with TSDoc.
- Include parameter types and return types in the documentation.
- Document error conditions with `@throws`.
- Provide usage examples with `@example` for complex functions.

---

## Changelog

When making changes:

- Write clear, imperative commit messages: `"Add transcript caching"` (not `"Added caching"`).
- Keep commits focused on a single change.
- For significant features or breaking changes, maintain a `CHANGELOG.md` with entries in reverse chronological order.

### Changelog Format (if used)

```markdown
## [Unreleased]

### Added
- Transcript caching for OS-appropriate directories

### Changed
- Improved error messages for invalid video URLs

### Fixed
- HTML entity decoding for special characters in transcripts
```

---

## Bun-Specific Documentation Notes

- Document any Bun-specific APIs used and their deviations from Node.js behavior.
- Include `bun install` and `bun run` commands in all setup instructions.
- Note minimum Bun version requirements if applicable.
- When documenting environment variable access, note that `Bun.env` and `process.env` are equivalent.
