import { describe, expect, it } from "bun:test";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { buildDirection, loadBeat } from "./build.mjs";
import { COUNT_UP, sceneAt, toStage, WINDOWS } from "./scene.mjs";

/**
 * The choreography of BRIEF.md, frame by frame, on the props each direction is actually rendered from: who
 * is named at the end of every event, that nothing is named while the camera moves, that every shown name
 * is inside the stage, clear of every other and against its own country, that Albania is the centre of its
 * close-up, and that the hold does not move.
 */

const beat = loadBeat();
const DIRECTIONS = ["creme", "nocturne", "rapport"];
const SIX = ["ISL", "SWE", "NOR", "FIN", "FRA", "CHE"];
/** The three lowest shares, named as the still names them. */
const LOWEST = ["context:CYP", "context:MLT", "context:MDA"];
const EXPECTED_NAMES: Record<string, string[]> = {
  establish: [],
  reference: LOWEST,
  reveal: SIX.map((iso) => `top:${iso}`),
  subject: [
    "close:ALB",
    "neighbour:MNE",
    "neighbour:MKD",
    "neighbour:GRC",
    "neighbour:-99:Kosovo",
  ],
  conclusion: [...SIX.map((iso) => `top:${iso}`), "odd:ALB", "missing:UKR", ...LOWEST],
  hold: [...SIX.map((iso) => `top:${iso}`), "odd:ALB", "missing:UKR", ...LOWEST],
};
const shown = (scene: any) =>
  Object.entries(scene.names)
    .filter(([, o]) => (o as number) > 0.01)
    .map(([k]) => k)
    .sort();

