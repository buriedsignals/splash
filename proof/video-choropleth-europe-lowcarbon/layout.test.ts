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
    it("should run header, counter, stage, key and source top to bottom without overlapping, inside the insets", () => {
      const order = [
        rows.header,
        rows.counter,
        rows.stage,
        rows.key,
        rows.source,
      ];
      expect(order[0].top).toBeGreaterThanOrEqual(inset);
      for (let i = 1; i < order.length; i++)
        expect(order[i].top).toBeGreaterThan(order[i - 1].bottom);
      expect(order.at(-1)!.bottom).toBeLessThanOrEqual(
        row.height - inset + 0.01,
      );
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

    it("should right-align every count on the content's right edge, in its own row above the stage", () => {
      for (const line of lines.counter) expect(line.x).toBe(inset + content);
      expect(rows.counter.bottom).toBeLessThan(stage.y);
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

    it("should keep the key's words inside the content width", () => {
      for (const l of [lines.unit, lines.missingLabel])
        expect(l.x + measured(l.text, registers.axis)).toBeLessThanOrEqual(
          inset + content,
        );
    });

    it("should carry the widths an independent measurement finds", () => {
      expect(
        Math.abs(
          lines.eyebrow.width - measured(lines.eyebrow.text, registers.eyebrow),
        ),
      ).toBeLessThan(0.01);
      expect(
        Math.abs(
          lines.counter[7].width -
            measured(lines.counter[7].text, registers.value),
        ),
      ).toBeLessThan(0.01);
    });
  });
}
