import { describe, expect, it } from "bun:test";
import { measureText } from "#shared/chart-beat/render-still.mjs";
import { applyCase } from "#shared/chart-beat/registers.mjs";
import { frameInsetFor, sizeFor } from "#shared/chart-video/sizes.mjs";
import { buildDirection, loadBeat } from "./build.mjs";
import { DRAWN_WIDER } from "./layout.mjs";

/**
 * The rows of BRIEF.md, « The picture », for every filed direction: header, counter, stage, key, source,
 * top to bottom, none overlapping, the title and the source on one line, the stage the full content width.
 * Widths are measured again here, independently of `layout.mjs`'s own helper.
 */

const beat = loadBeat();
const DIRECTIONS = ["creme", "nocturne", "rapport"];
const row = sizeFor("landscape");
const inset = frameInsetFor("landscape");
const content = row.width - 2 * inset;
const budget = content / (1 + DRAWN_WIDER);
const face = (r: any) => ({
  fontSize: r.fontSize,
  fontWeight: r.fontWeight,
  fontFamily: r.fontFamily,
  fontStyle: r.fontStyle === "italic" ? "italic" : "normal",
});
const measured = (text: string, r: any) =>
  measureText(text, face(r)) +
  r.letterSpacing * Math.max(0, [...text].length - 1);

for (const id of DIRECTIONS) {
  const { layout, props } = buildDirection(id, beat);
  const { rows, lines, stage, registers } = layout;

  describe(`the rows of ${id}`, () => {
    it("should start the header at the top margin, end the source within one axis lead of the bottom margin, and give the stage exactly the rest", () => {
      const vInset = layout.vInset;
      expect(rows.header.top).toBe(vInset);
      expect(row.height - vInset - rows.source.bottom).toBeGreaterThanOrEqual(-0.01);
      expect(row.height - vInset - rows.source.bottom).toBeLessThanOrEqual(registers.axis.lead);
      expect(stage.y).toBeGreaterThan(rows.header.bottom);
      expect(stage.y - rows.header.bottom).toBeLessThanOrEqual(registers.axis.lead / 2);
      expect(rows.key.top - (stage.y + stage.height)).toBeGreaterThan(0);
      expect(rows.key.top - (stage.y + stage.height)).toBeLessThanOrEqual(registers.axis.lead / 2);
      expect(rows.source.top).toBeGreaterThanOrEqual(rows.key.top);
    });

    it("should take the frame's top and bottom margin from frameInsetFor's rule read on the height", () => {
      expect(layout.vInset).toBe(Math.max(Math.round((40 / 900) * row.height), row.minTypePx * 2));
    });

    it("should give the map at least 690 px of height", () => {
      expect(stage.height).toBeGreaterThanOrEqual(690);
    });

    it("should never set the counter on a row of its own when the title's or the eyebrow's line can hold it", () => {
      const counterW = Math.max(...lines.counter.map((l: any) => l.width));
      const fitsTitle = lines.title.width + registers.axis.lead + counterW <= budget;
      const fitsEyebrow = lines.eyebrow.width + registers.axis.lead + counterW <= budget;
      expect(layout.counterPlace).toBe(fitsTitle ? "title" : fitsEyebrow ? "eyebrow" : "row");
      const y = lines.counter[0].y;
      if (layout.counterPlace === "eyebrow") expect(y).toBe(lines.eyebrow.y);
      if (layout.counterPlace === "title") expect(y).toBe(lines.title.y);
      expect(y).toBeLessThan(stage.y);
    });

    it("should set the key's label straight after the « 94 % » borne, on the bornes' line", () => {
      const last = lines.bornes.at(-1);
      expect(lines.unit.y).toBe(last.y);
      expect(lines.unit.x - (last.x + last.width)).toBeGreaterThan(0);
      expect(lines.unit.x - (last.x + last.width)).toBeLessThanOrEqual(registers.axis.lead);
    });

    it("should give the map stage the full width between the insets", () => {
      expect([stage.x, stage.width]).toEqual([inset, content]);
    });

    it("should set the title on one line within the width the agreement leaves", () => {
      expect(lines.title.x).toBe(inset);
      expect(measured(lines.title.text, registers.display)).toBeLessThanOrEqual(
        budget,
      );
    });

    it("should take the longest title form that holds one line — every longer form is too wide even one quarter pixel above the next largest register", () => {
      const largest = Math.max(
        ...["eyebrow", "body", "annot", "value", "axis"].map(
          (n) => (layout.registers as any)[n].fontSize,
        ),
      );
      const drawn = layout.title.drawnFontSize;
      const forms = beat.copy.title;
      for (let form = 0; form < layout.title.form; form++) {
        const size = (Math.floor(largest * 4) + 1) / 4;
        const display = {
          ...registers.display,
          fontSize: size,
          letterSpacing:
            (registers.display.letterSpacing * size) /
            registers.display.fontSize,
        };
        expect(
          measured(
            applyCase(forms[form], registers.display.transform),
            display,
          ),
        ).toBeGreaterThan(budget);
      }
      expect(layout.title.fontSize).toBeLessThanOrEqual(drawn);
    });

    it("should keep the display the largest register drawn", () => {
      for (const name of ["eyebrow", "value", "axis", "annot"])
        expect(registers.display.fontSize).toBeGreaterThan(
          (registers as any)[name].fontSize,
        );
    });

    it("should draw every register at the 30 px floor or over it", () => {
      for (const r of Object.values(props.registers) as any[])
        expect(r.fontSize).toBeGreaterThanOrEqual(row.minTypePx);
    });

    it("should right-align every count on the content's right edge", () => {
      for (const line of lines.counter) expect(line.x).toBe(inset + content);
    });

    it("should set the source on one line within the budget", () => {
      expect(measured(lines.source.text, registers.axis)).toBeLessThanOrEqual(
        budget,
      );
    });

    it("should centre each borne on its swatch boundary without two bornes touching", () => {
      lines.bornes.forEach((b: any, i: number) => {
        // The boundary between class i and class i + 1 is where swatch i + 1 begins.
        expect(
          Math.abs(b.x + b.width / 2 - layout.swatches[i + 1].x),
        ).toBeLessThan(1);
        if (i > 0)
          expect(b.x).toBeGreaterThan(
            lines.bornes[i - 1].x + lines.bornes[i - 1].width,
          );
      });
    });

    it("should keep the key's words inside the content width, clear of each other", () => {
      const boxes = [...lines.bornes, lines.unit, lines.missingLabel].map((l: any) => ({ x: l.x, y: l.y, w: measured(l.text, registers.axis) }));
      for (const b of boxes) expect(b.x + b.w).toBeLessThanOrEqual(inset + content);
      for (let i = 0; i < boxes.length; i++)
        for (let j = i + 1; j < boxes.length; j++)
          if (boxes[i].y === boxes[j].y) expect(boxes[i].x + boxes[i].w < boxes[j].x || boxes[j].x + boxes[j].w < boxes[i].x).toBe(true);
      expect(layout.missingSwatch.x + layout.missingSwatch.width).toBeLessThan(lines.missingLabel.x);
    });

    it("should carry the widths an independent measurement finds", () => {
      expect(
        Math.abs(
          lines.eyebrow.width - measured(lines.eyebrow.text, registers.eyebrow),
        ),
      ).toBeLessThan(0.01);
      expect(
        Math.abs(
          lines.counter.at(-1).width -
            measured(lines.counter.at(-1).text, registers.value),
        ),
      ).toBeLessThan(0.01);
    });
  });
}
