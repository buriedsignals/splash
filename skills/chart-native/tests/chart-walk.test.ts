import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CHART_WALKS, chartWalk, entranceStep } from "../src/core/chart-walk";
import { NATIVE_TYPES } from "../src/native-types";

// ---------------------------------------------------------------------------
// The registry must cover the ENGINE's list, not a list of its own. `bar` was alone for weeks
// because nothing forced anyone to decide about the other 40 — a gap that never announced itself.
// ---------------------------------------------------------------------------
describe("CHART_WALKS covers every native type, and only those", () => {
  it("every type the engine ships has a decided grain", () => {
    const missing = NATIVE_TYPES.map((t) => t.id).filter(
      (id) => !CHART_WALKS[id],
    );
    expect(missing).toEqual([]);
  });

  it("no entry describes a type the engine does not ship", () => {
    const known = new Set(NATIVE_TYPES.map((t) => t.id));
    expect(Object.keys(CHART_WALKS).filter((k) => !known.has(k))).toEqual([]);
  });

  it("an unknown type is undefined — never quietly 'sequenced'", () => {
    // A silent default here would let a 42nd type ship with no walk and no complaint, which is
    // precisely how this hole opened.
    expect(chartWalk("no-such-chart")).toBeUndefined();
  });
});

describe("each grain declares what that grain needs", () => {
  it("an anchored type names its subjects and its entrance", () => {
    for (const [id, w] of Object.entries(CHART_WALKS)) {
      if (w.grain !== "anchored") continue;
      expect({
        id,
        anchorField: !!w.anchorField,
        entrance: !!w.entrance,
      }).toEqual({
        id,
        anchorField: true,
        entrance: true,
      });
      expect(w.component).toBeTruthy();
    }
  });

  it("a sequenced type claims no anchor it cannot honour", () => {
    for (const [id, w] of Object.entries(CHART_WALKS)) {
      if (w.grain !== "sequenced") continue;
      expect({ id, anchorField: w.anchorField, entrance: w.entrance }).toEqual({
        id,
        anchorField: undefined,
        entrance: undefined,
      });
    }
  });

  it("only `bar` reorders its entrance — the rest keep the data's order, and say so", () => {
    const reordering = Object.entries(CHART_WALKS)
      .filter(([, w]) => w.reorders)
      .map(([id]) => id);
    expect(reordering).toEqual(["bar"]);
    expect(CHART_WALKS.lollipop!.why).toMatch(/keeps the data's order/);
  });

  it("every entry explains itself in terms a journalist can be shown", () => {
    for (const [id, w] of Object.entries(CHART_WALKS)) {
      expect(w.why.length).toBeGreaterThan(30);
      expect({
        id,
        bad: /unsupported|invalid|error|TODO/i.test(w.why),
      }).toEqual({
        id,
        bad: false,
      });
    }
  });
});

// ---------------------------------------------------------------------------
// ★ THE ENTRANCE IS READ, NOT COPIED — and this is what enforces it.
//
// A caption computed from a stale schedule is a sentence over the wrong subject: the failure
// core/walk.ts opens with, and the one route-story.ts already paid for. These components used to
// carry their stagger numbers as literals, so this registry would have been a COPY that drifts
// the day someone retunes one — silently, because nothing compares them.
//
// So the component asks the registry (`entranceOf`) instead, and the test refuses any anchored
// component that still spells its schedule out. `BarChart` had this discipline first; the other
// six now share it.
// ---------------------------------------------------------------------------
describe("an anchored component reads its entrance, never spells it out", () => {
  for (const [id, w] of Object.entries(CHART_WALKS)) {
    if (w.grain !== "anchored") continue;
    it(`${id}: ${w.component} drives stagger from the registry`, () => {
      const src = readFileSync(
        join(import.meta.dir, "..", "src", `${w.component}.tsx`),
        "utf8",
      );
      // It asks for ITS OWN entry — a component reading another type's schedule is the same
      // two-clock defect wearing a shared helper.
      const asks =
        src.includes(`entranceOf("${id}")`) ||
        // `bar` reaches it through the alias core/walk.ts re-exports, which IS entranceOf("bar").
        (id === "bar" && src.includes("BAR_ENTRANCE"));
      expect({ id, asks }).toEqual({ id, asks: true });

      // …and no stagger call in it carries bare numbers, which is how the copy would come back.
      const literal = src.match(
        /stagger\(\s*p,[^)]*?,\s*[\d.]+\s*,\s*[\d.]+\s*\/[^,]+,\s*[\d.]+\s*\)/,
      );
      expect({ id, spelledOut: literal?.[0] ?? null }).toEqual({
        id,
        spelledOut: null,
      });
    });
  }
});

describe("entranceStep", () => {
  it("divides the numerator by the subject count, and never by zero", () => {
    expect(
      entranceStep({ start: 0.18, stepNumerator: 0.5, span: 0.35 }, 5),
    ).toBe(0.1);
    expect(
      entranceStep({ start: 0.18, stepNumerator: 0.5, span: 0.35 }, 0),
    ).toBe(0.5);
  });
});
