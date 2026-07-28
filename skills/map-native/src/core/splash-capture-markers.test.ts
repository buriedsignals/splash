// The engine side of the Verify layer's capture ladder — map-native's half.
// The reasoning lives in skills/chart-native/tests/splash-capture-markers.test.tsx; the
// short version is that `[data-splash-root]` and `[data-splash-title]` are the first rungs
// of the two selector ladders in lib/verify/capture.ts, they were posed by no engine, and
// every capture therefore fell through to a structural guess.
//
// map-native marks in two places, for two different reasons:
//
//   ROOT — in `mount.tsx`, on the full-viewport wrapper. That wrapper is exactly what
//   `#root > div` (the rung below) already resolved to, so the screenshot crop and the
//   `capture:fits-viewport` measurement do not move. It also scopes the marker to the
//   STANDALONE map build: a scrolly page has its own mount, which this file never touches.
//
//   TITLE — in `MapFrame`, behind an opt-in `standalone` prop that only the seven top-level
//   `src/*Map.tsx` deliverables pass. MapFrame is shared with the Reveal/Story/Scrolly step
//   comps, and in a map-scrolly page `document.querySelector("[data-splash-title]")` would
//   otherwise return the first STEP's caption and record it as the page's headline. The
//   default is unmarked, so a new comp is silent until it claims to be a deliverable.
//
// Source-text assertions, in the same spirit as frame-house-hue-parity.test.ts next door:
// the marking is a per-render-site obligation, and a new site that forgets it should fail
// here rather than quietly degrade a capture months later.
import { describe, it, expect } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(here, "..");

const read = (rel: string) => readFileSync(join(srcRoot, rel), "utf8");

// A `<MapFrame ...>` opening tag spans braces that themselves contain `>` (the `belowTitle`
// render-prop holds a whole `<MapFilterBar/>`), so the tag ends at the first `>` seen at
// brace depth 0. Same helper, same reason, as frame-house-hue-parity.test.ts next door —
// duplicated rather than shared, because a test's reading of the source should not depend on
// another test's private helper.
function openingTag(afterTagName: string): string {
  let depth = 0;
  for (let i = 0; i < afterTagName.length; i++) {
    const c = afterTagName[i];
    if (c === "{") depth++;
    else if (c === "}") depth--;
    else if (c === ">" && depth === 0) return afterTagName.slice(0, i + 1);
  }
  return afterTagName;
}
const mapFrameTags = (src: string) =>
  src.split("<MapFrame").slice(1).map(openingTag);

// The seven standalone map deliverables — `src/*Map.tsx`, the components mount.tsx renders.
const STANDALONE = readdirSync(srcRoot).filter((f) => /Map\.tsx$/.test(f));

// Every MapFrame render-site that is NOT one of those: the Reveal/Story/Scrolly step comps.
const STEP_COMPS = readdirSync(join(srcRoot, "components"))
  .filter((f) => f.endsWith(".tsx"))
  .filter((f) => read(join("components", f)).includes("<MapFrame"));

describe("map-native poses the capture ladder's markers", () => {
  it("finds the render-sites this test is about (guards against a silent empty sweep)", () => {
    expect(STANDALONE.length).toBe(7);
    expect(STEP_COMPS.length).toBeGreaterThanOrEqual(15);
  });

  it("mount.tsx marks the wrapper that `#root > div` already resolved to", () => {
    const mount = read("mount.tsx");
    expect(mount).toContain("data-splash-root");
    // Same element as before: the full-viewport wrapper createRoot renders into.
    const marked = mount.slice(mount.indexOf("data-splash-root"));
    expect(marked).toContain("100vw");
    expect(marked).toContain("100vh");
    // Exactly one root per page (the attribute itself, not the prose explaining it).
    expect(mount.split(`data-splash-root=""`).length - 1).toBe(1);
  });

  it("MapFrame marks its title only when the caller claims to be the deliverable", () => {
    const frame = read("core/MapFrame.tsx");
    expect(frame).toContain("data-splash-title");
    expect(frame).toContain("standalone");
  });

  it("every standalone *Map.tsx claims it", () => {
    const missing: string[] = [];
    for (const file of STANDALONE) {
      const tags = mapFrameTags(read(file));
      expect(tags.length).toBeGreaterThan(0);
      for (const open of tags)
        if (!/\bstandalone\b/.test(open)) missing.push(file);
    }
    expect(missing).toEqual([]);
  });

  it("no step comp claims it — a scrolly page keeps falling through, as it does today", () => {
    const claiming: string[] = [];
    for (const file of STEP_COMPS) {
      const src = read(join("components", file));
      for (const open of mapFrameTags(src))
        if (/\bstandalone\b/.test(open)) claiming.push(file);
      expect(src).not.toContain("data-splash-root");
      expect(src).not.toContain("data-splash-title");
    }
    expect(claiming).toEqual([]);
  });
});
