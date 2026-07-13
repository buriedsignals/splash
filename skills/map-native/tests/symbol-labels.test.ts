import { describe, it, expect } from "bun:test";
import {
  symbolLabels,
  formatLabelValue,
  labelRadialOffset,
  wantsStaticFallbackLabels,
  estimateLabelBox,
  placeSymbolLabel,
  assignSymbolLabelAnchors,
  type LabelAnchor,
  type SymbolAnchorProps,
} from "../src/symbol-labels";
import type { PlacedSymbol } from "../src/symbol-geo";

const sym = (over: Partial<PlacedSymbol>): PlacedSymbol => ({
  lon: 0,
  lat: 0,
  value: 100,
  radius: 30,
  ...over,
});

describe("formatLabelValue", () => {
  it("shows small integers as-is", () => {
    expect(formatLabelValue(296)).toBe("296");
    expect(formatLabelValue(5)).toBe("5");
  });
  it("keeps 1 decimal for a non-integer below 1000 (magnitude 7.4 → '7.4', not '7')", () => {
    // The reported seismes bug: integer rounding collapsed every magnitude to "7"/"6".
    expect(formatLabelValue(7.4)).toBe("7.4");
    expect(formatLabelValue(6.1)).toBe("6.1");
    expect(formatLabelValue(123.4)).toBe("123.4");
  });
  it("keeps an integer count clean below 1000 — no spurious '.0'", () => {
    expect(formatLabelValue(181)).toBe("181");
    expect(formatLabelValue(12)).toBe("12");
  });
  it("compacts thousands and millions, trimming a trailing .0", () => {
    expect(formatLabelValue(1500)).toBe("1.5k");
    expect(formatLabelValue(2000)).toBe("2k");
    expect(formatLabelValue(2_300_000)).toBe("2.3M");
    expect(formatLabelValue(4_000_000)).toBe("4M"); // large-count abbreviation intact
  });
  it("preserves the French comma decimal for a non-integer below 1000", () => {
    expect(formatLabelValue(7.4, "fr")).toBe("7,4");
    expect(formatLabelValue(6.1, "fr")).toBe("6,1");
  });
  it("uses the French comma decimal when lang is fr, English unchanged", () => {
    expect(formatLabelValue(1500, "fr")).toBe("1,5k");
    expect(formatLabelValue(2_300_000, "fr")).toBe("2,3M");
    expect(formatLabelValue(296, "fr")).toBe("296");
    expect(formatLabelValue(1500, "en")).toBe("1.5k");
  });
  it("threads lang through symbolLabels into every valueText", () => {
    const [label] = symbolLabels([sym({ value: 1500 })], "fr");
    expect(label.valueText).toBe("1,5k");
  });
});

describe("symbolLabels", () => {
  const symbols: PlacedSymbol[] = [
    sym({ value: 296, radius: 40, label: "London", lon: -0.1, lat: 51.5 }),
    sym({ value: 52, radius: 8, label: "Amsterdam", lon: 4.9, lat: 52.4 }),
  ];
  const labels = symbolLabels(symbols);

  it("returns one label per symbol, preserving order", () => {
    expect(labels.length).toBe(2);
    expect(labels.map((l) => l.name)).toEqual(["London", "Amsterdam"]);
  });
  it("formats the value text and carries coordinates + radius", () => {
    expect(labels[0].valueText).toBe("296");
    expect(labels[0].lon).toBe(-0.1);
    expect(labels[0].radius).toBe(40);
  });
  it("uses an empty name when the symbol has no label", () => {
    const [l] = symbolLabels([sym({ label: undefined })]);
    expect(l.name).toBe("");
  });
  it("is deterministic", () => {
    expect(symbolLabels(symbols)).toEqual(labels);
  });
});