for (const id of DIRECTIONS) {
  const { props } = buildDirection(id, beat);
  const T = props.timing;
  const last = (event: string) => endOf(T[event]) - 1;
  const gap = 0.25 * props.registers.axis.lead;

  describe(`${id}, frame by frame`, () => {
    it("should draw Europe at frame 0 with no class, no name and no furniture yet", () => {
      const scene = sceneAt(props, 0);
      expect(props.shapes.length).toBeGreaterThan(40);
      expect(
        Object.values(scene.fills).every((f) => f === props.colours.land),
      ).toBe(true);
      expect(shown(scene)).toEqual([]);
      expect(scene.furniture).toBe(0);
    });

    for (const event of EVENT_ORDER)
      it(`should name exactly BRIEF.md's names at the end of ${event}`, () => {
        expect(shown(sceneAt(props, last(event)))).toEqual(
          [...EXPECTED_NAMES[event]].sort(),
        );
      });

    it("should name nothing while the camera travels, either way", () => {
      for (const event of ["subject", "conclusion"] as const) {
        const [a, b] = (WINDOWS as any)[event].zoom;
        for (let t = 0.05; t < 1; t += 0.1) {
          const frame = Math.round(
            T[event].start + T[event].duration * (a + (b - a) * t),
          );
          const scene = sceneAt(props, frame);
          if (
            scene.viewBox.w === props.cameras.overview.w ||
            scene.viewBox.w === props.cameras.closeUp.w
          )
            continue;
          expect([frame, shown(scene)]).toEqual([frame, []]);
        }
      }
    });

    for (const camera of ["overview", "closeUp"] as const)
      it(`should keep every ${camera} name inside the stage, clear of every other, and against its own country or led to it`, () => {
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
          const dx = Math.max(n.x - n.seat.x, 0, n.seat.x - n.x - n.width);
          const dy = Math.max(n.y - n.seat.y, 0, n.seat.y - n.y - n.height);
          // Albania's overview name steps beside its ring, so it may stand the ring's radius further off; a name
          // set in the sea beside a small country is led to it, and may stand three of its heights off.
          const slack = camera === "overview" && n.role === "odd" ? (props.ring.r / props.cameras.overview.w) * props.stage.width + props.strokes.ring : 0;
          const reach = n.leader && n.role !== "odd" ? 3 * n.height : n.height;
          expect([n.key, Math.hypot(dx, dy) <= reach + slack + 1e-6]).toEqual([
            n.key,
            true,
          ]);
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

    it("should keep Albania's ring clear of every name at the overview", () => {
      const at = toStage(props.cameras.overview, props.stage, {
        x: props.ring.cx,
        y: props.ring.cy,
      });
      const r = (props.ring.r / props.cameras.overview.w) * props.stage.width;
      for (const n of props.names.filter((n: any) => n.camera === "overview")) {
        const dx = Math.max(n.x - at.x, 0, at.x - n.x - n.width);
        const dy = Math.max(n.y - at.y, 0, at.y - n.y - n.height);
        expect([n.key, Math.hypot(dx, dy) > r]).toEqual([n.key, true]);
      }
    });

    it("should keep every other close-up name off Albania's box at the end of subject", () => {
      const scene = sceneAt(props, last("subject"));
      const a = toStage(scene.viewBox, props.stage, { x: props.subjectBox.x, y: props.subjectBox.y });
      const b = toStage(scene.viewBox, props.stage, { x: props.subjectBox.x + props.subjectBox.w, y: props.subjectBox.y + props.subjectBox.h });
      for (const n of props.names.filter((n: any) => scene.names[n.key] > 0.01 && n.key !== "close:ALB")) {
        const clear = n.x + n.width <= a.x || b.x <= n.x || n.y + n.height <= a.y || b.y <= n.y;
        expect([n.key, clear]).toEqual([n.key, true]);
      }
    });

    it("should set Albania at the centre of its close-up", () => {
      const scene = sceneAt(props, last("subject"));
      const at = toStage(scene.viewBox, props.stage, {
        x: props.ring.cx,
        y: props.ring.cy,
      });
      expect(Math.abs(at.x - props.stage.width / 2)).toBeLessThan(0.5);
      expect(Math.abs(at.y - props.stage.height / 2)).toBeLessThan(0.5);
    });

    it("should pull back to exactly the establish camera", () => {
      expect(sceneAt(props, last("conclusion")).viewBox).toEqual(
        sceneAt(props, last("establish")).viewBox,
      );
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

    it("should fill the map's classes in value order — no country of a higher class takes ink before every lower class is full", () => {
      const byClass = (i: number) => props.shapes.filter((s: any) => s.classIndex === i);
      const n = props.colours.classFills.length;
      for (let frame = T.reference.start; frame <= endOf(T.reference); frame += 2) {
        const { fills } = sceneAt(props, frame);
        for (let i = 1; i < n; i++) {
          const started = byClass(i).some((s: any) => fills[s.key] !== props.colours.land);
          if (!started) continue;
          const lowerFull = byClass(i - 1).every((s: any) => fills[s.key] === props.colours.classFills[i - 1]);
          expect([frame, i, lowerFull]).toEqual([frame, i, true]);
        }
      }
    });

    it("should step the counter down the floor — 40, 32, 26, 20, 12, then 7 above 94 % — and keep it to the last frame", () => {
      expect(props.panel.counter.map((l: any) => Number.parseInt(l.text, 10))).toEqual([40, 32, 26, 20, 12, 7]);
      expect(props.panel.counter.at(-1).text).toContain("94");
      const steps = new Set<number>();
      for (let f = T.reveal.start; f <= last("reveal"); f++) steps.add(sceneAt(props, f).counter.step);
      expect([...steps].sort()).toEqual([0, 1, 2, 3, 4, 5]);
      expect(sceneAt(props, T.total - 1).counter).toEqual({ step: 5, opacity: 1 });
    });

    it("should step each class back only once the floor's cursor has passed its borne, the lowest class first", () => {
      for (let f = T.reveal.start; f <= last("reveal"); f += 2) {
        const scene = sceneAt(props, f);
        for (const s of props.shapes.filter((x: any) => x.classIndex !== null && !x.kept)) {
          if (scene.cursor.at < s.classIndex) expect([f, s.key, scene.fills[s.key]]).toEqual([f, s.key, props.colours.classFills[s.classIndex]]);
          if (scene.cursor.at >= s.classIndex + 1) expect([f, s.key, scene.fills[s.key]]).toEqual([f, s.key, props.colours.land]);
        }
      }
    });

    it("should count Albania's and its neighbours' shares up from zero once the close-up has settled, and land on their values", () => {
      const settled = sceneAt(props, last("subject"));
      expect(settled.countUp).toEqual({ odd: 1, neighbour: 1 });
      const [, a, b] = COUNT_UP.neighbour;
      const early = T.subject.start + Math.round(T.subject.duration * (a + b) / 2);
      const mid = sceneAt(props, early).countUp;
      expect(mid.neighbour).toBeGreaterThan(0);
      expect(mid.neighbour).toBeLessThan(1);
    });

    it("should step the 33 back and keep the seven at the end of reveal", () => {
      const scene = sceneAt(props, last("reveal"));
      const kept = props.shapes.filter((s: any) => s.kept);
      expect(kept.length).toBe(7);
      expect(
        kept.every(
          (s: any) => scene.fills[s.key] === props.colours.classFills.at(-1),
        ),
      ).toBe(true);
      const back = props.shapes.filter(
        (s: any) => s.classIndex !== null && !s.kept,
      );
      expect(back.length).toBe(33);
      expect(
        back.every((s: any) => scene.fills[s.key] === props.colours.land),
      ).toBe(true);
    });

    it("should hold still — the first and last frames of the hold are one picture", () => {
      expect(sceneAt(props, T.hold.start)).toEqual(sceneAt(props, T.total - 1));
    });
  });
}
