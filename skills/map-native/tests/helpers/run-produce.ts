// Test helper: shells the REAL scripts/produce.mjs (real Vite build + real Playwright
// snaps + real Remotion render for "video" — no mocks, matching this repo's testing
// convention) into a fresh tmp outDir and returns that outDir's path. Used by
// produce-single-format.test.ts to assert exactly one VisualFormat's artifacts land on
// disk and none of the others'. Mirrors chart-native's tests/helpers/run-produce.ts,
// adapted to map-native's 3-positional-arg contract (no leading <type> — the config
// itself already carries `type`).
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");

// Runs `bun scripts/produce.mjs <configPath> <outDir> <format>` for real, inheriting
// stdio so a failure's real build/render log shows up in the test output (rather than
// a bare non-zero-exit error). Throws (via execFileSync) if produce.mjs exits
// non-zero — callers that expect a deliberate failure (e.g. an unsupported format)
// should catch it themselves rather than use this happy-path helper.
export async function runProduce(
  sampleDataRelPath: string,
  format: string,
  env: Record<string, string> = {},
): Promise<string> {
  const configPath = join(root, sampleDataRelPath);
  const outDir = mkdtempSync(join(tmpdir(), `map-native-produce-${format}-`));
  execFileSync(
    "bun",
    [join(root, "scripts", "produce.mjs"), configPath, outDir, format],
    { cwd: root, stdio: "inherit", env: { ...process.env, ...env } },
  );
  return outDir;
}
