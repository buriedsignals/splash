/**
 * ROUND-FIVE FINDING T4 (second half): A LABEL THE PLATE CLIPS IS A LABEL NOBODY READS.
 *
 * A map beat draws its labels inside the plate's own clip path, and a clip throws nothing — the run
 * is simply cut, in a frame a reviewer has to notice by reading it. `stress-t-europe-recycling`
 * shipped "Mac…" and "18.4" that way, found it by looking, wrote the check by hand inside its own
 * component and named the absence in its maintainer notes.
 *
 * `labelsClippedByPlate` is that check in the skill. The material below is REAL: the anchors
 * `stress-t`'s own `bake-plate.mjs` projected, read off its committed `geometry.json`, run at the
 * plate size that shipped the clip and at the one that fixed it.
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { labelsClippedByPlate } from "../scripts/detect-label-clipped-by-plate.mjs";

const TWIN = resolve(import.meta.dirname, "..", "..", "..");
const BAKE = JSON.parse(
  readFileSync(
    join(TWIN, "stories/stress-t-europe-recycling/beats/europe-recycling-map/plate-560/geometry.json"),
    "utf8",
  ),
);

/** The measurer a component falls back to with no canvas — the same arithmetic every seed in this
 *  tree uses in node, so these numbers are the ones the render itself would compute. */
const measure = (text: string, fontSize: number) => text.length * fontSize * 0.5;

/** The two label boxes `stress-t` draws, at a given plate edge length, exactly as its own component
 *  lays them out: anchored END at the projected anchor, the name above and the figure below. */
function labelsAt(size: number) {
  const scale = size / BAKE.frame.width;
  const mapX = 1080 - 48 - size;
  const mapY = 340;
  return (["label", "comparisonLabel"] as const).map((anchor) => {
    const [ax, ay] = BAKE.anchors[anchor] as [number, number];
    const text = anchor === "label" ? "Germany" : "Macedonia";
    const figure = anchor === "label" ? "67.8%" : "18.4%";
    const width = Math.max(measure(text, 38), measure(figure, 44));
    const x = mapX + ax * scale;
    const y = mapY + ay * scale;
    return { what: `${anchor} "${text}"`, left: x - width, right: x, top: y - 38 * 0.75, bottom: y + 44 + 6 };
  });
}

const plateAt = (size: number) => ({
  left: 1080 - 48 - size,
  right: 1080 - 48,
  top: 340,
  bottom: 340 + size,
});

describe("labelsClippedByPlate", () => {
  it("says nothing when every run fits inside the plate", () => {
    expect(
      labelsClippedByPlate(
        [{ what: "a label", left: 10, right: 90, top: 10, bottom: 40 }],
        { left: 0, right: 100, top: 0, bottom: 100 },
      ),
    ).toEqual([]);
  });

  it("names the edge and the overrun rather than returning a boolean", () => {
    const found = labelsClippedByPlate(
      [{ what: "a label", left: -12, right: 140, top: 10, bottom: 40 }],
      { left: 0, right: 100, top: 0, bottom: 100 },
    );
    expect(found).toHaveLength(1);
    expect(found[0]).toContain("12px past the left edge");
    expect(found[0]).toContain("40px past the right edge");
  });

  it("reports every clipped label, not the first — a re-bake fixes one and can break another", () => {
    const plate = { left: 0, right: 100, top: 0, bottom: 100 };
    const found = labelsClippedByPlate(
      [
        { what: "first", left: -5, right: 40, top: 10, bottom: 20 },
        { what: "second", left: 10, right: 40, top: 10, bottom: 130 },
      ],
      plate,
    );
    expect(found).toHaveLength(2);
  });

  // ── Real material ───────────────────────────────────────────────────────────────────────────
  it("clears both of stress-t's labels at the plate size it actually ships", () => {
    expect(labelsClippedByPlate(labelsAt(560), plateAt(560))).toEqual([]);
  });

  it("says where stress-t's own committed anchors start being clipped, and by how much", () => {
    // NOT a fixture: the same committed anchors, the same two runs, at smaller plates. A map label
    // is drawn at a fixed type size over a plate that scales, so a plate the size gate shrinks is
    // exactly how a fitting anchor stops fitting — and this beat's own plate already came down from
    // 640 to 560 once. The sweep says the headroom is real but not large.
    const clipsAt = (size: number) => labelsClippedByPlate(labelsAt(size), plateAt(size));
    expect(clipsAt(560)).toEqual([]);
    expect(clipsAt(360)).toHaveLength(1);
    expect(clipsAt(360)[0]).toContain("4.2px below the bottom edge");
    expect(clipsAt(300)[0]).toContain("11.9px below the bottom edge");
    // The first plate size at which anything clips at all, found rather than typed.
    let first = 560;
    while (first > 200 && clipsAt(first).length === 0) first -= 1;
    expect(first).toBe(389);
  });

  it("does not redden on a sub-pixel overrun, which is the measurer's own noise", () => {
    const plate = { left: 0, right: 100, top: 0, bottom: 100 };
    expect(
      labelsClippedByPlate([{ what: "a label", left: 0, right: 100.4, top: 0, bottom: 100 }], plate),
    ).toEqual([]);
    expect(
      labelsClippedByPlate([{ what: "a label", left: 0, right: 100.6, top: 0, bottom: 100 }], plate),
    ).toHaveLength(1);
  });
});
