import { describe, expect, it } from "bun:test";
import { validateExpressions } from "#shared/map-beat/mount.mjs";
import { validateScrollyPlan } from "#shared/map-beat/scrolly.mjs";
import { assertClaim, HALF, LAST, loadSubject, SUBJECT } from "./beat.mjs";
import { buildDirection, loadBeat } from "./build.mjs";
import { MAP_FIELDS } from "./plan.mjs";
import { mapStateAt, sceneAt } from "./scene.mjs";

const beat = loadBeat();
const touches = (a: any, b: any) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

describe("the claim, measured on the frozen data", () => {
  it("should find coal fell in all twelve and only Poland above half in 2024", () => {
    expect(assertClaim(loadSubject())).toEqual({ first: ["CZE", "GRC", "POL"], last: ["POL"] });
  });

  it("should refuse a claim the data stops supporting", () => {
    const s = loadSubject();
    const lying = { ...s, share: (iso: string, y: number) => (iso === "CZE" && y === LAST ? HALF + 1 : s.share(iso, y)), aboveHalf: (y: number) => (y === LAST ? [SUBJECT, "CZE"] : s.aboveHalf(y)) };
    expect(() => assertClaim(lying)).toThrow();
  });
});

for (const id of ["creme", "nocturne", "rapport"]) {
  const { props } = buildDirection(id, beat);
  const T = props.timing;
  describe(`${id}`, () => {
    it("should carry a renderable plan: data-constant bindings, every frame's state carrying a camera and every bound field", () => {
      const states = Array.from({ length: Math.ceil(T.total / 10) }, (_, i) => mapStateAt(props, i * 10));
      expect([...validateScrollyPlan(props.mapPlan, states), ...validateExpressions(props.mapPlan)]).toEqual([]);
      for (const s of states) for (const f of MAP_FIELDS) expect(Number.isFinite(s[f])).toBe(true);
    });

    it("should carry no key and reach MapTiler through the placeholder only", () => {
      const text = JSON.stringify(props.mapPlan);
      expect([text.includes("__MAPTILER" + "_KEY__"), /key=[A-Za-z0-9]{16,}/.test(text)]).toEqual([true, false]);
    });

    it("should show 2010 at the end of reference, 2024 at the end of reveal and again at the end of subject", () => {
      const year = (f: number) => mapStateAt(props, f).year;
      expect([year(T.reference.start + T.reference.duration - 1), year(T.reveal.start + T.reveal.duration - 1), year(T.subject.start + T.subject.duration - 1)]).toEqual([0, 1, 1]);
    });

    it("should keep every name inside the frame and the close-up's names apart", () => {
      const inside = props.names.every((n: any) => n.x >= 0 && n.y >= 0 && n.x + n.width <= props.frame.width && n.y + n.height <= props.frame.height);
      const close = props.names.filter((n: any) => n.camera === "closeUp");
      const overlaps = close.flatMap((a: any, i: number) => close.slice(i + 1).filter((b: any) => touches(a, b)).map((b: any) => `${a.key}/${b.key}`));
      expect([inside, overlaps]).toEqual([true, []]);
    });

    it("should name nothing while the camera moves", () => {
      const mid = Math.round(T.subject.start + T.subject.duration * 0.23);
      expect(Object.values(sceneAt(props, mid).names).every((o) => o === 0)).toBe(true);
    });

    it("should end on the map, the title gone and the source up", () => {
      const s = sceneAt(props, T.total - 1);
      expect([s.title, s.source, s.furniture]).toEqual([0, 1, 1]);
    });
  });
}
