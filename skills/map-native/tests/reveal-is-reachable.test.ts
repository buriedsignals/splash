import { describe, expect, it } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { CAMERA_MODES } from "../src/camera-mode";

// The reveal kind rendered perfectly and no CLI could ask for it. `camera-mode.ts` described
// `simple` as "the reveal format (no camera)" in its own header while leaving it out of
// CAMERA_MODES — the only place the taxonomy is enforced — so `produce.mjs` threw
// "camera mode 'simple' is not implemented" for the one value its comment documented. Six
// compositions (18 counting square and portrait) were unreachable that way.
//
// What this pins: that every registered *Reveal composition can be SELECTED. It does not render
// them — the render is proven by produce's own video path and its snap-video check. It guards the
// reachability, which is what was broken.
//
// The dispatch itself (storyComps) has since moved out of produce.mjs into
// ./lib/story-comps.mjs (task-6, so it could be unit-tested by calling it — see
// story-comps.test.ts) — this file's own string-match approach follows it there.
const SRC = join(import.meta.dir, "..", "src");
const REMOTION = join(import.meta.dir, "..", "remotion", "src");
const PRODUCE = readFileSync(
  join(import.meta.dir, "..", "scripts", "lib", "story-comps.mjs"),
  "utf8",
);

function registeredRevealIds(): string[] {
  const files = readdirSync(REMOTION).filter((f) => /\.tsx?$/.test(f));
  const ids = new Set<string>();
  for (const f of files) {
    const src = readFileSync(join(REMOTION, f), "utf8");
    for (const m of src.matchAll(/id="([A-Za-z]*Reveal[A-Za-z]*)"/g))
      ids.add(m[1]!);
  }
  return [...ids].sort();
}

describe("the reveal kind is reachable, not just renderable", () => {
  it("`simple` is a camera mode the taxonomy accepts", () => {
    expect(CAMERA_MODES).toContain("simple");
  });

  // The fixture is the real registry, so a reveal composition added later is covered without
  // anyone remembering to extend this list — the omission that caused the original gap.
  //
  // The dispatch names each LANDSCAPE id and derives its two siblings by template
  // (`${base}Square` / `${base}Portrait`), so the check follows that shape rather than looking for
  // 21 literals that will never appear: every landscape base must be named, and the two suffixes
  // must be the ones actually appended — otherwise a base could be reachable while its square and
  // portrait siblings resolve to composition ids that do not exist.
  it("every registered reveal base is named, and its aspects are derived", () => {
    const registered = registeredRevealIds();
    expect(registered.length).toBeGreaterThan(15);

    const bases = registered.filter((id) => !/(Square|Portrait)$/.test(id));
    expect(bases.length).toBeGreaterThan(5);
    expect(bases.filter((id) => !PRODUCE.includes(id))).toEqual([]);

    expect(PRODUCE).toContain("${base}Square");
    expect(PRODUCE).toContain("${base}Portrait");

    // And the derivation must land on ids that are really registered — the suffixes are only
    // correct because the registry uses exactly these two.
    for (const b of bases) {
      expect(registered).toContain(`${b}Square`);
      expect(registered).toContain(`${b}Portrait`);
    }
  });

  it("the dispatch handles `simple` rather than throwing on it", () => {
    expect(PRODUCE).toContain('cameraMode === "simple"');
    // The failure this replaces, kept as a string so a rename of the throw does not silently
    // restore the gap.
    expect(PRODUCE).toContain("is not implemented");
  });
});
