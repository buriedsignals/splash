import { describe, it, expect } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  CHART_WALKS,
  chartWalk,
  entranceStep,
  entranceOf,
} from "../src/core/chart-walk";
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
      if (w.grain === "sequenced") continue;
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
      ([, w]) => w.grain !== "sequenced",
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
    if (w.grain === "sequenced") continue;
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

// ---------------------------------------------------------------------------
// ★ A STEPPED VIDEO IS THE SCROLLY, IN TIME — Rémy, 2026-08-06, after watching the first one:
// « le stepped devrait avoir le même rendu qu'un scrolly, juste en format vidéo ».
//
// He was right, and the first version was worse than merely different: the bars raced in while a
// FIXED accent stayed put, so the closing sentence pointed at another subject. A caption asserting
// something about the wrong bar is not a polish note.
// ---------------------------------------------------------------------------
import { steppedFrame } from "../src/core/walk";

describe("the stepped frame — the chart stands complete, the accent walks", () => {
  const rows = [
    { region: "Alpes", value: 2370 },
    { region: "Suisse", value: 900 },
    { region: "Léman", value: 580 },
  ];
  const cfg = { catField: "region", labelField: "region", rows };
  const beats = [
    { category: "Alpes", text: "2370 km² libérés." },
    { category: "Suisse", text: "Dont 900 pour la Suisse." },
    { category: "Léman", text: "Quatre fois le Léman." },
  ];

  it("the chart is COMPLETE from the first frame, as a scrolly is when the reader arrives", () => {
    const f = steppedFrame("bar", { ...cfg, beats }, 0)!;
    expect(f.chartProgress).toBe(1);
  });

  it("each step accents the subject ITS sentence is about", () => {
    const at = (p: number) => steppedFrame("bar", { ...cfg, beats }, p)!.accent;
    expect(at(0.1)).toEqual({ highlightIndex: 0 });
    expect(at(0.5)).toEqual({ highlightIndex: 1 });
    // ★ THE DEFECT, PINNED: the closing sentence is about the Léman, so the closing accent is the
    // Léman — not whichever subject a fixed `highlight` had chosen once and for all.
    expect(at(0.95)).toEqual({ highlightIndex: 2 });
  });

  it("a label-addressed type accents by NAME, which no sort can invalidate", () => {
    expect(steppedFrame("lollipop", { ...cfg, beats }, 0.5)!.accent).toEqual({
      highlightLabel: "Suisse",
    });
    expect(steppedFrame("slope", { ...cfg, beats }, 0.95)!.accent).toEqual({
      highlightLabel: "Léman",
    });
  });

  it("gives NOTHING without a walk — an un-storyboarded video is unchanged", () => {
    expect(steppedFrame("bar", { ...cfg }, 0.5)).toBeNull();
  });

  it("gives nothing for a type that cannot accent — it stages by entrance instead", () => {
    expect(steppedFrame("dumbbell", { ...cfg, beats }, 0.5)).toBeNull();
    expect(steppedFrame("pie", { ...cfg, beats }, 0.5)).toBeNull();
  });
});

// The three that stage like a scrolly must actually be wired to it — a staging nothing calls is a
// staging that does not happen, which is how the caption stage itself sat unreachable for a day.
describe("the scrolly staging is wired into the compositions that claim it", () => {
  for (const [id, w] of Object.entries(CHART_WALKS)) {
    if (w.grain !== "accent") continue;
    it(`${id}: its reveal composition drives the chart from the stepped frame`, () => {
      const file = readdirSync(
        join(import.meta.dir, "..", "remotion", "src"),
      ).find((f) => f.toLowerCase().startsWith(id.replace("-", "")) && f.endsWith("Reveal.tsx"));
      const src = readFileSync(
        join(import.meta.dir, "..", "remotion", "src", file!),
        "utf8",
      );
      expect(src).toContain(`steppedFrame("${id}"`);
      expect(src).toContain("step ? step.chartProgress : progress");
    });
  }
});

