<!-- Description: TypeScript interface definitions used for domain types — PascalCase naming, optional fields, inline documentation -->

# TypeScript Interface Definitions

Shared domain types are defined as `interface` in `src/types.ts` and imported with `import type`.
Use `interface` for object shapes; use `type` for unions, intersections, and mapped types.
No `I` prefix on interface names.

```typescript
// src/types.ts

// ✅ PascalCase — no I-prefix
export interface TranscriptSegment {
  text: string;
  start: number;    // seconds (float)
  duration: number; // seconds (float)
}

export interface TranscriptResult {
  videoId: string;
  segments: TranscriptSegment[];
}

export interface CaptionTrack {
  baseUrl: string;
  languageCode: string;
  name: string;
  kind?: string; // "asr" = auto-generated; ✅ optional field with inline doc comment
}
```

Consuming types in another module:

```typescript
// src/transcript.ts

// ✅ import type for type-only symbols (required by isolatedModules:true)
import type {
  CaptionTrack,
  TranscriptResult,
  TranscriptSegment,
} from "./types.js"; // ✅ .js extension on all relative imports
```

## Key Points

- Use `interface` (not `type alias`) for plain object shapes
- PascalCase names — no `I` prefix (e.g., `TranscriptSegment`, not `ITranscriptSegment`)
- Use `?` for truly optional fields; do not use `| undefined` as a substitute
- Add inline `// comment` on optional fields to explain valid values (e.g., `"asr"`)
- Always `export` domain interfaces so they can be reused across modules
- Use `import type` for type-only imports — enforced by `isolatedModules: true`
- Use `.js` extension on all relative import paths (ESM + Bun `moduleResolution: bundler`)
