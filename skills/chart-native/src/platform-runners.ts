// Pick the subprocess runner for steps that LAUNCH headless Chromium. On Windows,
// Playwright's chromium.launch() hangs indefinitely under the Bun runtime (Bun #15679 —
// Bun drops the CDP fd3 pipe Playwright uses), so those steps must run under Node. Other
// platforms are unaffected: Bun drives Chromium fine.
export function snapRunner(platform: string): "node" | "bun" {
  return platform === "win32" ? "node" : "bun";
}

// Same reasoning for Remotion (it launches its own Chromium): the Node package runner on
// Windows, the Bun one elsewhere.
export function remotionRunner(platform: string): "npx" | "bunx" {
  return platform === "win32" ? "npx" : "bunx";
}
