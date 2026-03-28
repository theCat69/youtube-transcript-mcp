# Building Guidelines

This project uses **Bun** as the runtime, package manager, and bundler. TypeScript 6.x is used with strict mode and ESM modules.

---

## Prerequisites

- **Bun**: Latest stable version (runtime, package manager, bundler).
- **Node.js**: Not required for running the project, but may be needed for some dev tools.
- **TypeScript**: v6.0.2+ (installed as dev dependency; used for type checking only -- Bun handles execution).

---

## Environment Setup

1. **Install Bun** (if not already installed):
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

2. **Install dependencies**:
   ```bash
   bun install
   ```
   This generates `bun.lock` (auto-generated lockfile). The lockfile should be committed for reproducible builds.

3. **Environment variables**: Access via `Bun.env` or `process.env`. Never hardcode secrets. Store in `.env` files locally (gitignored by default).

---

## Build Commands

| Command | Description |
|---|---|
| `bun install` | Install all dependencies |
| `bun tsc --noEmit` | Type-check without emitting files |
| `bun run build` | Build for production (outputs to `dist/`) |
| `bun run src/index.ts` | Run the MCP server locally (stdio transport) |
| `bun vitest run` | Run all tests |
| `bun vitest` | Run tests in watch mode |
| `bun vitest run --coverage` | Run tests with code coverage |

### Build for Production

The build command bundles the entry point for Node.js target:

```bash
bun build src/index.ts --outdir dist --target node
```

Output goes to `dist/` (gitignored).

### Type Checking

Type checking is separate from execution. Bun runs TypeScript directly without compiling, but `tsc --noEmit` validates types:

```bash
bun tsc --noEmit
```

Run this before committing to catch type errors.

---

## Development Server

This is an MCP server using **stdio transport** (not HTTP). To run locally:

```bash
bun run src/index.ts
```

The server communicates via stdin/stdout using JSON-RPC. For development:

- Use `console.error()` for logging (stdout is reserved for MCP transport).
- Never use `console.log()` in the server -- it will corrupt the transport.
- Use `tsx` for TypeScript execution during development if needed: `bunx tsx src/index.ts`.

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

---

## CI/CD Pipeline

No CI/CD is currently configured. When setting up CI:

1. **Install**: `bun install` (use `--frozen-lockfile` in CI for reproducible builds).
2. **Type-check**: `bun tsc --noEmit`.
3. **Test**: `bun vitest run`.
4. **Coverage**: `bun vitest run --coverage` with threshold enforcement.
5. **Build**: `bun run build` to verify production bundle compiles.

### Recommended CI Steps

```yaml
# Example GitHub Actions workflow
steps:
  - uses: oven-sh/setup-bun@v2
  - run: bun install --frozen-lockfile
  - run: bun tsc --noEmit
  - run: bun vitest run --coverage
  - run: bun run build
```

---

## Bun-Specific Notes

- Bun runs `.ts` files directly without compilation. The project uses `.js` extensions in import paths (e.g., `import { foo } from "./utils.js"`), which work with `moduleResolution: "bundler"` in `tsconfig.json`.
- Use `Bun.file()` and `Bun.write()` for fast file I/O operations.
- Use `Bun.spawn()` for subprocess management (not `child_process.exec()`).
- Bun uses `bun.lock` (not `package-lock.json` or `yarn.lock`).
- Build with `--target node` to avoid Bun-specific runtime dependencies in production if portability is needed.
