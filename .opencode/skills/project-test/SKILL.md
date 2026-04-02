---
name: project-test
description: Project-specific testing guidelines, test framework conventions, patterns, and coverage requirements
---

# Testing Guidelines

This project uses **Vitest 4.x** with `@vitest/coverage-v8` for testing, running on the Bun runtime.

---

## Test Framework

- **Vitest 4.1.2**: Modern test framework compatible with Bun runtime.
- **Coverage**: `@vitest/coverage-v8` (V8-based coverage — faster than Istanbul).
- **Configuration**: `vitest.config.ts` at project root.
- `restoreMocks: true` is configured globally in `vitest.config.ts` — mocks are auto-restored after each test.

---

## Test Location & File Naming

- **Co-located tests**: Tests live next to their source files in `src/`.
- **Naming**: `<module>.test.ts` (e.g., `utils.ts` → `utils.test.ts`).
- **One test file per module**: Each source file has at most one co-located test file.

```
src/
  utils.ts
  utils.test.ts
  transcript.ts
  transcript.test.ts
  server.ts
  server.test.ts
  cache.ts          (planned — not yet implemented)
  cache.test.ts     (planned — not yet implemented)
```

---

## Writing Tests

### Imports

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
```

### Structure

- Use `describe` blocks to group related tests (typically one per function or feature).
- Nest `describe` blocks for sub-features.
- Test names should read as sentences: `"should extract video ID from standard YouTube URL"`.
- Follow the **AAA pattern** (Arrange-Act-Assert):

```typescript
describe("extractVideoId", () => {
  it("should extract ID from standard YouTube URL", () => {
    // Arrange
    const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

    // Act
    const result = extractVideoId(url);

    // Assert
    expect(result).toBe("dQw4w9WgXcQ");
  });

  it("should throw on invalid input", () => {
    expect(() => extractVideoId("not-a-url")).toThrow();
  });
});
```

### Assertions

| Pattern | Use Case |
|---|---|
| `expect(value).toBe(exact)` | Primitives (strings, numbers, booleans) |
| `expect(value).toEqual(deep)` | Objects and arrays (deep equality) |
| `expect(() => fn()).toThrow(message)` | Synchronous error cases |
| `expect(promise).rejects.toThrow()` | Async error cases |
| `expect(fn).toHaveBeenCalledWith(args)` | Mock verification |
| `expect(value).toMatchInlineSnapshot()` | Complex output verification (prefer inline over external snapshots) |

### Async Testing

Always `await` async operations in tests:

```typescript
it("should fetch transcript successfully", async () => {
  const result = await fetchTranscript("dQw4w9WgXcQ");
  expect(result.segments).toHaveLength(10);
});

it("should reject on network error", async () => {
  await expect(fetchTranscript("invalid")).rejects.toThrow("network error");
});
```

### Parameterized Tests

Use `it.each()` to test multiple input/output combinations:

```typescript
it.each([
  ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
  ["https://youtu.be/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
  ["dQw4w9WgXcQ", "dQw4w9WgXcQ"],
])("should extract ID from %s", (input, expected) => {
  expect(extractVideoId(input)).toBe(expected);
});
```

### Test Independence

- Each test must be independent and isolated — no shared mutable state between tests.
- Use `beforeEach()` for shared setup.
- Use `afterEach()` for cleanup.
- Never rely on test execution order.

---

## Mocking & Fixtures

### HTTP Mocking (undici)

This project mocks `undici` for all HTTP request testing:

```typescript
import { vi } from "vitest";

vi.mock("undici", () => ({
  request: vi.fn(),
}));
```

### Transcript Module Mocking (server tests)

```typescript
vi.mock("./transcript.js", () => ({
  fetchTranscript: vi.fn(),
}));
```

### Mock Reset

`restoreMocks: true` is configured globally in `vitest.config.ts`, so mocks auto-restore after each test. For test-specific reset when needed:

```typescript
beforeEach(() => {
  mockFetchTranscript.mockReset();
});
```

### Integration Tests (server.test.ts)

Use `InMemoryTransport.createLinkedPair()` with a real MCP `Client` to integration-test tool invocations over an in-memory transport — no HTTP involved:

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "./server.js";

const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
const server = createServer();
await server.connect(serverTransport);
const client = new Client({ name: "test-client", version: "0.0.1" });
await client.connect(clientTransport);

const result = await client.callTool({ name: "get_transcript", arguments: { url: "..." } });
```

### Helper Factories

The project uses helper factory functions for test data (established pattern in `transcript.test.ts`):

- `createMockBody(content)`: Creates a mock HTTP response body.
- `createInnerTubeResponse(tracks)`: Creates mock InnerTube API response data.
- `createXmlResponse(xml)`: Creates mock transcript XML.
- `createHtmlResponse(tracks)`: Creates mock YouTube HTML page with embedded player response.

**Prefer creating helper factories over inline test data** for complex objects.

### Mocking Preferences

- **Prefer dependency injection** over module mocking for testability.
- Use `vi.fn()` for standalone mock functions.
- Use `vi.spyOn(object, "method")` for spying on real implementations.
- Use `vi.mock("module")` when dependency injection is not feasible.
- Use `vi.useFakeTimers()` / `vi.useRealTimers()` for time-dependent tests — always restore in `afterEach()`.
- Never use real API keys, secrets, or external services in tests.

---

## Coverage Requirements

Run coverage with:

```bash
bun vitest run --coverage
```

### Enforced Thresholds (vitest.config.ts)

| Metric | Minimum |
|---|---|
| Statements | 80% |
| Branches | 80% |
| Functions | 80% |
| Lines | 80% |

These thresholds are enforced in `vitest.config.ts` and will fail the test run if not met.

Focus on **meaningful coverage** rather than chasing 100%. Prioritize:

- Happy-path behavior
- Error paths (network failures, invalid input, missing data)
- Edge cases (empty responses, special characters, boundary values)
- Security-sensitive code paths (input validation, URL sanitization)

---

## Running Tests

```bash
# Run all tests
bun vitest run

# Run tests in watch mode (during development)
bun vitest

# Run a single test file
bun vitest run src/transcript.test.ts

# Run tests matching a name pattern
bun vitest run -t "should extract video ID"

# Run a specific file with a name pattern
bun vitest run src/transcript.test.ts -t "handles missing captions"

# Run with coverage
bun vitest run --coverage
```

### What to Test

For each module, ensure tests cover:

1. **Valid inputs**: Happy-path behavior with expected data.
2. **Invalid inputs**: Malformed URLs, empty strings, wrong types.
3. **Error handling**: Network failures, timeouts, unexpected responses.
4. **Edge cases**: Empty transcript, special characters, very long inputs, HTML entities.
5. **Security boundaries**: URL validation, input length limits, CAPTCHA detection.
6. **MCP tool results**: Correct `content` array structure, proper `isError: true` on failures.