// ---------------------------------------------------------------------------
// A SEQUENCED entry's `why` is shown to the journalist VERBATIM (narrative-kinds.ts reads
// `chartWalk(nativeType).why`), so it is not a comment — it is a claim about the component,
// and it can be wrong. `pictogram` carried SEQUENCED_UNNAMED — "its subjects are not named
// by a field a beat can address (bins, cells, nodes)" — for as long as it was deferred, and
// that is simply false: its rows are named by `categoryField`, exactly as `bar`'s are by
// `catField`. Nobody noticed because a deferred type's reason is never said to anyone.
//
// The true reason is that its reveal advances by icon COLUMN across every row at once, so no
// single row has a moment of its own. This pins the sentence to the source that makes it true.
// ---------------------------------------------------------------------------
describe("pictogram's stated reason is true of the component", () => {
  const src = readFileSync(
    join(import.meta.dir, "..", "src", "PictogramChart.tsx"),
    "utf8",
  );

  it("its rows ARE named — so the old 'unnamed subjects' reason cannot be reused", () => {
    expect(src).toContain("categoryField");
    expect(CHART_WALKS.pictogram.why).not.toContain("not named");
  });

  it("every entrance window is indexed by the COLUMN, never by the row", () => {
    const windows = [
      ...src.matchAll(/clamp01\(\(reveal \* maxCols - ([^)]*)\)/g),
    ].map((m) => m[1].trim());
    expect(windows.length).toBeGreaterThan(0);
    for (const w of windows) expect({ window: w, byRow: /index/.test(w) }).toEqual({ window: w, byRow: false });
  });

  it("and it has no per-subject entrance to ask for", () => {
    expect(() => entranceOf("pictogram")).toThrow(/sequenced, not anchored/);
  });
});

// ★ combo's grain is SEQUENCED for a reason that had to be re-measured.
//
// The registry said combo's entrance "advances by SERIES rather than by subject" — the reason
// stacked/grouped carry. Read against ComboChart that is simply false: its columns stagger on
// the CATEGORY's own index, which is the shape that makes a type anchorable.
//
// It stays sequenced anyway, and the real reason is the one worth guarding: an anchored grain
// must REORDER (`reorders: true`, asserted for every anchored type above), and combo cannot.
// Its second series is a PATH revealed by a single clip wipe over points held in x order — one
// scalar, no per-point index. Permute the columns into the journalist's order and the line
// still wipes in x order: two clocks, a sentence over a column the line has already passed.
//
// This reads the component so the registry's stated reason cannot drift away from the code.
// ---------------------------------------------------------------------------
describe("combo is sequenced because its line cannot be reordered, not for want of a subject", () => {
  const src = readFileSync(
    join(import.meta.dir, "..", "src", "ComboChart.tsx"),
    "utf8",
  );

  it("its columns really do have a per-subject entrance (the old reason was wrong)", () => {
    // stagger(p, c.index, n, …) — the subject's OWN row index, not a series index.
    expect(src).toMatch(/stagger\(\s*p,\s*c\.index,/);
  });

  it("…and its line is one shared wipe with no per-point index to permute", () => {
    // A single clipPath rect whose width is driven by one scalar. If the line ever gains a
    // per-point reveal, combo can be reconsidered for an anchored grain — and this goes red.
    expect(src).toContain("clipPath");
    expect(src).toMatch(/width=\{innerWidth \* wipe/);
    expect(src).not.toMatch(/stagger\(\s*p,\s*pt\.index,/);
  });

  it("so it declares the sequenced grain, and says THAT rather than 'by series'", () => {
    const w = CHART_WALKS.combo;
    expect(w.grain).toBe("sequenced");
    expect(w.reorders).toBeUndefined();
    expect(w.why).toMatch(/wipe|order the x axis fixes|out of step/);
    // The reason it used to give, and which the component contradicts.
    expect(w.why).not.toContain("advances by SERIES");
  });
});
