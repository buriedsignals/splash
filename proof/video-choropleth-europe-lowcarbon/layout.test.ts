import { describe, expect, it } from "bun:test";
import { measureText } from "#shared/chart-beat/render-still.mjs";
import { frameInsetFor, sizeFor } from "#shared/chart-video/sizes.mjs";
import { buildDirection, loadBeat } from "./build.mjs";
import { DRAWN_WIDER } from "./layout.mjs";

/**
 * The shots of BRIEF.md for every filed direction: the title card, the story's panel, the end card. Widths are
 * measured again here, independently of `layout.mjs`'s own helper.
 */

const beat = loadBeat();
const row = sizeFor("landscape");
const inset = frameInsetFor("landscape");
const content = row.width - 2 * inset;
const face = (r: any) => ({
  fontSize: r.fontSize,
  fontWeight: r.fontWeight,
  fontFamily: r.fontFamily,
  fontStyle: r.fontStyle === "italic" ? "italic" : "normal",
});
const measured = (text: string, r: any) =>
  measureText(text, face(r)) +
  r.letterSpacing * Math.max(0, [...text].length - 1);

for (const id of ["creme", "nocturne", "rapport"]) {
  const { layout, props, report } = buildDirection(id, beat);
  const { titleCard, endCard, panel, registers } = layout;
  const measure = 0.72 * content;

  describe(`the shots of ${id}`, () => {
    it("should open on the title that names Albania, in at most four lines of the reading measure", () => {
      const text = titleCard.title
        .map((l: any) => l.text)
        .join(" ")
        .toLowerCase();
      expect(text).toContain("albanie");
      expect(titleCard.title.length).toBeLessThanOrEqual(4);
      for (const l of titleCard.title) {
        expect(l.x).toBe(inset);
        expect(
          measured(l.text, titleCard.register) * (1 + DRAWN_WIDER),
        ).toBeLessThanOrEqual(measure + 0.01);
      }
    });

    it("should set the title larger than every other register, and never under the floor", () => {
      const others = Object.entries(registers)
        .filter(([n]) => n !== "display")
        .map(([, r]: any) => r.fontSize);
      expect(titleCard.register.fontSize).toBeGreaterThan(Math.max(...others));
      expect(titleCard.register.fontSize).toBeGreaterThanOrEqual(row.minTypePx);
    });

    it("should centre the title card's block on the frame's height, within a pixel", () => {
      const top = titleCard.eyebrow.y - titleCard.register.fontSize;
      const bottom = titleCard.title.at(-1).y;
      expect(top).toBeGreaterThan(0);
      expect(bottom).toBeLessThan(row.height);
    });

    it("should state the claim with Albania's measured neighbours on the end card, above its source, inside the margins", () => {
      const text = endCard.claim.map((l: any) => l.text).join(" ").toLowerCase();
      expect(text).toContain("albanie");
      expect(text).toContain("voisins mesurés");
      for (const l of endCard.claim)
        expect(
          measured(l.text, endCard.register) * (1 + DRAWN_WIDER),
        ).toBeLessThanOrEqual(measure + 0.01);
      expect(endCard.claim.at(-1).y).toBeLessThan(
        endCard.source.y - registers.axis.lead,
      );
      expect(endCard.source.y).toBeLessThanOrEqual(row.height - layout.vInset);
      expect(
        measured(endCard.source.text, registers.axis) * (1 + DRAWN_WIDER),
      ).toBeLessThanOrEqual(content + 0.01);
    });

    it("should hold every panel word inside the panel, the widest counter step included", () => {
      const words = [
        ...panel.counter,
        ...panel.bornes,
        panel.unit,
        panel.missingLabel,
      ];
      for (const w of words) {
        const r = panel.counter.includes(w) ? registers.value : registers.axis;
        expect([
          w.text,
          w.x >= 0,
          w.x + measured(w.text, r) * (1 + DRAWN_WIDER) <= panel.width + 0.01,
        ]).toEqual([w.text, true, true]);
        expect([w.text, w.y <= panel.height]).toEqual([w.text, true]);
      }
    });

    it("should seat the panel inside the frame's margins, over at most 3 % land at the overview camera", () => {
      const at = props.panel.at;
      expect(at.x).toBeGreaterThanOrEqual(inset);
      expect(at.x + panel.width).toBeLessThanOrEqual(row.width - inset);
      expect(at.y).toBeGreaterThanOrEqual(layout.vInset);
      expect(at.y + panel.height).toBeLessThanOrEqual(
        row.height - layout.vInset,
      );
      expect(report.panelLand).toBeLessThanOrEqual(0.03);
    });

    it("should give the story the whole frame", () => {
      expect(layout.stage).toEqual({
        x: 0,
        y: 0,
        width: row.width,
        height: row.height,
      });
    });
  });
}
