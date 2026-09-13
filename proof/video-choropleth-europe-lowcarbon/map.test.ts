import { describe, expect, it } from "bun:test";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import {
  adjustToContrast,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/render-still.mjs";
import { registerOf } from "#shared/design-base/register.mjs";
import { makePlan, validatePlan } from "#shared/map-beat/plan.mjs";
import { validateExpressions } from "#shared/map-beat/mount.mjs";
import { plateTints } from "#shared/map-beat/tints.mjs";
import { readDirection } from "../../scripts/design-base/read-direction.mjs";
import { resolveDirectionFamilies } from "../../scripts/design-base/resolve-families.mjs";
import { videoRegistersOf } from "../../skills/map-beat/scripts/video-registers.mjs";
import {
  CAMERA_ASPECT,
  copyOf,
  loadSubject,
} from "../static-choropleth-europe-lowcarbon/beat.mjs";
import { caseCopy, videoCopyOf, videoLayoutFor } from "./layout.mjs";
import { cameraOf, videoMapFor } from "./map.mjs";
import { statesFor } from "./states.mjs";

const HERE = import.meta.dirname;
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const subject = loadSubject({
  dir: join(HERE, "..", "static-choropleth-europe-lowcarbon"),
});
const { textPerRegister } = copyOf(subject);

type Box = { x0: number; y0: number; x1: number; y1: number };
const overlaps = (a: Box, b: Box) =>
  a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
/** Even-odd, written again here rather than imported, so a drift in `map.mjs` cannot drift the check. */
const inside = (poly: number[][], [x, y]: number[]) => {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
      hit = !hit;
  }
  return hit;
};
const corners = (b: Box) => [
  [b.x0, b.y0],
  [b.x1, b.y0],
  [b.x0, b.y1],
  [b.x1, b.y1],
  [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2],
];

for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  describe(`the video map words for ${id}`, () => {
    const direction = resolveDirectionFamilies(
      readDirection(join(DIRECTIONS, file)),
      textPerRegister,
    );
    const resolved = Object.fromEntries(
      ["display", "eyebrow", "body", "annot", "value", "axis"].map((n) => [
        n,
        registerOf(direction, n),
      ]),
    );
    const registers = videoRegistersOf(resolved, "landscape");
    const layout = videoLayoutFor({
      registers,
      copy: caseCopy(videoCopyOf(subject), registers),
      aspect: CAMERA_ASPECT,
      size: "landscape",
    });
    const states = statesFor(subject, { drawn: layout.drawn });
    const map = videoMapFor({
      direction,
      subject,
      layout,
      states,
      tints: plateTints(direction),
      accentInk: adjustToContrast(
        direction.accent,
        direction.ground,
        TEXT_CONTRAST_MIN,
      ),
      strokeScale: 2.5,
    });
    const words = map.words as any[];
    const subjectWord = words.find((w) => w.group === "subject");
    const zoomBoxes: Box[] = [
      ...words.filter((w) => w.group === "neighbours").map((w) => w.box),
      subjectWord.boxes.zoomed,
    ];
    const overviewBoxes: Box[] = [
      ...words.filter((w) => w.group === "names").map((w) => w.box),
      subjectWord.boxes.overview,
    ];
    const ring = map.layers.find((l: any) => l.id === "subject-ring").data
      .features[0].geometry.coordinates;
    const size = layout.drawn;

    it("should build a plan with no violations", () => {
      const plan = makePlan({
        style: { name: "dataviz-light" },
        camera: {
          bounds: [
            [0, 0],
            [1, 1],
          ],
          drawn: size,
        },
        layers: map.layers,
      });
      expect([...validatePlan(plan), ...validateExpressions(plan)]).toEqual([]);
    });

    it("should set every map word at or over the 30px landscape floor", () => {
      for (const layer of map.layers.filter((l: any) => l.type === "symbol"))
        expect(layer.layout["text-size"]).toBeGreaterThanOrEqual(30);
    });

    it("should name the ring-neighbour outside the data at the zoom", () => {
      expect(
        words.some(
          (w) => w.group === "neighbours" && /hors données$/.test(w.text),
        ),
      ).toBe(true);
    });

    it("should keep every zoom word clear of every other zoom word", () => {
      for (let i = 0; i < zoomBoxes.length; i++)
        for (let j = i + 1; j < zoomBoxes.length; j++)
          expect(overlaps(zoomBoxes[i], zoomBoxes[j])).toBe(false);
    });

    it("should keep every overview word clear of every other overview word", () => {
      for (let i = 0; i < overviewBoxes.length; i++)
        for (let j = i + 1; j < overviewBoxes.length; j++)
          expect(overlaps(overviewBoxes[i], overviewBoxes[j])).toBe(false);
    });

    it("should keep every word inside the map box, unclipped", () => {
      for (const b of [...zoomBoxes, ...overviewBoxes]) {
        expect(b.x0).toBeGreaterThanOrEqual(0);
        expect(b.y0).toBeGreaterThanOrEqual(0);
        expect(b.x1).toBeLessThanOrEqual(size.width);
        expect(b.y1).toBeLessThanOrEqual(size.height);
      }
    });

    it("should keep every zoom word off the ring and outside it", () => {
      const poly = ring.map(cameraOf(states[3], size).toPx);
      for (const b of zoomBoxes) {
        expect(corners(b).some((p) => inside(poly, p))).toBe(false);
        expect(
          poly.some(
            ([x, y]: number[]) => x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1,
          ),
        ).toBe(false);
      }
    });

    it("should carry the subject's word from the zoom (1) to the overview (0) in checked steps", () => {
      const closings = subjectWord.offsets.map((o: number[]) => o[0]);
      expect(closings[0]).toBe(1);
      expect(closings.at(-1)).toBe(0);
      expect(closings.length).toBeGreaterThan(2);
    });
  });
}
