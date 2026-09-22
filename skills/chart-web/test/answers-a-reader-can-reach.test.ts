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
