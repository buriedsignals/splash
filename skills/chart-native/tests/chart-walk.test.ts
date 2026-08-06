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

  // ★ EVERY anchored type reorders. The first rendered proof of a non-bar walk (lollipop) played
  // the sentences in the DATA's order — the journalist's `establish` beat second, their `payoff`
  // first — because only `bar` permuted its entrance and the caption honestly followed it. A walk
  // whose steps arrive out of order is not a walk.
  it("every anchored type permutes its entrance into the walk's order", () => {
    const anchored = Object.entries(CHART_WALKS).filter(
      ([, w]) => w.grain === "anchored",
    );
    expect(anchored.length).toBeGreaterThan(1);
    for (const [id, w] of anchored) expect({ id, reorders: w.reorders }).toEqual({ id, reorders: true });
    // …and a sequenced type has no entrance to permute.
    for (const [id, w] of Object.entries(CHART_WALKS))
      if (w.grain === "sequenced")
        expect({ id, reorders: w.reorders }).toEqual({ id, reorders: undefined });
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

// ---------------------------------------------------------------------------
// ★ THE WALK REACHES THE CONFIG THE COMPONENT ACTUALLY RENDERS — and it did not.
//
// The caption stage reads `config.beats`; so does BarChart's entrance reorder. No mapper copied
// them off the spec, so a journalist's confirmed storyboard produced a config carrying none: the
// sentences were written, validated, then dropped between the spec and the render. Both
// mechanisms had been proven against a HAND-BUILT config and never against a real spec, which is
// why nothing said so.
// ---------------------------------------------------------------------------
import { specToNativeConfig } from "../src/spec-to-config";

describe("a confirmed walk survives the spec → config mapping", () => {
  const spec = (nativeType: string, beats: unknown) =>
    ({
      nativeType,
      title: "t",
      altInsight: "a",
      source: { name: "S" },
      unit: "u",
      data: "region,value\nGenève,12\nVaud,8\nValais,5\n",
      beats,
    }) as never;

  const WALK = [
    { category: "Vaud", role: "establish", text: "Vaud ouvre." },
    { category: "Valais", role: "build", text: "Le Valais suit." },
    { category: "Genève", role: "payoff", text: "Genève ferme." },
  ];

  it("arrives on the config, for an anchored type and a sequenced one alike", () => {
    for (const t of ["bar", "lollipop", "pie"]) {
      const { config } = specToNativeConfig(spec(t, WALK));
      expect({ t, beats: config.beats }).toEqual({ t, beats: WALK });
    }
  });

  it("…and a spec with no walk produces a config with no `beats` key at all", () => {
    // The invariant the whole caption lot is bounded by: a video nobody storyboarded renders
    // exactly what it rendered before. An empty array would be a walk to the stage.
    const { config } = specToNativeConfig(spec("bar", undefined));
    expect("beats" in config).toBe(false);
    const empty = specToNativeConfig(spec("bar", []));
    expect("beats" in empty.config).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ★ THE PERMUTATION MUST BE BUILT FROM THE LAID-OUT LABELS — the defect only a frame could show.
//
// A lollipop's geometry SORTS its rows by value. The first version built the walk's permutation
// from `config.rows`, so it addressed positions the component never staggered on: the rendered
// video opened on Genève while the caption read the journalist's opening beat about Vaud.
// ---------------------------------------------------------------------------
import { computeLollipopLayout } from "../src/lollipop-geometry";
import { walkEntryOrder } from "../src/core/walk";

describe("an anchored walk permutes the order the component RENDERS", () => {
  const data = {
    catField: "commune",
    valField: "hausse",
    // Values chosen so the layout's value-sort REALLY reorders them — with a fixture the sort
    // leaves alone, this test proves nothing at all.
    rows: [
      { commune: "Genève", hausse: 5 },
      { commune: "Vaud", hausse: 12 },
      { commune: "Valais", hausse: 8 },
    ],
  };
  const dims = {
    width: 800,
    height: 450,
    padding: { top: 60, right: 40, bottom: 50, left: 120 },
  };
  const beats = [
    { category: "Genève", text: "Genève ouvre la marche." },
    { category: "Vaud", text: "Vaud suit." },
    { category: "Valais", text: "Le Valais ferme." },
  ];

  it("the walk's opening subject enters FIRST, though the layout sorts it last", () => {
    const layout = computeLollipopLayout(data, dims, "desc");
    // The sort really does reorder — otherwise this test proves nothing.
    expect(layout.rows.map((r) => r.rawCat)).toEqual([
      "Vaud",
      "Valais",
      "Genève",
    ]);

    const entry = walkEntryOrder(
      layout.rows.map((r) => r.rawCat),
      beats,
    );
    const at = (cat: string) =>
      entry(layout.rows.findIndex((r) => r.rawCat === cat));
    expect([at("Genève"), at("Vaud"), at("Valais")]).toEqual([0, 1, 2]);
  });

  it("…and building it from the UNSORTED rows would not have — the defect, pinned", () => {
    const layout = computeLollipopLayout(data, dims, "desc");
    const fromSpecRows = walkEntryOrder(
      data.rows.map((r) => String(r.commune)),
      beats,
    );
    // Genève opens the walk and sits LAST in the layout. The permutation built from the spec's
    // own row order sends that position somewhere else entirely — so the video would open on
    // another subject while the caption read Genève's sentence.
    expect(
      fromSpecRows(layout.rows.findIndex((r) => r.rawCat === "Genève")),
    ).not.toBe(0);
  });

  it("no walk ⇒ the identity, so an un-storyboarded chart is byte-identical", () => {
    const entry = walkEntryOrder(["a", "b", "c"], undefined);
    expect([entry(0), entry(1), entry(2)]).toEqual([0, 1, 2]);
  });
});
