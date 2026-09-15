import { describe, expect, it } from "bun:test";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { bindState } from "#shared/map-beat/scrolly.mjs";
import { buildDirection, loadBeat } from "./build.mjs";
import { cameraAt, COUNT_UP, mapStateAt, sceneAt } from "./scene.mjs";

/**
 * The choreography of BRIEF.md, frame by frame, on the props each direction is actually rendered from: the live
 * map's camera and bound paints (`mapStateAt`, read through the plan's own bindings), the SVG overlay's words
 * (`sceneAt`), who is named at the end of every event, that nothing is named while the camera moves, and that the
 * hold does not move.
 */

const beat = loadBeat();
const DIRECTIONS = ["creme", "nocturne", "rapport"];
/** The overlay's words: the close-up's labels, and Albania's name beside its ring once the map is whole again. The
 *  six are the map's own symbol layer (`top`), asserted apart. */
const EXPECTED_NAMES: Record<string, string[]> = {
  establish: [],
  reference: [],
  reveal: [],
  subject: [
    "close:ALB",
    "neighbour:MNE",
    "neighbour:MKD",
    "neighbour:GRC",
    "neighbour:-99:Kosovo",
  ],
  conclusion: ["odd:ALB"],
  hold: ["odd:ALB"],
};
/** When the map's six names stand: once the floor has landed, and again once the camera is back. */
const SIX_NAMED: Record<string, boolean> = {
  establish: false,
  reference: false,
  reveal: true,
  subject: false,
  conclusion: true,
  hold: true,
};
const shown = (scene: any) =>
  Object.entries(scene.names)
    .filter(([, o]) => (o as number) > 0.01)
    .map(([k]) => k)
    .sort();

/** A bound paint, evaluated: the plan's binding with the frame's numbers put in, run through the few operators
 *  its opacity expressions use. An operator not named here throws rather than guessing. */
function evaluate(e: any): any {
  if (typeof e === "number" || typeof e === "boolean") return e;
  const [op, ...a] = e;
  const v = a.map(evaluate);
  switch (op) {
    case "max":
      return Math.max(...v);
    case "min":
      return Math.min(...v);
    case "+":
      return v.reduce((s: number, x: number) => s + x, 0);
    case "*":
      return v.reduce((s: number, x: number) => s * x, 1);
    case "-":
      return v.length === 1 ? -v[0] : v[0] - v[1];
    case "/":
      return v[0] / v[1];
    case "^":
      return v[0] ** v[1];
    case "<":
      return v[0] < v[1];
    case "case":
      return v[0] ? v[1] : v[2];
  }
  throw new Error(`no evaluator for ${op}`);
}
const opacityOf = (layer: any, state: any) =>
  evaluate(bindState(layer.bindings["fill-opacity"], state));

