# Security Guidelines

Security best practices for this YouTube Transcript MCP server. This project handles external HTTP requests to YouTube and exposes tools via the MCP protocol, making input validation and network security critical.

---

## Secrets Management

- **Never hardcode secrets** (API keys, tokens, credentials) in source code.
- Store secrets in `.env` files locally (gitignored by default).
- Access via `Bun.env` or `process.env`.
- **Never include environment variables or secrets** in error messages, logs, or MCP tool responses.
- Do not commit `.env`, `credentials*.json`, `*.pem`, or `*.key` files (enforced by `.gitignore`).

### MCP-Specific

- For stdio transport servers, secrets are only accessible to the MCP client process.
- Never expose environment variable values in tool responses, even on error.
- If implementing HTTP transport in the future, use cryptographically secure random session IDs.

---

## Input Validation

All external input must be validated at the boundary using Zod schemas.

### Current Security Measures

This project implements:

- **URL hostname allowlist**: Only `youtube.com` and `google.com` domains are accepted.
- **HTTPS-only**: Reject non-HTTPS URLs.
- **Input length cap**: Maximum 2048 characters for URL input.
- **Response size cap**: Maximum 5MB for HTTP responses.
- **CAPTCHA detection**: Detect and report YouTube CAPTCHA/rate-limiting pages.

### Zod Validation Rules

- **Always validate** all tool inputs with Zod schemas at the MCP boundary.
- Use `.string().max(limit)` to prevent memory exhaustion on unbounded strings.
- Use `z.enum()` or `z.literal()` for restricted value sets instead of open `z.string()`.
- Use `.strict()` on `z.object()` to reject unexpected properties (defense against mass assignment).
- Avoid `z.any()` and `z.unknown()` at boundaries; be as specific as possible.
- Never trust client-provided data even after parsing; Zod validates shape, not intent.

### URL Validation

```typescript
// Always validate URL hostnames before making requests
function isAllowedHost(url: string): boolean {
  const parsed = new URL(url);
  return parsed.protocol === "https:" &&
    (parsed.hostname.endsWith(".youtube.com") ||
     parsed.hostname.endsWith(".google.com"));
}
```

---

## Dependency Security

- **Pin all dependencies** in `package.json` with exact or caret ranges.
- **Commit the lockfile** (`bun.lock`) for reproducible builds.
- Audit dependencies regularly: `bunx npm-audit` or equivalent.
- Monitor transitive dependencies for known vulnerabilities.
- Minimize dependencies -- prefer standard library and Bun built-ins.
- Review new dependencies before adding them: check maintenance status, download counts, and known issues.

---

## Authentication & Authorization

This project currently uses **stdio transport**, which limits access to the process that started the server (typically an MCP client like Claude Desktop).

### MCP Security Considerations

If HTTP transport is added in the future:

- **Session IDs**: Use cryptographically secure random values. Never use predictable or sequential IDs.
- **OAuth**: Validate redirect URIs with exact string matching (no wildcards).
- **Token scope**: Request only the minimum necessary scopes. Never accept tokens not issued for this server.
- **Rate limiting**: Implement rate limiting on tool invocations to prevent abuse.

---

## Common Vulnerabilities

### MCP Ecosystem Threats (2026 Audit Findings)

Based on AgentAudit findings (118 findings across 68 MCP packages):

1. **Unsanitized input in shell commands** (Critical/High):
   - Never pass user input to shell commands unsanitized.
   - Use argument arrays (e.g., `Bun.spawn(["cmd", arg])`) instead of string interpolation.
   - This project does not execute shell commands, but guard against future additions.

2. **Environment variable leakage** (Medium):
   - Never include `process.env` values in error messages, logs, or LLM-visible tool responses.
   - Sanitize error messages before returning them to the MCP client.

3. **Overly broad file system access** (Medium):
   - Implement least privilege: only access needed file paths (cache directory via `env-paths`).
   - Do not expose arbitrary file system access through MCP tools.

4. **Missing input validation** (Low):
   - All tool inputs must be validated with Zod schemas.
   - Enforce length limits, format validation, and type checking.

5. **Dependency chain risks** (Medium):
   - Audit transitive dependencies regularly.
   - Pin dependencies and use lockfiles.

### SSRF Prevention

This server makes HTTP requests to YouTube on behalf of the user. SSRF prevention is critical:

- **Hostname allowlist**: Only allow requests to `*.youtube.com` and `*.google.com`.
- **Protocol restriction**: HTTPS only.
- **No URL redirects to internal networks**: Validate the final URL after any redirects.
- **Redirect-based SSRF prevention**: Use `maxRedirections: 0` on `undici` HTTP requests to disable automatic redirects, or revalidate the hostname against the allowlist after each redirect. This prevents attackers from using an allowed YouTube URL that redirects to an internal network address.
- **Response size limits**: Cap response body size to prevent resource exhaustion.

### Confused Deputy Problem

MCP servers can be exploited as confused deputies:

- Validate that all operations are appropriate for the tool's intended purpose.
- Do not allow tool inputs to influence which system resources are accessed beyond the tool's scope.
- Log suspicious patterns (e.g., unusual video IDs, repeated failures).

### YouTube-Specific Security

- **Rate limiting detection**: Check for CAPTCHA pages (`class="g-recaptcha"`) and report them clearly.
- **User-Agent management**: Use realistic User-Agent strings but do not impersonate specific users.
- **Consent pages**: The InnerTube ANDROID approach bypasses EU consent pages by design.
- **HTML parsing safety**: When parsing YouTube HTML responses, use regex extraction (not `eval()` or `Function()`) to prevent code injection.

---

## Security Checklist for New Features

When implementing new features, verify:

- [ ] All external inputs are validated with Zod schemas at the boundary.
- [ ] No secrets or environment variables are exposed in responses or logs.
- [ ] HTTP requests only go to allowlisted hosts over HTTPS.
- [ ] Response sizes are bounded.
- [ ] Error messages are user-friendly and do not leak internal details.
- [ ] No shell command execution with user-provided input.
- [ ] New dependencies are reviewed and audited.
- [ ] File system access is limited to intended directories.
