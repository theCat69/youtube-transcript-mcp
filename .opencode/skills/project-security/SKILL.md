---
name: project-security
description: Project-specific security guidelines for secrets, input validation, dependencies, auth, and common vulnerabilities
---

# Security Guidelines

Security best practices for this YouTube Transcript MCP server. This project handles external HTTP requests to YouTube and exposes tools via the MCP protocol, making input validation and network security critical.

---

## Secrets Management

- **Never hardcode secrets** (API keys, tokens, credentials) in source code.
- Store secrets in `.env` files locally (gitignored by default).
- Access via `Bun.env` or `process.env`. Both are equivalent in Bun.
- **Never include environment variables or secrets** in error messages, logs, or MCP tool responses.
- Do not commit `.env`, `credentials*.json`, `*.pem`, or `*.key` files (enforced by `.gitignore`).

### MCP-Specific

- For stdio transport servers, secrets are only accessible to the MCP client process that started the server.
- Never expose environment variable values in tool responses, even on error.
- If implementing HTTP transport in the future, use cryptographically secure random session IDs (never predictable or sequential IDs).

---

## Input Validation

All external input must be validated at the boundary using Zod schemas.

### Current Security Measures

This project implements:

- **URL hostname allowlist**: Only `*.youtube.com` and `*.google.com` domains are accepted.
- **HTTPS-only**: Reject non-HTTPS URLs.
- **Input length cap**: Maximum 2048 characters for URL input.
- **Response size cap**: Maximum 5MB for HTTP responses.
- **Zero redirects**: `maxRedirections: 0` on all undici requests (prevents redirect-based SSRF).
- **CAPTCHA detection**: Detect and report YouTube CAPTCHA/rate-limiting pages (`class="g-recaptcha"`).
- **Track name sanitization**: Strip non-alphanumeric characters from language names in error messages.

### Zod Validation Rules

- **Always validate** all tool inputs with Zod schemas at the MCP tool boundary.
- Use `.string().max(limit)` to prevent memory exhaustion on unbounded strings.
- Use `z.enum()` or `z.literal()` for restricted value sets instead of open `z.string()`.
- Use `.strict()` on `z.object()` to reject unexpected properties (defense against mass assignment).
- Avoid `z.any()` and `z.unknown()` at boundaries; be as specific as possible.
- Never trust client-provided data even after Zod parsing; Zod validates shape, not intent.
- **Zod v4 note**: Use `z.ZodType` (not `z.ZodTypeAny`) as a generic constraint.

### URL Validation

```typescript
// Always validate URL hostnames before making requests
function isAllowedHost(url: string): boolean {
  const parsed = new URL(url);
  return (
    parsed.protocol === "https:" &&
    (parsed.hostname.endsWith(".youtube.com") ||
      parsed.hostname.endsWith(".google.com"))
  );
}
```

---

## Dependency Security

- **Pin all dependencies** in `package.json` with exact or caret ranges.
- **Commit the lockfile** (`bun.lock`) for reproducible builds.
- Audit dependencies regularly: `bunx npm-audit` or equivalent.
- Monitor transitive dependencies for known vulnerabilities.
- Minimize dependencies — prefer standard library and Bun built-ins.
- Review new dependencies before adding: check maintenance status, download counts, and known issues.

### undici Security Notes

- CVE-2026-1525 (HTTP Request Smuggling): Affects undici `<6.24.0` or `>=7.0.0-alpha.1 <7.24.0`. Ensure `undici >= 7.24.6` is used (pinned in `package.json`).
- Never manually construct duplicate `Content-Length` headers with differing casing.
- Always consume or cancel response bodies to prevent connection pool exhaustion.
- Always set `signal: AbortSignal.timeout(ms)` — undici has no default request timeout.

---

## Authentication & Authorization

This project currently uses **stdio transport**, which limits access to the process that started the server (typically an MCP client like Claude Desktop). No authentication is needed for stdio transport.

### MCP Security Considerations for Future HTTP Transport

If HTTP transport is added:

- **Session IDs**: Use cryptographically secure random values (`crypto.randomUUID()`). Never use predictable or sequential IDs.
- **OAuth**: Validate redirect URIs with exact string matching (no wildcards). Request only minimum necessary scopes.
- **Token validation**: Never accept tokens not issued for this specific server (prevents token passthrough attacks).
- **Rate limiting**: Implement rate limiting on tool invocations to prevent abuse.

