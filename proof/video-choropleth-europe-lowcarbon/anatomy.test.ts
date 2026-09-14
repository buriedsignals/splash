import { describe, expect, it } from "bun:test";
import { contrast } from "#shared/chart-beat/colour.mjs";
import { measureTextBand } from "#shared/chart-beat/render-still.mjs";
import { buildDirection, loadBeat } from "./build.mjs";
import { toStage } from "./scene.mjs";

/**
 * THE STILL'S ANATOMY, ON THE VIDEO'S PROPS — measured again here on the drawn shapes, not read back from
 * `build.mjs`'s own grids: every map word uppercased and readable on every cell it crosses in every state it is
 * seen in, set wholly inside its country or led to it, the seas in open water near their own centres, the panel
 * off the seven — and no sentence written where the picture can show it.
 */

const beat = loadBeat();
const ringsOf = (path: string) =>
  path
    .split("Z")
    .filter(Boolean)
    .map((ring) => ring.replace(/^M/, "").split("L").map((p) => p.split(" ").map(Number)));
const insideRing = (ring: number[][], x: number, y: number) => {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
};
const SEEN: Record<string, string[]> = { top: ["filtered", "classes"], odd: ["classes"], missing: ["classes"], context: ["classes"], neighbour: ["classes"] };

for (const id of ["creme", "nocturne", "rapport"]) {
  const { props } = buildDirection(id, beat);
  const { stage, cameras, colours } = props;
  const shapes = props.shapes.map((s: any) => ({ ...s, rings: ringsOf(s.path) }));
  const toMap = (camera: "overview" | "closeUp", sx: number, sy: number) => ({
    x: cameras[camera].x + (sx / stage.width) * cameras[camera].w,
    y: cameras[camera].y + (sy / stage.height) * cameras[camera].h,
  });
  const shapeUnder = (camera: "overview" | "closeUp", sx: number, sy: number) => {
    const p = toMap(camera, sx, sy);
    return shapes.find((s: any) => s.rings.some((r: number[][]) => insideRing(r, p.x, p.y))) ?? null;
  };
  const cellOf = (shape: any, state: string) => {
    if (!shape) return colours.sea;
    if (shape.classIndex === null) return shape.fill;
    return state === "filtered" && !shape.kept ? colours.land : colours.classFills[shape.classIndex];
  };
  const gap = 0.25 * props.registers.axis.lead;
  const touches = (a: any, b: any) => a.x < b.x + b.width + gap && b.x < a.x + a.width + gap && a.y < b.y + b.height + gap && b.y < a.y + a.height + gap;

  describe(`${id}'s map anatomy`, () => {
    it("should set every map name in capitals, the seven in the feature weight and the rest in the area weight", () => {
      for (const n of props.names) {
        expect([n.key, n.text]).toEqual([n.key, n.text.toUpperCase()]);
        const weight = props.registers[n.register].fontWeight;
        expect([n.key, weight]).toEqual([n.key, n.role === "top" || n.role === "odd" ? 700 : props.registers.area.fontWeight]);
      }
    });

    it("should set every name in an ink that reads on every cell its line crosses, in every state it is seen in", () => {
      for (const n of props.names) {
        const floor = n.role === "top" || n.role === "odd" ? 7 : 4.5;
        const cy = n.y + n.height / 2;
        const half = (0.9 * (n.width - n.halo)) / 2;
        const points = n.role === "odd" ? [n.x + n.width / 2] : Array.from({ length: 9 }, (_, i) => n.x + n.width / 2 - half + (2 * half * i) / 8);
        for (const px of points)
          for (const state of SEEN[n.role]) {
            const cell = cellOf(shapeUnder(n.camera, px, cy), state);
            expect([n.key, Math.round(px), state, contrast(n.ink, cell) >= floor - 0.05]).toEqual([n.key, Math.round(px), state, true]);
          }
      }
    });

    it("should set every name but Albania's wholly inside its country, or lead it there from a seat outside its box", () => {
      for (const n of props.names.filter((x: any) => x.role !== "odd")) {
        if (!n.leader) {
          const own = shapes.find((s: any) => s.key === n.key.split(":").slice(1).join(":"));
          const cy = n.y + n.height / 2;
          const reach = (0.9 * (n.width - n.halo)) / 2;
          const inside = [0, -reach / 2, reach / 2, -reach, reach].every((dx) => {
            const p = toMap(n.camera, n.x + n.width / 2 + dx, cy);
            return own.rings.some((r: number[][]) => insideRing(r, p.x, p.y));
          });
          expect([n.key, inside]).toEqual([n.key, true]);
          continue;
        }
        const outside = n.seat.x < n.x || n.seat.x > n.x + n.width || n.seat.y < n.y || n.seat.y > n.y + n.height;
        expect([n.key, outside, n.leader.from]).toEqual([n.key, true, n.seat]);
        const onBox = Math.abs(n.leader.to.x - Math.min(Math.max(n.seat.x, n.x), n.x + n.width)) < 1e-6 && Math.abs(n.leader.to.y - Math.min(Math.max(n.seat.y, n.y), n.y + n.height)) < 1e-6;
        expect([n.key, onBox]).toEqual([n.key, true]);
      }
    });

    it("should name the seas in open water, inside the margins, within two and a half leads of their centres, clear of every name and of the panel", () => {
      expect(props.waters.length).toBeGreaterThanOrEqual(2);
      const panel = { ...props.panel.at, width: props.panel.width, height: props.panel.height };
      for (const w of props.waters) {
        const declared = beat.copy.waters.find((d: any) => d.key === w.key);
        const [ux, uy] = beat.geometry.project([declared.lon, declared.lat]);
        const centre = toStage(cameras.overview, stage, { x: ux, y: uy });
        const halo = props.halos.water;
        const size = props.registers.water.fontSize;
        const r = props.registers.water;
        const band = measureTextBand(w.text, { fontSize: r.fontSize, fontWeight: r.fontWeight, fontFamily: r.fontFamily, fontStyle: "italic" });
        const box = { x: w.x - halo / 2, y: w.y - band.ascent - halo / 2, width: w.width + halo, height: band.ascent + band.descent + halo };
        expect([w.key, Math.hypot(w.x + w.width / 2 - centre.x, w.y - centre.y) <= 2.5 * props.registers.axis.lead + 1e-6]).toEqual([w.key, true]);
        for (let i = 0; i <= 12; i++) expect([w.key, i, shapeUnder("overview", w.x + (w.width * i) / 12, w.y - size / 2)]).toEqual([w.key, i, null]);
        for (const n of props.names.filter((x: any) => x.camera === "overview")) expect([w.key, n.key, touches(box, n)]).toEqual([w.key, n.key, false]);
        expect([w.key, touches(box, panel)]).toEqual([w.key, false]);
        expect([w.key, w.x >= props.layoutInset.x - 1e-6 && w.x + w.width <= stage.width - props.layoutInset.x + 1e-6]).toEqual([w.key, true]);
      }
    });

    it("should seat the panel over none of the seven's land", () => {
      const seven = shapes.filter((s: any) => s.kept);
      const { at, width, height } = props.panel;
      for (let sy = at.y; sy <= at.y + height; sy += 6)
        for (let sx = at.x; sx <= at.x + width; sx += 6) {
          const p = toMap("overview", sx, sy);
          const hit = seven.find((s: any) => s.rings.some((r: number[][]) => insideRing(r, p.x, p.y)));
          expect([sx, sy, hit?.key ?? null]).toEqual([sx, sy, null]);
        }
    });

    it("should set the source on one line of the final map inside the margins, clear of every name, sea name and the panel, its words over no studied country, in an ink that reads on sea and land", () => {
      const src = props.source;
      const box = { x: src.at.x, y: src.at.y, width: src.width, height: src.height };
      expect(src.lines.every((l: any) => l.x + l.width <= src.width && l.y <= src.height)).toBe(true);
      expect([box.x >= props.layoutInset.x, box.y >= props.layoutInset.y, box.x + box.width <= stage.width - props.layoutInset.x, box.y + box.height <= stage.height - props.layoutInset.y]).toEqual([true, true, true, true]);
      const panel = { ...props.panel.at, width: props.panel.width, height: props.panel.height };
      for (const o of [...props.names.filter((n: any) => n.camera === "overview"), panel]) expect([o.key ?? "panel", touches(box, o)]).toEqual([o.key ?? "panel", false]);
      for (const w of props.waters) expect([w.key, touches(box, { x: w.x, y: w.y - props.registers.water.fontSize, width: w.width, height: props.registers.water.fontSize })]).toEqual([w.key, false]);
      for (const l of src.lines)
        for (let i = 0; i <= 10; i++) expect([l.text, i, shapeUnder("overview", src.at.x + l.x + (l.width * i) / 10, src.at.y + l.y - props.registers.axis.fontSize / 3)?.studied ?? false]).toEqual([l.text, i, false]);
      expect(src.lines.length).toBe(1);
      for (const ground of [colours.sea, colours.land]) expect(contrast(colours.text.source, ground)).toBeGreaterThanOrEqual(4.5);
    });

    it("should write no sentence on the map — no callout, no standfirst", () => {
      expect((props as any).callout).toBeUndefined();
      expect((props.titleCard as any).standfirst).toBeUndefined();
      for (const n of props.names) expect([n.key, n.text.split(/\s+/).length <= 6]).toEqual([n.key, true]);
    });
  });
}
