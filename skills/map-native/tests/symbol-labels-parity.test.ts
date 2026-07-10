// Parity guard (feedback→système): every symbol-map renderer — static, and all 3
// video/scrolly formats — must carry a direct `symbol-labels` layer so name+value is
// legible without hover, not just for the top-N callouts (bug #3). This scans each
// renderer's SOURCE (not a mounted DOM/map instance — MapTiler needs a real WebGL
// context) for the layer MapLibre-style spec that `symbolLabels`/`labelRadialOffset`
// feed: a `symbol-labels` layer of type "symbol" reading the pre-computed `labelText`
// property. A renderer that only adds `symbol-circles` (the pre-fix state of
// SymbolStory/SymbolScrolly) fails this — see the RED/GREEN proof in task-6-report.md.
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SRC_DIR = join(import.meta.dir, "..", "src");

const RENDERERS: Record<string, string> = {
  "SymbolMap (static, !interactive)": join(SRC_DIR, "SymbolMap.tsx"),
  "SymbolReveal (video, simple-reveal)": join(
    SRC_DIR,
    "components",
    "SymbolReveal.tsx",
  ),
  "SymbolStory (video, guided-tour)": join(
    SRC_DIR,
    "components",
    "SymbolStory.tsx",
  ),
  "SymbolScrolly (scrolly-as-video)": join(
    SRC_DIR,
    "components",
    "SymbolScrolly.tsx",
  ),
};

// A genuine direct-label layer: the `symbol-labels` layer id, MapLibre `type: "symbol"`,
// and `text-field` reading the pre-computed `labelText` property (name+value, built via
// symbolLabels/labelRadialOffset) — not just a stray string mention of "symbol-labels".
function hasSymbolLabelsLayer(source: string): boolean {
  return (
    /id:\s*"symbol-labels"/.test(source) &&
    /type:\s*"symbol"/.test(source) &&
    /"text-field":\s*\["get",\s*"labelText"\]/.test(source)
  );
}

describe("symbol renderer parity: every format labels every symbol (name+value)", () => {
  for (const [name, path] of Object.entries(RENDERERS)) {
    it(`${name} adds a symbol-labels layer`, () => {
      const source = readFileSync(path, "utf-8");
      expect(hasSymbolLabelsLayer(source)).toBe(true);
    });
  }

  // Non-vacuity: prove the assertion actually discriminates. Simulate the pre-fix
  // SymbolStory (circles-only, no label layer) by stripping just the layer id from a
  // real, currently-passing source file — this must flip the check to false. This is
  // the same regression `symbol-circles`-only shape SymbolStory/SymbolScrolly had
  // before this fix (confirmed for real via `git stash` — see task-6-report.md).
  it("is non-vacuous: fails when a renderer's label layer is stripped", () => {
    const source = readFileSync(
      RENDERERS["SymbolStory (video, guided-tour)"],
      "utf-8",
    );
    expect(hasSymbolLabelsLayer(source)).toBe(true); // sanity: real source passes

    const strippedId = source.replace(
      /id:\s*"symbol-labels"/,
      'id: "symbol-labels-REMOVED"',
    );
    expect(hasSymbolLabelsLayer(strippedId)).toBe(false);

    const circlesOnly = source.replace(
      /\/\/ Direct label layer[\s\S]*?"text-opacity": 0,\s*\},\s*\}\);/,
      "",
    );
    expect(hasSymbolLabelsLayer(circlesOnly)).toBe(false);
  });
});

// Edge-clamp parity (feedback→système): the "a symbol label never renders outside the
// viewport" invariant must hold for EVERY symbol renderer, static AND animated. The
// edge-blind MapLibre `text-variable-anchor` (re-anchors only on label↔label collision,
// never the canvas edge) must be gone from the symbol-labels layer; each renderer must
// instead drive a per-feature, data-driven `text-anchor` (`["get","anchor"]`) fed by the
// SHARED clamp `assignSymbolLabelAnchors` (single source of truth — no duplicated
// geometry). Source-scanned (not mounted) for the same reason as the parity test above:
// MapTiler needs a real WebGL context.
describe("symbol renderer parity: edge-aware anchors, never text-variable-anchor", () => {
  const QUOTED_VARIABLE_ANCHOR = new RegExp(`"text` + `-variable-anchor"`);

  for (const [name, path] of Object.entries(RENDERERS)) {
    it(`${name} drives a data-driven text-anchor via the shared clamp`, () => {
      const source = readFileSync(path, "utf-8");
      // No edge-blind variable-anchor layout property anywhere in the renderer.
      expect(QUOTED_VARIABLE_ANCHOR.test(source)).toBe(false);
      // Per-feature data-driven anchor + the shared placement helper.
      expect(/"text-anchor":\s*\["get",\s*"anchor"\]/.test(source)).toBe(true);
      expect(/assignSymbolLabelAnchors/.test(source)).toBe(true);
    });
  }

  // Non-vacuity: re-introducing the edge-blind variable-anchor must flip the check red.
  it("is non-vacuous: fails when a renderer reverts to text-variable-anchor", () => {
    const source = readFileSync(
      RENDERERS["SymbolReveal (video, simple-reveal)"],
      "utf-8",
    );
    expect(QUOTED_VARIABLE_ANCHOR.test(source)).toBe(false); // sanity: fixed source passes

    const reverted = source.replace(
      /"text-anchor":\s*\["get",\s*"anchor"\]/,
      '"text-variable-anchor": ["left", "right", "top", "bottom"]',
    );
    expect(QUOTED_VARIABLE_ANCHOR.test(reverted)).toBe(true);
  });
});
