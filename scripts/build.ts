/**
 * Production build script.
 * Uses Bun's bundler API to produce a single Node.js-compatible bundle.
 * The `banner` option prepends `#!/usr/bin/env node` so the file is
 * directly executable when npm creates a bin symlink on Linux/macOS.
 */
const result = await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  target: "node",
  banner: "#!/usr/bin/env node",
});

if (!result.success) {
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

const outputs = result.outputs.map((o) => o.path).join(", ");
console.error(`Build complete: ${outputs}`);