describe("wantsStaticFallbackLabels", () => {
  it("is true when the ?staticLabels flag is present (the a11y-fallback snapshot)", () => {
    expect(wantsStaticFallbackLabels("?staticLabels=1")).toBe(true);
    expect(wantsStaticFallbackLabels("?staticLabels")).toBe(true);
    expect(wantsStaticFallbackLabels("?foo=bar&staticLabels=1")).toBe(true);
  });
  it("is false for a live reader load (no flag) — the interactive page stays hover-only", () => {
    expect(wantsStaticFallbackLabels("")).toBe(false);
    expect(wantsStaticFallbackLabels("?other=1")).toBe(false);
  });
});

describe("labelRadialOffset", () => {
  it("returns (radius + gap) / textSize in ems", () => {
    expect(labelRadialOffset(40, 13, 6)).toBeCloseTo((40 + 6) / 13, 6);
  });
  it("defaults the gap to 6px", () => {
    expect(labelRadialOffset(20, 10)).toBeCloseTo((20 + 6) / 10, 6);
  });
  it("grows with radius (a bigger circle pushes its label further out)", () => {
    expect(labelRadialOffset(40, 13)).toBeGreaterThan(labelRadialOffset(8, 13));
  });
  it("is deterministic", () => {
    expect(labelRadialOffset(30, 12)).toBe(labelRadialOffset(30, 12));
  });
});

describe("estimateLabelBox", () => {
  it("grows the width with the longest line's length", () => {
    const short = estimateLabelBox("Rome\n67 t", 13);
    const long = estimateLabelBox("Indonésie\n760k t", 13);
    expect(long.width).toBeGreaterThan(short.width);
  });
  it("grows the height with the number of lines", () => {
    const oneLine = estimateLabelBox("760k t", 13);
    const twoLines = estimateLabelBox("Indonésie\n760k t", 13);
    expect(twoLines.height).toBeGreaterThan(oneLine.height);
  });
  it("scales with the text size", () => {
    const small = estimateLabelBox("Indonésie", 13);
    const big = estimateLabelBox("Indonésie", 18);
    expect(big.width).toBeGreaterThan(small.width);
  });
});

describe("placeSymbolLabel — never overflows the viewport", () => {
  const viewport = { width: 1200, height: 675 };

  it("keeps the default RIGHT placement (anchor 'left') when it fits", () => {
    const p = placeSymbolLabel({
      cx: 300,
      cy: 340,
      offset: 30,
      width: 80,
      height: 40,
      viewport,
    });
    expect(p.anchor).toBe("left");
    expect(p.box.right).toBeLessThanOrEqual(viewport.width);
  });

  it("FLIPS to the LEFT (anchor 'right') when a right placement would clip the right edge", () => {
    // Indonesia-like: a symbol whose centre sits near the right edge, so a
    // right-placed label ("Indonésie") would run past viewport.width.
    const cx = 1150; // 50px from the right edge
    const width = 80;
    const rightPlacementEnd = cx + 30 + width; // 1260 > 1200 → overflows
    expect(rightPlacementEnd).toBeGreaterThan(viewport.width);

    const p = placeSymbolLabel({
      cx,
      cy: 340,
      offset: 30,
      width,
      height: 40,
      viewport,
    });
    expect(p.anchor).toBe("right");
    // The invariant: the whole label box stays inside the viewport.
    expect(p.box.left).toBeGreaterThanOrEqual(0);
    expect(p.box.right).toBeLessThanOrEqual(viewport.width);
  });

  it("keeps a LEFT-edge symbol's label inside the left edge", () => {
    const p = placeSymbolLabel({
      cx: 40,
      cy: 340,
      offset: 30,
      width: 80,
      height: 40,
      viewport,
    });
    expect(p.box.left).toBeGreaterThanOrEqual(0);
    expect(p.box.right).toBeLessThanOrEqual(viewport.width);
  });

  it("guards the TOP/BOTTOM edges so the label box stays vertically in-frame", () => {
    // A symbol pinned to both horizontal edges' safe zone but hard against the top:
    // whichever anchor is chosen, the box must not cross the top edge.
    const p = placeSymbolLabel({
      cx: 600,
      cy: 6,
      offset: 30,
      width: 80,
      height: 40,
      viewport,
    });
    expect(p.box.top).toBeGreaterThanOrEqual(0);
    expect(p.box.bottom).toBeLessThanOrEqual(viewport.height);
  });

  it("is deterministic", () => {
    const input = {
      cx: 1150,
      cy: 340,
      offset: 30,
      width: 80,
      height: 40,
      viewport,
    };
    expect(placeSymbolLabel(input)).toEqual(placeSymbolLabel(input));
  });
});