for (const id of DIRECTIONS) {
  const { props } = buildDirection(id, beat);
  const T = props.timing;
  const last = (event: string) => endOf(T[event]) - 1;
  const gap = 0.25 * props.registers.axis.lead;
  /** One fill layer per class and filter group (`plan.mjs`); Malta's level-1 twin repeats its group's members. */
  const classLayers = props.mapPlan.layers
    .filter((l: any) => /^class-\d+(-kept)?$/.test(l.id))
    .map((l: any) => ({
      layer: l,
      klass: Number(l.id.split("-")[1]),
      kept: l.id.endsWith("-kept"),
      members: l.filter[2][2],
    }));

  describe(`${id}, frame by frame`, () => {
    it("should end on the map — no card over it at the last frame of the hold", () => {
      const scene: any = sceneAt(props, T.total - 1);
      expect([scene.title, scene.end ?? 0]).toEqual([0, 0]);
      expect((props as any).endCard).toBeUndefined();
    });

    it("should open on the title card at full opacity from frame 0", () => {
      expect(sceneAt(props, 0).title).toBe(1);
    });

    it("should draw Europe at frame 0 with no class, no name and no furniture yet", () => {
      const state = mapStateAt(props, 0);
      expect([state.classes, state.top, state.odd]).toEqual([0, 0, 0]);
      for (const { layer } of classLayers)
        expect([layer.id, opacityOf(layer, state)]).toEqual([layer.id, 0]);
      expect(shown(sceneAt(props, 0))).toEqual([]);
      expect(sceneAt(props, 0).furniture).toBe(0);
    });

    for (const event of EVENT_ORDER)
      it(`should name exactly BRIEF.md's names at the end of ${event}`, () => {
        expect(shown(sceneAt(props, last(event)))).toEqual(
          [...EXPECTED_NAMES[event]].sort(),
        );
        expect([event, mapStateAt(props, last(event)).top > 0.01]).toEqual([
          event,
          SIX_NAMED[event],
        ]);
      });

    it("should name nothing over the map while the camera travels, either way", () => {
      for (let f = T.subject.start; f < T.total; f++) {
        const s = mapStateAt(props, f);
        if (s.zoom > 1e-9 && s.zoom < 1 - 1e-9)
          expect([f, shown(sceneAt(props, f))]).toEqual([f, []]);
      }
    });

    for (const camera of ["overview", "closeUp"] as const)
      it(`should keep every ${camera} name inside the stage and clear of every other`, () => {
        const names = props.names.filter((n: any) => n.camera === camera);
        for (const n of names) {
          expect(n.x).toBeGreaterThanOrEqual(gap - 1e-6);
          expect(n.y).toBeGreaterThanOrEqual(gap - 1e-6);
          expect(n.x + n.width).toBeLessThanOrEqual(
            props.stage.width - gap + 1e-6,
          );
          expect(n.y + n.height).toBeLessThanOrEqual(
            props.stage.height - gap + 1e-6,
          );
        }
        for (let i = 0; i < names.length; i++)
          for (let j = i + 1; j < names.length; j++) {
            const a = names[i];
            const b = names[j];
            const apart =
              a.x + a.width + gap <= b.x + 1e-6 ||
              b.x + b.width + gap <= a.x + 1e-6 ||
              a.y + a.height + gap <= b.y + 1e-6 ||
              b.y + b.height + gap <= a.y + 1e-6;
            expect([a.key, b.key, apart]).toEqual([a.key, b.key, true]);
          }
      });

    it("should reveal the classes in value order — a lower class is never behind a higher one", () => {
      for (
        let frame = T.reference.start;
        frame <= endOf(T.reference);
        frame += 3
      ) {
        const s = sceneAt(props, frame).swatches;
        for (let i = 1; i < s.length; i++)
          expect(s[i - 1]).toBeGreaterThanOrEqual(s[i]);
      }
    });

    it("should fill the map's classes in value order — no layer of a higher class takes ink before every lower class is full", () => {
      for (
        let frame = T.reference.start;
        frame <= endOf(T.reference);
        frame += 2
      ) {
        const state = mapStateAt(props, frame);
        for (const { layer, klass } of classLayers) {
          if (opacityOf(layer, state) <= 0) continue;
          const lowerFull = classLayers
            .filter((c: any) => c.klass < klass)
            .every((c: any) => opacityOf(c.layer, state) >= 1);
          expect([frame, layer.id, lowerFull]).toEqual([frame, layer.id, true]);
        }
      }
    });

    it("should step the counter down the floor — 40, 32, 26, 20, 12, then 7 — the count alone, and keep it to the last frame", () => {
      expect(props.panel.counter.map((l: any) => l.text)).toEqual([
        "40 pays",
        "32 pays",
        "26 pays",
        "20 pays",
        "12 pays",
        "7 pays",
      ]);
      const steps = new Set<number>();
      for (let f = T.reveal.start; f <= last("reveal"); f++)
        steps.add(sceneAt(props, f).counter.step);
      expect([...steps].sort()).toEqual([0, 1, 2, 3, 4, 5]);
      expect(sceneAt(props, T.total - 1).counter).toEqual({
        step: 5,
        opacity: 1,
      });
    });

    it("should step each class of the map back only once the floor's cursor has passed its borne, the lowest class first", () => {
      for (let f = T.reveal.start; f <= last("reveal"); f += 2) {
        const scene = sceneAt(props, f);
        const state = mapStateAt(props, f);
        for (const { layer, klass } of classLayers.filter(
          (c: any) => !c.kept,
        )) {
          if (scene.cursor.at < klass)
            expect([f, layer.id, opacityOf(layer, state)]).toEqual([
              f,
              layer.id,
              1,
            ]);
          if (scene.cursor.at >= klass + 1)
            expect([f, layer.id, opacityOf(layer, state)]).toEqual([
              f,
              layer.id,
              0,
            ]);
        }
      }
    });

    it("should count Albania's and its neighbours' shares up from zero once the close-up has settled, and land on their values", () => {
      const settled = sceneAt(props, last("subject"));
      expect(settled.countUp).toEqual({ odd: 1, neighbour: 1 });
      const [, a, b] = COUNT_UP.neighbour;
      const early =
        T.subject.start + Math.round((T.subject.duration * (a + b)) / 2);
      const mid = sceneAt(props, early).countUp;
      expect(mid.neighbour).toBeGreaterThan(0);
      expect(mid.neighbour).toBeLessThan(1);
    });

    it("should give every measured close-up share a gauge on one scale, the floor notched on it, counting up with its share", () => {
      const gauged = props.names.filter((n: any) => n.gauge);
      expect(gauged.map((n: any) => n.key).sort()).toEqual([
        "close:ALB",
        "neighbour:GRC",
        "neighbour:MKD",
        "neighbour:MNE",
      ]);
      const width = gauged[0].gauge.width;
      for (const n of gauged) {
        expect(n.gauge.width).toBe(width);
        expect(n.gauge.notch).toBeCloseTo(0.94, 9);
        // Inside its pill, under its text: the placement that keeps pills apart keeps gauges apart.
        expect(n.gauge.x).toBeGreaterThanOrEqual(0);
        expect(n.gauge.x + n.gauge.width).toBeLessThanOrEqual(n.width + 1e-6);
        expect(n.gauge.y).toBeGreaterThan(n.baseline);
        expect(n.gauge.y + n.gauge.height).toBeLessThanOrEqual(n.height + 1e-6);
      }
      const share = (iso: string) =>
        beat.subject.value.get(iso).lowCarbon / 100;
      const settled = sceneAt(props, last("subject"));
      for (const n of gauged)
        expect(settled.gauges[n.key]).toBeCloseTo(
          share(n.key.split(":")[1]),
          9,
        );
      const passing = gauged
        .filter((n: any) => settled.gauges[n.key] > n.gauge.notch)
        .map((n: any) => n.key);
      expect(passing).toEqual(["close:ALB"]);
      const [, a, b] = COUNT_UP.neighbour;
      const mid = sceneAt(
        props,
        T.subject.start + Math.round((T.subject.duration * (a + b)) / 2),
      );
      expect(mid.gauges["neighbour:MNE"]).toBeCloseTo(
        share("MNE") * mid.countUp.neighbour,
        9,
      );
      expect(sceneAt(props, T.subject.start).gauges["neighbour:MNE"]).toBe(0);
    });

    it("should step the 33 back and keep the seven at the end of reveal", () => {
      const state = mapStateAt(props, last("reveal"));
      const kept = classLayers.filter((c: any) => c.kept);
      const back = classLayers.filter((c: any) => !c.kept);
      expect(kept.flatMap((c: any) => c.members).length).toBe(7);
      expect(back.flatMap((c: any) => c.members).length).toBe(33);
      for (const { layer } of kept)
        expect([layer.id, opacityOf(layer, state)]).toEqual([layer.id, 1]);
      for (const { layer } of back)
        expect([layer.id, opacityOf(layer, state)]).toEqual([layer.id, 0]);
    });

    it("should hold still — the first and last frames of the hold are one picture", () => {
      expect(sceneAt(props, T.hold.start)).toEqual(sceneAt(props, T.total - 1));
      expect(mapStateAt(props, T.hold.start)).toEqual(
        mapStateAt(props, T.total - 1),
      );
    });
  });

  describe(`${id}'s map camera, frame by frame`, () => {
    it("should hold the whole map from frame 0 to the camera's departure, and return to exactly it", () => {
      const whole = props.cameras.whole;
      for (const f of [0, endOf(T.reveal) - 1, T.total - 1]) {
        const s = mapStateAt(props, f);
        expect([s.camX, s.camY, s.camZoom]).toEqual([
          whole.camX,
          whole.camY,
          whole.camZoom,
        ]);
      }
    });

    it("should stand on the close-up, Albania at the centre, at the end of subject", () => {
      const s = mapStateAt(props, endOf(T.subject) - 1);
      expect([s.camX, s.camY, s.camZoom]).toEqual([
        props.cameras.closeUp.camX,
        props.cameras.closeUp.camY,
        props.cameras.closeUp.camZoom,
      ]);
    });

    it("should move the zoom linearly with the camera's travel and the centre in Mercator units", () => {
      const { whole, closeUp } = props.cameras;
      const mid = cameraAt(props.cameras, 0.5);
      expect(mid.camZoom).toBeCloseTo(
        (whole.camZoom + closeUp.camZoom) / 2,
        12,
      );
      expect(mid.camX).toBeCloseTo((whole.camX + closeUp.camX) / 2, 12);
      expect(mid.camY).toBeCloseTo((whole.camY + closeUp.camY) / 2, 12);
    });

    it("should name nothing on the map while the camera moves", () => {
      for (let f = T.subject.start; f < T.total; f++) {
        const s = mapStateAt(props, f);
        const moving = s.zoom > 1e-9 && s.zoom < 1 - 1e-9;
        if (moving) expect([f, s.top]).toEqual([f, 0]);
      }
    });

    it("should reveal the classes and raise the floor exactly as the key's swatches do", () => {
      for (let f = 0; f < endOf(T.reveal); f += 3) {
        const s = mapStateAt(props, f);
        const scene = sceneAt(props, f);
        expect(s.classes * props.colours.classFills.length).toBeCloseTo(
          scene.swatches.reduce((a: number, v: number) => a + v, 0),
          0,
        );
      }
    });
  });
}
