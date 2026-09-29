// THE KEYED NOTE: MOVED BY ONE RULE, NEVER DROPPED, AND MOVED ONLY WHERE IT CANNOT CLEAR.
//
// `assets/keyed-note.ts` is the format's answer to an annotation that no longer fits its plot at a
// narrow width. The browser half — exactly one copy drawn at every width, the key drawn at both ends
// — is `verify-web.mjs`'s `checkKeyedNotes`, and the collision half is
// `splash/test/web-annotation-clears-its-marks.test.ts`. What is held here is the arithmetic and the
// stylesheet, the two things a later edit could quietly bend: a threshold that is not where the note
// stops fitting, and a rule that hides the plot's copy without revealing the other one.

import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertKeyedNotes,
  cellWidthPx,
  keyedNoteCss,
  leavesBelow,
  overlaps,
  PLOT_FLOOR_PX,
  type KeyedNote,
} from "../assets/keyed-note.ts";

const SCOPE = ".chart-figure";

/** The `@container` blocks of a stylesheet, whole. */
const blocks = (css: string) => [...css.matchAll(/@container \(width < (\d+)px\) \{([^]*?)\n\}/g)];

describe("leavesBelow — where a note stops fitting, measured one pixel at a time", () => {
  it("returns the narrowest width of the unbroken run that clears, from the widest down", () => {
    expect(leavesBelow((w) => w >= 612)).toBe(612);
  });

  it("does not let a narrow window where the note happens to fit again pull it back into the plot", () => {
    // Clears above 700 and again between 300 and 400: the run from the top ends at 700, so below 700
    // the note is keyed — a note that flickered back into the plot at 350 would be a rule nobody
    // could predict.
    expect(leavesBelow((w) => w >= 700 || (w >= 300 && w < 400))).toBe(700);
  });

  it("returns 0 for a note that clears at every width — no rule, and the page is unchanged", () => {
    expect(leavesBelow(() => true)).toBe(0);
    expect(keyedNoteCss([{ id: "a", key: "1", printed: false, below: 0 }], { scope: SCOPE })).not.toContain("@container");
  });

  it("refuses a note that clears nowhere: that is a misplaced note, not a crowded one", () => {
    expect(() => leavesBelow(() => false, { where: "the test note" })).toThrow(/misplaced, not crowded/);
  });
});

describe("keyedNoteCss — both halves of the move, in one block, and nothing outside it", () => {
  const notes: KeyedNote[] = [
    { id: "one-year", key: "Koweït", printed: true, below: 543 },
    { id: "rule", key: "1", printed: false, below: 480 },
  ];
  const css = keyedNoteCss(notes, { scope: SCOPE });

  it("writes one block per leaving note, at its own threshold", () => {
    expect(blocks(css).map((b) => Number(b[1]))).toEqual([543, 480]);
  });

  it("hides the plot's copy and reveals the line under the plot in the SAME block", () => {
    for (const [, , body] of blocks(css)) {
      const id = /data-keyed-note-plot="([^"]+)"\] \{ display: none; \}/.exec(body)?.[1];
      expect(id).toBeTruthy();
      expect(body).toContain(`.chart-notes > [data-keyed-note-under="${id}"] { display: inline; }`);
      expect(body).toContain(`.chart-plot .overlay [data-keyed-note-key="${id}"] { display: inline-block; }`);
    }
  });

  it("gives the list no room outside a block, so a page where nothing leaves is unchanged", () => {
    const outside = css.replace(/@container[^]*?\n\}/g, "");
    expect(outside).toContain(`${SCOPE} .chart-notes { list-style: none; margin: 0;`);
    expect(outside).toContain(`${SCOPE} .chart-notes > li { display: none;`);
    expect(outside).not.toMatch(/margin-top/);
  });

  it("makes the figure a width container, so the line under the plot asks the plot's own width", () => {
    expect(css).toContain(`${SCOPE} { container-type: inline-size; }`);
  });
});

describe("assertKeyedNotes — the pages that would lie about a note", () => {
  const ok: KeyedNote = { id: "a", key: "Croatie", printed: true, below: 500 };
  it("accepts a printed key and numerals in order", () => {
    expect(() =>
      assertKeyedNotes([ok, { id: "b", key: "1", printed: false, below: 400 }, { id: "c", key: "2", printed: false, below: 0 }]),
    ).not.toThrow();
  });
  it("refuses a duplicate id, an empty key, numerals out of order and a threshold that is not a width", () => {
    expect(() => assertKeyedNotes([ok, { ...ok }])).toThrow(/share the id/);
    expect(() => assertKeyedNotes([{ ...ok, key: " " }])).toThrow(/no key/);
    expect(() => assertKeyedNotes([{ id: "b", key: "2", printed: false, below: 400 }])).toThrow(/numbered "2"/);
    expect(() => assertKeyedNotes([{ ...ok, below: Number.NaN }])).toThrow(/not a plot width/);
    expect(() => assertKeyedNotes([{ ...ok, id: "Not A Slug" }])).toThrow(/not a slug/);
  });
});

describe("overlaps — touching is not a collision, which is how the guard reads one", () => {
  it("separates sharing area from sharing an edge", () => {
    expect(overlaps({ l: 0, t: 0, r: 10, b: 10 }, { l: 5, t: 5, r: 15, b: 15 })).toBe(true);
    expect(overlaps({ l: 0, t: 0, r: 10, b: 10 }, { l: 10, t: 0, r: 20, b: 10 })).toBe(false);
  });
});

describe("cellWidthPx — the cell render-web draws, not the track the gutter leaves", () => {
  it("carries render-web's own plot floor", () => {
    const renderWeb = readFileSync(join(import.meta.dirname, "../scripts/render-web.mjs"), "utf8");
    expect(renderWeb).toContain(`const PLOT_FLOOR_PX = ${PLOT_FLOOR_PX};`);
  });
  it("is height-bound where the box's pixel extras make it so — the streamgraph at 375 px", () => {
    // 900 x 400 viewBox, aspect-ratio 900 / (400 + 28), no gutter: 327 px of plot draws 287 px of cell.
    const at = cellWidthPx(327, { frame: { width: 900, height: 400 }, box: { width: 900, height: 428 }, axisPx: 28 });
    expect(Math.round(at)).toBe(287);
  });
  it("is the track where the width binds — the gantt at 375 px", () => {
    const at = cellWidthPx(327, { frame: { width: 780, height: 416 }, box: { width: 896, height: 442 }, gutterPx: 116, axisPx: 26 });
    expect(at).toBe(211);
  });
});
