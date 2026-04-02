---
name: project-build
description: Project-specific build commands, prerequisites, environment setup, and CI/CD pipeline
---

# Build Guidelines

This project uses **Bun** as the runtime, package manager, and bundler. TypeScript 6.x is used with strict mode and ESM modules.

---

## Prerequisites

- **Bun**: Latest stable version (runtime, package manager, bundler). Required — Node.js is NOT required for running the project.
- **TypeScript**: v6.0.2+ (installed as dev dependency; used for type checking only — Bun handles execution directly).

Install Bun:

```bash
curl -fsSL https://bun.sh/install | bash
```

---

## Environment Setup

1. **Install dependencies**:
   ```bash
   bun install
   ```
   This reads `bun.lock` (committed lockfile) for reproducible installs.

2. **Environment variables**: Access via `Bun.env` or `process.env`. Never hardcode secrets. Store in `.env` files locally (gitignored by default).

3. **Lockfile**: `bun.lock` must be committed for reproducible builds. Use `--frozen-lockfile` in CI.

---

## Build Commands

| Command | Description |
|---|---|
| `bun install` | Install all dependencies |
| `bun tsc --noEmit` | Type-check without emitting files (or `bun run typecheck`) |
| `bun run build` | Build for production (outputs to `dist/`) |
| `bun run src/index.ts` | Run the MCP server locally (stdio transport) |
| `bun vitest run` | Run all tests (or `bun run test`) |
| `bun vitest` | Run tests in watch mode (or `bun run test:watch`) |
| `bun vitest run --coverage` | Run tests with code coverage (or `bun run test:coverage`) |

### Build for Production

The build is orchestrated by `scripts/build.ts`, which uses Bun's bundler:

```bash
bun run build
# or directly:
bun run scripts/build.ts
```

Output goes to `dist/index.js` (gitignored). The build targets the `node` runtime to maximize portability, adds a `#!/usr/bin/env node` shebang banner.

### Type Checking

Type checking is separate from execution. Bun runs TypeScript directly without compiling:

```bash
bun tsc --noEmit
```

Always run type checking before committing to catch type errors early.

### Pre-Publish Pipeline

The `prepublish` script runs automatically on `npm publish`:

```bash
bun run typecheck && bun run test && bun run build
```

---

## Development Server

This is an MCP server using **stdio transport** (not HTTP). To run locally:

```bash
bun run src/index.ts
```

The server communicates via stdin/stdout using JSON-RPC.

**Critical**: Use `console.error()` for all logging — never `console.log()`. stdout is reserved for the MCP transport; any output to stdout will corrupt the JSON-RPC protocol.

### Testing with an MCP Client

Configure your MCP client (e.g., Claude Desktop, VS Code Copilot) to use the server:

```json
{
  "mcpServers": {
    "youtube-transcript": {
      "command": "bun",
      "args": ["run", "src/index.ts"]
    }
  }
}
```

For the production build:

```json
{
  "mcpServers": {
    "youtube-transcript": {
      "command": "node",
      "args": ["dist/index.js"]
    }
  }
}
```

---

## CI/CD Pipeline

No CI/CD is currently configured. When setting it up:

### Recommended CI Steps (GitHub Actions)

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: oven-sh/setup-bun@v2
  - run: bun install --frozen-lockfile
  - run: bun tsc --noEmit
  - run: bun vitest run --coverage
  - run: bun run build
```

### CI Command Sequence

1. `bun install --frozen-lockfile` — reproducible install (fails if lockfile is out of sync).
2. `bun tsc --noEmit` — type-check the entire codebase.
3. `bun vitest run --coverage` — run tests with 80% coverage threshold enforcement.
4. `bun run build` — verify the production bundle compiles successfully.

---

## Bun-Specific Notes

- Bun runs `.ts` files directly without compilation. The project uses `.js` extensions in import paths (e.g., `import { foo } from "./utils.js"`), which work with `moduleResolution: "bundler"` in `tsconfig.json`.
- Use `Bun.file()` and `Bun.write()` for fast file I/O operations.
- Use `Bun.spawn()` for subprocess management (not `child_process.exec()`).
- Bun uses `bun.lock` (not `package-lock.json` or `yarn.lock`).
- Build with `--target node` to avoid Bun-specific runtime dependencies in the production bundle if portability is needed.
- `Bun.env` and `process.env` are equivalent in Bun.
