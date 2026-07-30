import { describe, expect, it } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// A rendered map puts its source line bottom-left. So does MapTiler's logo, and so does maplibre's
// bottom-left control — they land on top of it. Every component already passes
// `maptilerLogo: false` when it constructs the map and the SDK paints them anyway, so the removal
// only ever worked in CSS.
//
// It was declared per-component, and that is how it broke: all 7 interactive components carried a
// copy while 11 of the 13 video ones had none, so those 11 shipped a logo sitting on the source
// line. Nothing caught it — the video snap passes, conformance passes, every unit test passes. It
// took someone opening a rendered still.
//
// This is a DRIFT lock over wiring already proven by execution (a re-rendered ChoroplethStory still,
// logo gone, source line readable). It cannot prove the CSS works; it proves the rule has not been
// deleted from the one frame every map renders through, and that nobody has gone back to declaring
// it per-component — which is the shape that produced the bug.
const SRC = join(import.meta.dir, "..", "src");
const RULE = ".maptiler-logo";

describe("the vendor logo is hidden once, in the shared frame", () => {
  it("MapFrame declares the rule", () => {
    const frame = readFileSync(join(SRC, "core", "MapFrame.tsx"), "utf8");
    expect(frame).toContain(RULE);
    expect(frame).toContain(".maplibregl-ctrl-bottom-left");
  });

  // The fixture here is the real component tree, not a sample: a new *Story or *Reveal added later
  // is included automatically, which is exactly the case that went wrong last time.
  it("no video composition declares its own copy", () => {
    const dir = join(SRC, "components");
    const offenders = readdirSync(dir)
      .filter((f) => /(Story|Reveal)\.tsx$/.test(f))
      .filter((f) => readFileSync(join(dir, f), "utf8").includes(RULE));
    expect(offenders).toEqual([]);
  });

  it("scans a real, non-empty set of compositions", () => {
    const n = readdirSync(join(SRC, "components")).filter((f) =>
      /(Story|Reveal)\.tsx$/.test(f),
    ).length;
    expect(n).toBeGreaterThan(10);
  });
});
