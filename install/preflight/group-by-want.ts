// group-by-want.ts — the pure seam behind renderCapabilities' grouping (fix round 1, Finding 3).
//
// This is its own file rather than living in model.ts on purpose: client.ts is bundled for the
// BROWSER (server.ts's Bun.build, target: "browser"), and a VALUE import does not erase the way
// `import type` does — pulling `groupEnginesByWant` in from model.ts would drag model.ts's whole
// module graph into that bundle, including readiness.ts's `import { fileURLToPath } from
// "node:url"`, which Bun's browser target cannot polyfill (build fails: "Browser polyfill for
// module 'node:url' doesn't have a matching export named 'fileURLToPath'"). This module has no
// runtime imports of its own — only `import type`, erased at build time — so client.ts can call
// it as a real function without dragging anything server-only into the browser.
import type { WantId } from "../../lib/newsroom/capabilities.ts";
import type { PreflightCapability } from "./model.ts";

export type WantGroup = {
  want: WantId | undefined;
  capabilities: PreflightCapability[];
};

/**
 * Groups engines by the want they serve, in the order each want first appears in the list — the
 * want leads, the tools underneath stay their own choosable rows. Pure: client.ts's
 * renderCapabilities calls it and only turns the result into DOM nodes, and this is what a test
 * calls instead — client.ts has no DOM test harness (page.test.ts only greps the raw HTML/CSS
 * text as strings; there is no jsdom/happy-dom anywhere in this suite).
 */
export function groupEnginesByWant(
  engines: PreflightCapability[],
): WantGroup[] {
  const groups = new Map<string, PreflightCapability[]>();
  for (const c of engines) {
    const key = c.want ?? "";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }
  return [...groups.entries()].map(([want, capabilities]) => ({
    want: want ? (want as WantId) : undefined,
    capabilities,
  }));
}
