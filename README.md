# youtube-transcript-mcp

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that fetches transcripts from YouTube videos.

No installation required — use it directly via `npx` in any MCP-compatible client.

## Usage

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "youtube-transcript": {
      "command": "npx",
      "args": ["-y", "youtube-transcript-mcp"]
    }
  }
}
```

### OpenCode

Edit `~/.config/opencode/opencode.json` (global) or `opencode.json` at your project root (project-scoped):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "youtube-transcript": {
      "type": "local",
      "command": ["npx", "-y", "youtube-transcript-mcp"],
      "enabled": true
    }
  }
}
```

Both files use the same schema and are merged — the project file overrides the global one for conflicting keys.

### Other MCP clients

Any client that supports stdio MCP servers can use the same pattern:

```json
{
  "command": "npx",
  "args": ["-y", "youtube-transcript-mcp"]
}
```

## Available tools

### `get_transcript`

Fetches the transcript of a YouTube video.

| Parameter | Type    | Required | Description                                                              |
|-----------|---------|----------|--------------------------------------------------------------------------|
| `url`     | string  | ✅        | YouTube video URL or video ID (e.g. `https://youtu.be/dQw4w9WgXcQ`)     |
| `lang`    | string  | ❌        | Language code (e.g. `en`, `fr`, `es`). Defaults to the video's primary language. |
| `plain`   | boolean | ❌        | When `true`, returns plain text without timestamps. Default: `false`.     |

**Example output (default, with timestamps):**

```
[00:00] Never gonna give you up
[00:03] Never gonna let you down
[00:06] Never gonna run around and desert you
```

**Example output (`plain: true`):**

```
Never gonna give you up Never gonna let you down Never gonna run around and desert you
```

## Development

### Prerequisites

- [Bun](https://bun.sh) >= 1.x
- Node.js >= 18.x

### Setup

```bash
git clone https://github.com/your-username/youtube-transcript-mcp.git
cd youtube-transcript-mcp
bun install
```

### Commands

| Command                  | Description                              |
|--------------------------|------------------------------------------|
| `bun run start`          | Run the MCP server locally (stdio)       |
| `bun run build`          | Compile to `dist/`                       |
| `bun run typecheck`      | Type-check without emitting              |
| `bun run test`           | Run all tests                            |
| `bun run test:coverage`  | Run tests with coverage report           |

## Versioning

This project follows [Semantic Versioning](https://semver.org/).

| Command               | When to use                          | Example             |
|-----------------------|--------------------------------------|---------------------|
| `npm version patch`   | Bug fix, no API change               | `1.0.0` → `1.0.1`   |
| `npm version minor`   | New feature, backward compatible     | `1.0.0` → `1.1.0`   |
| `npm version major`   | Breaking change                      | `1.0.0` → `2.0.0`   |

Each command automatically:
1. Updates `version` in `package.json`
2. Creates a git commit (`chore: v1.0.1`)
3. Creates a git tag (`v1.0.1`)

> **Note:** `src/server.ts` contains a hardcoded `version: "1.0.0"` in the MCP server metadata. Update it manually to match `package.json` when bumping versions.

## Publishing

### First time

```bash
# 1. Create an account at https://www.npmjs.com/signup
# 2. Login
npm login

# 3. Dry run — verify what will be published (no side effects)
npm publish --dry-run

# 4. Publish
npm publish
```

### Subsequent releases

```bash
# 1. Bump version (choose one)
npm version patch   # bug fix
npm version minor   # new feature
npm version major   # breaking change

# 2. Push commits and tags to remote
git push && git push --tags

# 3. Publish
npm publish
```

The `prepublishOnly` hook runs automatically before each `npm publish` and will:
- Type-check the source (`bun run typecheck`)
- Run the test suite (`bun run test`)
- Rebuild `dist/` (`bun run build`)

Publishing will be blocked if any of these steps fail.

## License

MIT
