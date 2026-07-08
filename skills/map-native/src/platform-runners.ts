// Command prefix for running a project script that LAUNCHES headless Chromium. On Windows,
// Playwright's chromium.launch() hangs under the Bun runtime (Bun #15679), so these steps must
// run under Node. But Node can't resolve the snap scripts' .ts / extensionless imports the way
// Bun does — tsx (a Node-runtime TS loader) resolves them AND avoids the Bun hang. Off Windows,
// Bun runs them directly.
export function snapCommand(platform: string): string[] {
  return platform === "win32" ? ["npx", "tsx"] : ["bun"];
}

// Remotion launches its own Chromium; use the Node package runner on Windows (it bundles its own
// entry, so no project .ts resolution is needed), Bun's elsewhere.
export function remotionCommand(platform: string): string[] {
  return platform === "win32" ? ["npx", "remotion"] : ["bunx", "remotion"];
}
