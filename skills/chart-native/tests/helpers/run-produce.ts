// Test helper: shells the REAL scripts/produce.mjs (real Vite build + real Playwright
// snaps — no mocks, matching this repo's testing convention) into a fresh tmp outDir
// and returns that outDir's path. Used by produce-single-format.test.ts to assert
// exactly one VisualFormat's artifacts land on disk and none of the others'.
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");

// Runs `bun scripts/produce.mjs <type> <configPath> <outDir> <format>` for real,
// inheriting stdio so a failure's real build/render log shows up in the test output
// (rather than a bare non-zero-exit error). Throws (via execFileSync) if produce.mjs
// exits non-zero — callers that expect a deliberate failure (e.g. an unsupported
// format) should catch it themselves rather than use this happy-path helper.
export async function runProduce(
  type: string,
  sampleDataRelPath: string,
  format: string,
): Promise<string> {
  const configPath = join(root, sampleDataRelPath);
  const outDir = mkdtempSync(
    join(tmpdir(), `chart-native-produce-${type}-${format}-`),
  );
  execFileSync(
    "bun",
    [join(root, "scripts", "produce.mjs"), type, configPath, outDir, format],
    { cwd: root, stdio: "inherit" },
  );
  return outDir;
}
