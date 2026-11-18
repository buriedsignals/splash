import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// gx-connected-scatter web, Gemma 12B (mvg7, 2026-11-18): the phone frame was 10px too tall three times. The refusal
// asked for a shorter limits form "the phone draws"; the model wrote one ("European shares."), and the kit drew only
// limits' first form, so nothing the model could write changed the page. The phone now draws the last form.
const dir = join(import.meta.dir, "../craft/web/connected-scatter");
const render = readFileSync(join(dir, "render-beat.mjs"), "utf8");
const tsx = readFileSync(join(dir, "DirectedConnectedScatterWeb.tsx"), "utf8");

describe("the connected-scatter web caveat on a phone", () => {
  it("should pass limits' last form to the page", () => {
    expect(render).toMatch(/caveatShort = plain\(\[beat\.limits\]\.flat\(\)\.at\(-1\)\)/);
  });
  it("should hide the long caveat for the short one at phone width", () => {
    expect(tsx).toMatch(/@media \(max-width: 480px\) \{ \$\{SCOPE\} \.caveat-long\.has-short \{ display: none; \} \$\{SCOPE\} \.caveat-short \{ display: inline; \} \}/);
  });
  it("should write both forms in the caveat line", () => {
    expect(tsx).toMatch(/<span className=\{caveatShort && caveatShort !== caveat \? "caveat-long has-short" : "caveat-long"\}>\{caveat\}<\/span>/);
  });
});

// gx-connected-scatter web, Gemma 12B (mvg9, 2026-11-18): the vertical-axis title "Share of European low-carbon output
// (16 countries)" never wrapped, so the phone page was 395px wide in a 375px window, and the refusal named no field.
// The title sits at the plot's left edge, left of the page's centre; half the window less the gutter always fits.
describe("the connected-scatter web vertical-axis title on a phone", () => {
  it("should wrap within half the window at phone width", () => {
    expect(tsx).toMatch(/@media \(max-width: 480px\) \{ \$\{SCOPE\} \.y-title \{ white-space: normal !important; width: max-content; max-width: calc\(50vw - 24px\); \} \}/);
  });
});
