// LANE: heavy
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { assertPlateMatchesMarks } from "#shared/map-beat/geometry.mjs";

const BEAT_DIR = join(
  import.meta.dirname,
  "../../../proof/static-choropleth-europe-lowcarbon",
);

/** A PNG's own header, not the runner's word for it: bytes 16-24 of the file are the IHDR's width
 *  and height, big-endian. The whole point of this task is that the plate is baked at the size the
 *  layout published, and asking the thing that published it would prove nothing. */
function pngSize(path: string) {
  const head = readFileSync(path).subarray(0, 24);
  return { width: head.readUInt32BE(16), height: head.readUInt32BE(24 - 4) };
}

/** Every drawn point in an SVG element, in user units. `<text>`/`<circle>` carry theirs as
 *  attributes; a `<path>` carries them in `d`, which for this beat is only ever `M x y L x y … Z`. */
function markPoints(svg: string) {
  const out: Array<{ what: string; x: number; y: number }> = [];
  for (const m of svg.matchAll(/<text[^>]*\sx="([-\d.]+)"[^>]*\sy="([-\d.]+)"/g))
    out.push({ what: "text", x: Number(m[1]), y: Number(m[2]) });
  for (const m of svg.matchAll(/<circle[^>]*\scx="([-\d.]+)"[^>]*\scy="([-\d.]+)"/g))
    out.push({ what: "circle", x: Number(m[1]), y: Number(m[2]) });
  for (const m of svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)) {
    const nums = [...m[1].matchAll(/-?[\d.]+/g)].map((n) => Number(n[0]));
    for (let i = 0; i + 1 < nums.length; i += 2) out.push({ what: "path", x: nums[i], y: nums[i + 1] });
  }
  return out;
}

/** Importing the runner RUNS the beat: it renders three stills through the rasteriser, which takes
 *  minutes rather than seconds, and it re-bakes any plate whose plan, tints or drawn size have
 *  moved — which spends a MapTiler key and is why this file is in the LIVE lane. The module is
 *  evaluated once and every test here shares it. */
const RUN_MS = 600_000;
const runner = () =>
  import("../../../proof/static-choropleth-europe-lowcarbon/render-directions.mjs");

describe("the pilot choropleth on the plan", () => {
  it(
    "should still name the same countries above the floor",
    async () => {
      const { report } = await runner();
      expect(report.above.map((r) => r.iso).sort()).toEqual([
        "ALB",
        "CHE",
        "FIN",
        "FRA",
        "ISL",
        "NOR",
        "SWE",
      ]);
    },
    RUN_MS,
  );

  it(
    "should carry no beat layer that redraws the basemap",
    async () => {
      const { plans } = await runner();
      expect(Object.keys(plans).length).toBeGreaterThan(0);
      for (const plan of Object.values(plans))
        for (const layer of plan.layers)
          expect(layer.role ?? "").not.toMatch(/^basemap-/);
    },
    RUN_MS,
  );

  it(
    "should place the plate exactly where the marks are drawn",
    async () => {
      const { geometry } = await runner();
      expect(Object.keys(geometry).length).toBeGreaterThan(0);
      for (const g of Object.values(geometry)) {
        expect(g.plate.width).toBeCloseTo(g.mapW, 1);
        expect(g.plate.height).toBeCloseTo(g.mapH, 1);
        expect(g.plate.x).toBeCloseTo(g.mapX, 1);
        expect(g.plate.y).toBeCloseTo(g.mapY, 1);
      }
    },
    RUN_MS,
  );

  it(
    "should publish a drawn size on every plan, in whole pixels",
    async () => {
      const { plans } = await runner();
      expect(Object.keys(plans).length).toBeGreaterThan(0);
      for (const plan of Object.values(plans)) {
        expect(Number.isInteger(plan.camera.drawn.width)).toBe(true);
        expect(Number.isInteger(plan.camera.drawn.height)).toBe(true);
        expect(plan.camera.drawn.width).toBeGreaterThan(0);
      }
    },
    RUN_MS,
  );

  it(
    "should bake each plate at the size the layout published, times the bake's own scale",
    async () => {
      const { plans } = await runner();
      expect(Object.keys(plans).length).toBeGreaterThan(0);
      for (const [id, plan] of Object.entries(plans)) {
        /** `deviceScaleFactor: 2` in `bakePlan`, which is what makes the plate's pixels line up
         *  one for one with the still's own `scale: 2`. */
        const png = pngSize(join(BEAT_DIR, "plate", id, "plate.png"));
        expect(png).toEqual({
          width: plan.camera.drawn.width * 2,
          height: plan.camera.drawn.height * 2,
        });
      }
    },
    RUN_MS,
  );

  it(
    "should pass the trunk's own plate-on-the-marks guard for every direction",
    async () => {
      const { geometry } = await runner();
      expect(Object.keys(geometry).length).toBeGreaterThan(0);
      for (const g of Object.values(geometry)) expect(() => assertPlateMatchesMarks(g)).not.toThrow();
    },
    RUN_MS,
  );

  it(
    "should draw nothing over the geography — the marks are in the plate, not in the SVG",
    async () => {
      const { geometry } = await runner();
      expect(Object.keys(geometry).length).toBeGreaterThan(0);
      for (const [id, g] of Object.entries(geometry)) {
        const svg = readFileSync(join(BEAT_DIR, "renders", `${id}.svg`), "utf8");
        const inside = markPoints(svg).filter(
          (p) =>
            p.x >= g.mapX && p.x <= g.mapX + g.mapW && p.y >= g.mapY && p.y <= g.mapY + g.mapH,
        );
        /** This is the one that proves the marks actually MOVED. Without it a render that still
         *  draws every class, border and word in SVG over a correct plate passes everything else
         *  here. */
        expect(inside).toEqual([]);
        /** …AND THE PLATE IS NO LONGER STRETCHED. It is baked at exactly this box, so there is
         *  nothing left to fit; leaving the attribute in would let a future size mismatch squash
         *  the geography silently instead of showing as a mismatch. */
        expect(svg).not.toContain("preserveAspectRatio");
      }
    },
    RUN_MS,
  );

  it(
    "should name a MapTiler FACE on every symbol layer, never a bare family",
    async () => {
      const { plans } = await runner();
      expect(Object.keys(plans).length).toBeGreaterThan(0);
      /** MapTiler answers 200 for a family it does not serve and hands back Noto Sans. `Open Sans`
       *  is such a name — measured byte-identical to the fallback — and it is exactly what a
       *  register's `fontFamily` is, so a plan that declared it would have set the whole map in a
       *  typeface nobody chose. A served name ends in a face. */
      const FACE = /\s(Regular|Medium|Bold)( Italic)?$|\sItalic$/;
      let symbols = 0;
      for (const plan of Object.values(plans))
        for (const layer of plan.layers) {
          if (layer.type !== "symbol") continue;
          symbols++;
          for (const face of layer.layout["text-font"]) expect(face).toMatch(FACE);
        }
      expect(symbols).toBeGreaterThan(0);
    },
    RUN_MS,
  );
});