// The shared edge-clamp loop that BOTH the static SymbolMap and the animated symbol
// renderers (Reveal/Story/Scrolly) run after their camera settles. Given each symbol's
// projected screen centre it mutates the per-feature `anchor` in place and reports
// whether anything changed (the renderer's setData guard). Pure → unit-testable without
// a browser, so the animated renderers' code path is covered here too.
describe("assignSymbolLabelAnchors — the shared per-renderer edge-clamp loop", () => {
  const viewport = { width: 1200, height: 675 };
  const opts = { viewport, textSize: 13, gap: 6 };
  const mk = (over: Partial<SymbolAnchorProps>): SymbolAnchorProps => ({
    labelText: "Rome\n67",
    radius: 30,
    anchor: "left",
    ...over,
  });

  it("flips an edge symbol's anchor away from the default and reports changed=true", () => {
    // An Indonesia-like symbol whose centre sits 50px from the right edge: a
    // right-placed ("left" anchor) label runs off-canvas, so it must flip to the LEFT.
    const props = [
      mk({ labelText: "Berlin\n120" }), // centred → keeps the default
      mk({ labelText: "Indonésie\n760k" }), // right edge → must flip
    ];
    const projected = [
      { x: 600, y: 340 },
      { x: 1150, y: 340 },
    ];
    const changed = assignSymbolLabelAnchors(props, projected, opts);
    expect(changed).toBe(true);
    expect(props[0].anchor).toBe("left"); // unchanged default
    expect(props[1].anchor).not.toBe("left"); // flipped inward (right/top/bottom)
    expect(props[1].anchor).toBe("right");
  });

  it("is idempotent once settled — a second pass reports changed=false (setData guard)", () => {
    const props = [mk({ labelText: "Indonésie\n760k" })];
    const projected = [{ x: 1150, y: 340 }];
    expect(assignSymbolLabelAnchors(props, projected, opts)).toBe(true);
    // Already clamped → no anchor changes → the renderer must NOT setData again
    // (this is what breaks the setData→idle loop in the per-frame renderers).
    expect(assignSymbolLabelAnchors(props, projected, opts)).toBe(false);
  });

  it("recomputes per camera: the SAME symbol clamps differently as it crosses the edge", () => {
    // Models SymbolStory/Scrolly jumpTo-per-frame: the projected x moves between frames,
    // so the anchor must be re-derived from the current projection, not frozen at load.
    const props = [mk({ labelText: "Indonésie\n760k", anchor: "left" })];
    // Frame A — symbol comfortably centred: default RIGHT placement fits.
    expect(assignSymbolLabelAnchors(props, [{ x: 600, y: 340 }], opts)).toBe(
      false,
    );
    expect(props[0].anchor).toBe("left");
    // Frame B — camera panned so the symbol is now against the right edge: must flip.
    expect(assignSymbolLabelAnchors(props, [{ x: 1180, y: 340 }], opts)).toBe(
      true,
    );
    expect(props[0].anchor).toBe("right");
  });

  it("skips a symbol with no projected point (defensive) and leaves its anchor", () => {
    const props = [mk({ anchor: "top" as LabelAnchor })];
    const projected: { x: number; y: number }[] = [];
    expect(assignSymbolLabelAnchors(props, projected, opts)).toBe(false);
    expect(props[0].anchor).toBe("top");
  });
});
