/**
 * A READING NOBODY CAN ASK FOR IS NOT A CONTROL.
 *
 * Measured 2026-09-23, on the second export of a real story. The beat drew twenty-seven bars, put a
 * `data-detail` on each one, wrote a reading line promising the reader could hover, tap or tab them
 * — and shipped a page where none of that worked. `interaction.mjs` reaches a reading by exactly
 * two doors: `initChart` collects `svg.querySelectorAll(".pt")` and returns at once when the list is
 * empty (`interaction.mjs:109`), and `initLines` does the same for `.line-hit` (`:339`). The beat's
 * attributes sat on `<rect class="bar">`, which is neither, so both handlers returned and the page
 * was a still served as HTML.
 *
 * NOTHING REFUSED IT, and that is the part worth pinning. `shippedControls` discovers an `ask`
 * control by the presence of `[data-detail]` — "the format's real contract" — and then asks only
 * whether its strings add something the plate does not already print. Both halves were true here.
 * The question never asked was whether anything on the page could ever READ the attribute.
 *
 * So the census gains a third question, and it is mechanical: a reading must sit on an element one
 * of the two handlers collects. It cannot be satisfied by a promise, a plan or a comment.
 */
import { describe, it, expect } from "bun:test";
import {
  answersOutOfReach,
  assertControlsChangeSomething,
} from "../assets/interaction-plan.ts";

/** A page with one reading, on the element named by `className`. */
const page = (className: string) => `<figure class="chart-figure">
<svg class="chart" viewBox="0 0 100 100">
<rect class="${className}" data-detail="Romania · 25,505 cases · 85% of the EU total"></rect>
<rect class="hit-area" x="0" y="0" width="100" height="100"></rect>
</svg>
<p class="chart-reading">Hover, tap or tab any bar.</p>
</figure>`;

describe("a reading the interaction layer can actually reach", () => {
  it("names a reading parked on an element neither handler collects", () => {
    expect(answersOutOfReach(page("bar"))).toEqual([
      "Romania · 25,505 cases · 85% of the EU total",
    ]);
  });

  it("accepts a reading on a .pt, which initChart collects", () => {
    expect(answersOutOfReach(page("pt"))).toEqual([]);
  });

  it("accepts a reading on a .line-hit, which initLines collects", () => {
    expect(answersOutOfReach(page("line-hit"))).toEqual([]);
  });

  it("reads the class list rather than the whole attribute, so a second class does not hide the first", () => {
    expect(answersOutOfReach(page("pt mark-active"))).toEqual([]);
    expect(answersOutOfReach(page("pointer"))).toEqual([
      "Romania · 25,505 cases · 85% of the EU total",
    ]);
  });

  it("refuses the page, naming the two doors and what the reader was promised", () => {
    expect(() => assertControlsChangeSomething(page("bar"), "the ranking")).toThrow(
      /out of reach/i,
    );
    expect(() => assertControlsChangeSomething(page("bar"), "the ranking")).toThrow(
      /\.pt/,
    );
  });

  it("leaves a table row's reading alone — the disclosure is read, not pointed at", () => {
    const withTable = `<figure class="chart-figure">
<svg class="chart" viewBox="0 0 100 100"><rect class="pt" data-detail="Romania · 85%"></rect></svg>
<details><table><tbody>
<tr data-mark="ROU" data-detail="Romania · 25,505 cases"></tr>
</tbody></table></details>
</figure>`;
    expect(answersOutOfReach(withTable)).toEqual([]);
  });

  it("leaves a live map's own rows alone — it answers off the feature, not off the DOM", () => {
    // `map-web/assets/live-map.mjs:469` reads the properties MapLibre hands the event, and falls
    // back to the feature's own `detail`. The seven live-map beats in the catalogue carry 41
    // `data-detail` attributes, every one of them on a `<tr>`, and nothing in the DOM reads them.
    // That is surplus markup on a page that answers; it is not the dead promise this guard is for.
    const liveMap = `<figure class="chart-figure">
<div id="mw-map"></div>
<table><tbody><tr data-mark="AL" data-detail="Albanie · 100,0 %"></tr></tbody></table>
</figure>`;
    expect(answersOutOfReach(liveMap)).toEqual([]);
  });

  it("lets a page whose readings are reachable through, so this guard cannot pass by refusing everything", () => {
    expect(() => assertControlsChangeSomething(page("pt"), "the ranking")).not.toThrow();
  });
});

/**
 * WHERE THE ANSWER IS DRAWN — the pure half of a rule that had been stated twice and measured never.
 *
 * `interaction.mjs` anchors the box on the mark rather than on the pointer, for reasons written in
 * the file: the box for India sat over the United States, and on the grouped bar it floated at
 * whatever height the hand happened to be. Both fixes anchored on the POINT, which is the mark
 * exactly while the point is drawn at it — and a ranking cannot draw it there, because its
 * twenty-seven rows share one x and every hit point has to sit at the same x for the pointer to
 * resolve by row. The answer then rose in the right margin, a screen from the bar it named.
 */
import { placeOn } from "../assets/interaction.mjs";

/** The shape `getBoundingClientRect` returns, in the fields `placeOn` reads. */
const box = (left: number, top: number, width: number, height: number) => ({
  left,
  top,
  width,
  height,
  right: left + width,
  bottom: top + height,
});

describe("where the answer is drawn", () => {
  it("keeps the point's own position when the point sits inside its mark", () => {
    // A donut's arc, a radar's polygon, a column's own rect: the point is drawn ON the mark, and
    // every beat shipped today is right for that reason. Moving it would break them.
    const point = box(500, 300, 10, 10);
    const arc = box(200, 100, 600, 600);
    expect(placeOn(point, arc)).toEqual([505, 300]);
  });

  it("moves to the mark when the point is parked away from it", () => {
    // A ranking's hit proxy in the right margin, and the bar it names near the left.
    const proxy = box(980, 220, 10, 10);
    const bar = box(190, 218, 60, 12);
    expect(placeOn(proxy, bar)).toEqual([220, 218]);
  });

  it("keeps the point's own position when it names no mark at all", () => {
    const point = box(40, 80, 10, 10);
    expect(placeOn(point, null)).toEqual([45, 80]);
  });

  it("treats a point that merely overlaps its mark as outside it, so a proxy grazing an edge still moves", () => {
    const grazing = box(240, 218, 20, 12);
    const bar = box(190, 218, 60, 12);
    expect(placeOn(grazing, bar)).toEqual([220, 218]);
  });
});
