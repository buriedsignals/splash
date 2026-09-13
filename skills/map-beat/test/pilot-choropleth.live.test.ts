// LANE: heavy
import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { assertPlateMatchesMarks } from "#shared/map-beat/geometry.mjs";
import { LADDERS } from "#shared/design-base/resolve-families.mjs";
import { applyCase } from "#shared/chart-beat/registers.mjs";
import { measureText } from "#shared/chart-beat/render-still.mjs";
import { TEXT_CONTRAST_MIN, contrast } from "#shared/chart-beat/colour.mjs";
import { readDirection } from "../../../scripts/design-base/read-direction.mjs";
import { resolveDirectionFamilies } from "../../../scripts/design-base/resolve-families.mjs";
import {
  mapGeometryFor,
  subjectRingOf,
} from "../../../proof/static-choropleth-europe-lowcarbon/DirectedChoroplethMap.tsx";

const BEAT_DIR = join(
  import.meta.dirname,
  "../../../proof/static-choropleth-europe-lowcarbon",
);
const DIRECTION_DIR = join(import.meta.dirname, "../../../docs/design-base/directions");

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

  /**
   * THE LAYOUT ABSORBS A FACE SWAP — the whole point of sizing a register to a cap height and
   * letting the headline trade size for form.
   *
   * `resolveDirectionFamilies` picks the family by asking each candidate on the role's ladder
   * whether it covers this beat's own text, so ONE new character in the headline can move the face.
   * When it does, nothing about the page should move with it: the same headline form, in the same
   * number of lines, in the same panel, over the same map. Only the point size adapts, because at
   * one cap height two faces still set at different widths.
   *
   * This is run on the beat's OWN copy — imported from the runner rather than declared here —
   * because a synthetic headline would prove the mechanism and not the picture.
   */
  it(
    "should keep the same headline, in the same lines and the same panel, on every family its ladder can pick",
    async () => {
      const { copy } = await runner();
      const directions = readdirSync(DIRECTION_DIR).filter((f) => f.endsWith(".md"));
      expect(directions.length).toBeGreaterThanOrEqual(3);
      for (const file of directions) {
        const filed = resolveDirectionFamilies(
          readDirection(join(DIRECTION_DIR, file)),
          copy.textPerRegister,
        );
        const role = filed.decisions.find((d: any) => d.register === "display").role;
        const ladder: string[] = LADDERS[role];
        expect(ladder.length).toBeGreaterThan(1);
        const layoutOn = (family: string) => {
          const g = mapGeometryFor({
            aspect: copy.aspect,
            callout: copy.callout,
            title: copy.title,
            limits: copy.limits,
            reading: copy.reading,
            source: copy.source,
            direction: {
              ...filed,
              registers: {
                ...filed.registers,
                display: { ...filed.registers.display, family },
              },
            },
          });
          return {
            headline: g.rung.title,
            lines: g.layout.titleLines.length,
            standfirst: g.rung.limit,
            reading: g.rung.reading,
            panel: g.panel,
            map: Math.round(g.mapW),
            /** Not compared — reported, so a failure says what DID move. */
            size: g.display.fontSize,
          };
        };
        const reference = layoutOn(filed.registers.display.family);
        const sizes = new Set<number>();
        for (const family of ladder) {
          const got = layoutOn(family);
          sizes.add(got.size);
          expect([file, family, { ...got, size: undefined }]).toEqual([
            file,
            family,
            { ...reference, size: undefined },
          ]);
        }
        /** AND THE MECHANISM IS NOT INERT. If every family came out at the same point size, the
         *  layout would be identical because nothing adapted, and this test would be proving
         *  nothing at all. */
        expect([file, sizes.size > 1]).toEqual([file, true]);
      }
    },
    RUN_MS,
  );

  /**
   * A LABEL GOES NEAR ITS FEATURE, AND NEVER OVER ANOTHER LABEL — the owner's own two rules, held
   * against the placement the picture was actually drawn from.
   */
  it(
    "should place every word near its own feature, inside the crop, and clear of every other word",
    async () => {
      const { placements } = await runner();
      expect(Object.keys(placements).length).toBeGreaterThan(0);
      for (const [id, { placement, geometry: g, registers }] of Object.entries(placements)) {
        const mapW = g.mapW;
        const boxOf = (text: string, x: number, y: number, reg: any) => {
          const half =
            (measureText(applyCase(text, reg.transform), {
              fontSize: reg.fontSize,
              fontWeight: reg.fontWeight,
              fontFamily: reg.fontFamily,
            }) +
              Number(reg.letterSpacing ?? 0) * Math.max(0, text.length - 1)) /
            2;
          return {
            what: text,
            x0: x * mapW - half,
            x1: x * mapW + half,
            y0: y * mapW - g.axisBand.ascent,
            y1: y * mapW + g.axisBand.descent,
          };
        };
        const boxes = [
          ...placement.labels.map((l: any) =>
            boxOf(l.text, l.x, l.y, l.klass === "feature" ? registers.feature : registers.area),
          ),
          ...placement.waters.map((w: any) => boxOf(w.text, w.x, w.y, registers.water)),
        ];
        expect([id, boxes.length]).toEqual([
          id,
          placement.labels.length + placement.waters.length,
        ]);
        /** AND EVERY NAME THE BEAT ASKED FOR IS ON THE MAP. Before the relaxation the search had to
         *  find open water and could not for two or three of them a direction — `Finlande`,
         *  `Chypre`, `Moldavie` were dropped to the standfirst. A word the search cannot place is
         *  still allowed and still reported; that it no longer happens here is the measurement. */
        expect([id, placement.notOnTheMap]).toEqual([id, []]);

        /** NO TWO TEXT LABELS TOUCH. The one hard rule the owner left in place when he allowed a
         *  label onto land. */
        for (let i = 0; i < boxes.length; i++)
          for (let j = i + 1; j < boxes.length; j++) {
            const a = boxes[i];
            const b = boxes[j];
            const apart = a.x1 < b.x0 || b.x1 < a.x0 || a.y1 < b.y0 || b.y1 < a.y0;
            expect(`${id} ${a.what} / ${b.what} ${apart ? "clear" : "OVERLAP"}`).toBe(
              `${id} ${a.what} / ${b.what} clear`,
            );
          }

        /** AND EVERY WORD IS WHOLLY INSIDE THE CROP — the bound that stopped `Mer Méditerranée`
         *  being cut by the bottom edge and `CHYPRE` by the right one. Measured in the map's own
         *  drawn rectangle, which is what the plate shows; the plate is wider than the box and the
         *  surplus east is cropped away. */
        for (const box of boxes) {
          const inside =
            box.x0 >= 0 &&
            box.x1 <= g.mapBox.width &&
            box.y0 >= g.mapBox.y - g.mapY &&
            box.y1 <= g.mapBox.y + g.mapBox.height - g.mapY;
          expect(`${id} ${box.what} ${inside ? "in frame" : "CROPPED"}`).toBe(
            `${id} ${box.what} in frame`,
          );
        }

        /** AND NEAR ITS FEATURE. Every leader is short — a name sitting on or beside its own
         *  country — where the search that only accepted open water walked `SUISSE` 250 px into the
         *  Mediterranean and `ALBANIE` 195 px into the Black Sea. The bound is one map width's
         *  worth of a tenth, the same leash the sea ladder has always been held to. */
        for (const l of placement.labels) {
          if (!l.from) continue;
          const away = Math.hypot(l.x - l.from.x, l.y - l.from.y) * mapW;
          expect(
            `${id} ${l.text} ${away <= mapW * 0.1 ? "near" : `${away.toFixed(0)}px away`}`,
          ).toBe(`${id} ${l.text} near`);
          /** AND ITS LEADER IS VISIBLE. `MOLDAVIE` is four times as wide as Moldova: the word sat
           *  straight on the seat, so the line and the dot that say which country it names were
           *  drawn underneath its own halo. A leader that starts inside the word it points from
           *  tells the reader nothing. */
          const box = boxes.find((b: any) => b.what === l.text)!;
          const seatX = l.from.x * mapW;
          const seatY = l.from.y * mapW;
          const outside =
            seatX <= box.x0 ||
            seatX >= box.x1 ||
            seatY <= box.y0 ||
            seatY >= box.y1;
          expect(
            `${id} ${l.text} leader ${outside ? "emerges" : "HIDDEN under the word"}`,
          ).toBe(`${id} ${l.text} leader emerges`);
        }

        /** AND THE SUBJECT'S OWN WORD IS OFF ITS RING. `ALBANIE` is the word nearest a ring now
         *  that near is what the search wants, and a word struck through the mark that singles its
         *  country out defeats the mark. The radius is `subjectRingOf`'s, the runner's own. */
        {
          const subject = placement.labels.find((l: any) => l.iso === "ALB");
          expect([id, Boolean(subject)]).toEqual([id, true]);
          const seat = subject.from ?? { x: subject.x, y: subject.y };
          const reach = subjectRingOf({ width: 0, height: 0 }, mapW, {
            stroke: { rule: 1 },
          }).radius;
          const box = boxes.find((b: any) => b.what === subject.text)!;
          const clear =
            box.x1 < seat.x * mapW - reach ||
            box.x0 > seat.x * mapW + reach ||
            box.y1 < seat.y * mapW - reach ||
            box.y0 > seat.y * mapW + reach;
          expect(
            `${id} ${subject.text} ${clear ? "clear of its ring" : "ON its ring"}`,
          ).toBe(`${id} ${subject.text} clear of its ring`);
        }

      }
    },
    RUN_MS,
  );

  /**
   * AND READABLE ON WHATEVER IT LANDED ON — measured on the LAYER the plate is baked from, not on
   * the search that chose the spot.
   *
   * Allowing a word onto land is what makes this load-bearing: a name used to land on open water or
   * on its own class and nothing else, and now it can land on a neighbour's. The two middle classes
   * of the ramp are the cells no variant of any of the three accents reaches 7:1 on, so a feature
   * name over one of them would be a word the reader cannot read — the search refuses those spots,
   * and this is what says the refusal held all the way into the picture.
   */
  it(
    "should draw every placed word in an ink that reaches its floor on the cell under it",
    async () => {
      const { plans } = await runner();
      let words = 0;
      for (const [id, plan] of Object.entries(plans))
        for (const layer of plan.layers) {
          if (layer.type !== "symbol" || layer.id === "sea-names") continue;
          const floor = layer.id === "named-areas" ? 7 : TEXT_CONTRAST_MIN;
          for (const feature of layer.data.features) {
            words++;
            const { ink, onCell, name } = feature.properties;
            expect(`${id} ${name} ink`).toBe(`${id} ${name} ink`);
            expect(typeof ink).toBe("string");
            const measured = contrast(ink, onCell);
            expect(
              `${id} ${name} ${measured >= floor ? "legible" : `${measured.toFixed(2)}:1 on ${onCell}`}`,
            ).toBe(`${id} ${name} legible`);
          }
        }
      expect(words).toBeGreaterThan(20);
    },
    RUN_MS,
  );
});