---

## Common Vulnerabilities

### MCP Ecosystem Threats (2026 Audit Findings)

Based on AgentAudit findings (118 findings across 68 MCP packages: 5 critical, 9 high, 63 medium, 41 low):

1. **Unsanitized input in shell commands** (Critical/High):
   - Never pass user input to shell commands unsanitized.
   - Use argument arrays (`Bun.spawn(["cmd", arg])`) instead of string interpolation.
   - This project does not execute shell commands, but guard against future additions.

2. **Environment variable leakage** (Medium):
   - Never include `process.env` or `Bun.env` values in error messages, logs, or LLM-visible tool responses.
   - Sanitize error messages before returning them to the MCP client.

3. **Overly broad file system access** (Medium):
   - Implement least privilege: only access needed file paths.
   - Do not expose arbitrary file system access through MCP tools.

4. **Missing input validation** (Low):
   - All tool inputs must be validated with Zod schemas at the MCP boundary.
   - Enforce length limits, format validation, and type checking.

5. **Dependency chain risks** (Medium):
   - Audit transitive dependencies regularly.
   - Pin dependencies and use the committed `bun.lock`.

### SSRF Prevention

This server makes HTTP requests to YouTube on behalf of the user. SSRF prevention is critical:

- **Hostname allowlist**: Only allow requests to `*.youtube.com` and `*.google.com`.
- **Protocol restriction**: HTTPS only. Reject any `http://` URLs.
- **No URL redirects**: Use `maxRedirections: 0` on all undici requests to prevent redirect-based SSRF (an allowed YouTube URL could redirect to an internal network address).
- **Response size limits**: Cap response body size at 5MB to prevent resource exhaustion.
- **Private IP blocking**: Never allow requests to private IP ranges (10.x, 172.16-31.x, 192.168.x, 127.x, ::1, 169.254.x).
- **Timeout**: Always set `signal: AbortSignal.timeout(ms)` to prevent slow-loris / connection-hang attacks.

### Error Sanitization Pattern

Errors are sanitized before returning to MCP clients using a `USER_SAFE_PREFIXES` allowlist. Only errors whose messages start with a known-safe prefix are returned verbatim; all others produce a generic message:

```typescript
const USER_SAFE_PREFIXES = [
  "Could not find transcript",
  "No captions available",
  "Rate limited",
  // ... other safe prefixes
];

function sanitizeErrorMessage(message: string): string {
  const isSafe = USER_SAFE_PREFIXES.some((prefix) => message.startsWith(prefix));
  return isSafe ? message : "An unexpected error occurred. Please try again.";
}
```

### YouTube-Specific Security

- **Rate limiting detection**: Check for CAPTCHA pages (`class="g-recaptcha"`) and report them clearly.
- **HTML parsing safety**: When parsing YouTube HTML responses, use regex extraction via brace-counting (never `eval()` or `Function()`). This prevents code injection.
- **Consent pages**: The InnerTube ANDROID approach bypasses EU consent pages by design — document this for users.
- **Prompt injection risk**: Transcript content is external, untrusted data from YouTube. The content could theoretically contain embedded prompt injection attempts. Label transcript output as data, not instructions.

### Confused Deputy Problem

MCP servers can be exploited as confused deputies:

- Validate that all operations are appropriate for the tool's intended purpose.
- Do not allow tool inputs to influence which system resources are accessed beyond the tool's scope.
- The `get_transcript` tool should only ever fetch YouTube transcript URLs — enforce this strictly.

---

## Security Checklist for New Features

When implementing new features, verify:

- [ ] All external inputs are validated with Zod schemas at the MCP tool boundary.
- [ ] No secrets or environment variables are exposed in responses or logs.
- [ ] HTTP requests only go to allowlisted hosts (`*.youtube.com`, `*.google.com`) over HTTPS.
- [ ] `maxRedirections: 0` is set on all undici requests.
- [ ] Response sizes are bounded (5MB cap).
- [ ] Error messages are user-friendly and sanitized via `USER_SAFE_PREFIXES` before returning.
- [ ] No shell command execution with user-provided input.
- [ ] New dependencies are reviewed and audited for known vulnerabilities.
- [ ] File system access is limited to intended directories.
- [ ] `console.log()` is not used anywhere (stdout = MCP transport).
