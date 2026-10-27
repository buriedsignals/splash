import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  GestureRefusal,
  applyFix,
  validateGestures,
} from "../craft/_shared/gesture-core.mjs";
import {
  createGeoPoint,
  pointMarks,
  stageGeoPoint,
} from "../craft/_shared/gesture-geo-point-family.mjs";
import { composeGeoPointStatic } from "../craft/_shared/gesture-geo-point-static.mjs";
import { scheduleGeoPointWeb } from "../craft/_shared/gesture-geo-point-web.mjs";
import {
  cameraAt,
  scheduleGeoPointVideo,
  wordsAt,
} from "../craft/_shared/gesture-geo-point-video.mjs";
import { flatStates, scheduleGeoPointScrolly } from "../craft/_shared/gesture-geo-point-scrolly.mjs";
// @ts-ignore — a .tsx helper read as data (boxOf)
import { boxOf } from "../craft/_shared/GestureGeoPointMap.tsx";
// @ts-ignore — the kit's own field (Node: reads shapes.geojson)
import { measureSeaDistance } from "../craft/static/contour-isoline.gestures/field.mjs";

const PROOF = join(import.meta.dir, "..", "..", "proof");
const csv = (path: string) => {
  const [head, ...lines] = readFileSync(path, "utf8").trim().split(/\r?\n/);
  const cols = head.split(",");
  return lines.map((l) =>
    Object.fromEntries(l.split(",").map((v, i) => [cols[i], v])),
  );
};
const refusal = (fn: () => unknown) => {
  try {
    fn();
  } catch (error) {
    if (error instanceof GestureRefusal) return error;
    throw error;
  }
  throw new Error("expected a GestureRefusal");
};

// ── the four proofs' marks ──────────────────────────────────────────────────────────────────────

const stations = csv(
  join(PROOF, "static-proportional-symbol-europe-capacity", "stations.csv"),
).map((r) => ({
  value: Number(r.capacity_mw),
  lon: Number(r.lon),
  lat: Number(r.lat),
  group: r.fuel,
  place: r.country,
}));
const SYMBOL = pointMarks("symbol", stations);
const nuclearSites = SYMBOL.filter((m: any) => m.series === "Nuclear");
const SYMBOL_CLAIM = {
  takeaway:
    "A hundredth of the sites carries over a third of Europe's low-carbon capacity",
  entity: nuclearSites.map((m: any) => m.name).join(" "),
  facts: {},
};

const flows = csv(
  join(PROOF, "static-flow-map-ukraine-protection", "data.csv"),
);
const FLOW = pointMarks(
  "flow",
  flows.map((r) => ({ key: r.code, name: r.entity, value: Number(r.people) })),
);
const FLOW_CLAIM = {
  takeaway:
    "4.5 million Ukrainians under temporary protection — Germany and Poland host half of them",
  entity: "Germany",
  versus: "Poland",
  facts: {},
};
const DEU = 1250825;
const POL = 958885;

const places = csv(join(PROOF, "static-locator-zaporizhzhia", "places.csv"));
const LOCATOR = pointMarks("locator", [
  { name: "Zaporizhzhia", lon: 34.5863, lat: 47.5119, subject: true },
  ...places.map((p) => ({
    name: p.name,
    lon: Number(p.lon),
    lat: Number(p.lat),
  })),
]);
const LOCATOR_CLAIM = {
  takeaway: "Europe's largest low-carbon power station is in Ukraine",
  entity: "Zaporizhzhia",
  facts: { Zaporizhzhia: [6000, 34.5863, 47.5119] },
};

const KIT = join(
  import.meta.dir,
  "..",
  "craft",
  "static",
  "contour-isoline.gestures",
);
const study = csv(
  join(PROOF, "static-contour-europe-distance", "countries.csv"),
)
  .map((r) => r.code)
  .filter((c) => c !== "RUS");
const FIELD = measureSeaDistance(KIT, { study });
const km = (v: number) => `${Math.round(v)} km`;
const CONTOUR = pointMarks("contour", {
  levels: FIELD.levels.map((l: number) => ({ name: km(l), value: l })),
  summit: { name: km(FIELD.deepest), value: FIELD.deepest, lon: 27, lat: 53 },
});
const CONTOUR_CLAIM = {
  takeaway:
    "Half of Europe is less than 132 km from the sea, and no point is more than 682 km",
  facts: {},
};

const stage = (
  variant: string,
  marks: any[],
  claim: any,
  format: string,
  gestures: any[],
  schedule: any,
  adapter = {},
) =>
  stageGeoPoint({ variant, gestures, marks, claim, format, adapter, schedule });
const statics = (valid: any, adapter: any) =>
  composeGeoPointStatic({ gestures: valid, adapter });

// ── proportional symbol ─────────────────────────────────────────────────────────────────────────

describe("proportional symbol gestures", () => {
  it("should put every nuclear circle in the accent when the group is highlighted", () => {
    const { scheduled } = stage(
      "symbol",
      SYMBOL,
      SYMBOL_CLAIM,
      "static",
      [
        {
          do: "highlight",
          mark: "Nuclear",
          note: `${nuclearSites.length} nuclear sites`,
        },
        { do: "name", mark: "site 1" },
      ],
      statics,
    );
    expect(scheduled.accent.length).toBe(nuclearSites.length);
  });

  it("should accept a highlight note stating the group's count and refuse one stating a false count", () => {
    const ok = () =>
      stage(
        "symbol",
        SYMBOL,
        SYMBOL_CLAIM,
        "static",
        [
          {
            do: "highlight",
            mark: "Nuclear",
            note: `${nuclearSites.length} nuclear sites`,
          },
        ],
        statics,
      );
    expect(ok).not.toThrow();
    const error = refusal(() =>
      stage(
        "symbol",
        SYMBOL,
        SYMBOL_CLAIM,
        "static",
        [
          {
            do: "highlight",
            mark: "Nuclear",
            note: `${nuclearSites.length + 9} nuclear sites`,
          },
        ],
        statics,
      ),
    );
    expect(error.field).toBe("gestures[0].note");
  });

  it("should give the web page a resting state and a filter control that differ", () => {
    const { scheduled } = stage(
      "symbol",
      SYMBOL,
      SYMBOL_CLAIM,
      "web",
      [
        { do: "highlight", mark: "Nuclear" },
        { do: "filter", mark: "Nuclear" },
      ],
      (v: any, a: any) => scheduleGeoPointWeb({ gestures: v, adapter: a }),
    );
    expect(scheduled.controls[0].state.kept?.length).toBe(nuclearSites.length);
    expect(scheduled.resting.kept).toBeNull();
  });

  it("should refuse spending the accent on two groups (no-spend-accent-country)", () => {
    const adapter = createGeoPoint({ variant: "symbol", marks: SYMBOL });
    const hydro = SYMBOL.find((m: any) => m.series === "Hydro")!.name;
    const state = { ...adapter.rest(), accent: [nuclearSites[0].name, hydro] };
    expect(() => adapter.invariants([state])).toThrow(
      /no-spend-accent-country/,
    );
  });

  it("should refuse a filter that keeps every circle", () => {
    const all = SYMBOL.slice(0, 40);
    const adapter = createGeoPoint({ variant: "symbol", marks: all });
    const error = refusal(() =>
      validateGestures({
        gestures: [{ do: "filter", marks: all.map((m: any) => m.name) }],
        rows: all,
        family: "geo",
        format: "web",
        claim: { takeaway: "x", entity: all[0].name, facts: {} },
        hooks: adapter.hooks,
      }),
    );
    expect(error.fix).toEqual({ remove: 0 });
  });
});

// ── flow ────────────────────────────────────────────────────────────────────────────────────────

describe("flow map gestures", () => {
  const compare = (note: string) => [
    { do: "highlight", mark: "Germany" },
    { do: "compare", marks: ["Germany", "Poland"], note },
  ];

  it("should accept a compare stating the true ratio of the two bands", () => {
    expect(() =>
      stage(
        "flow",
        FLOW,
        FLOW_CLAIM,
        "static",
        compare(`${(DEU / POL).toFixed(1)} times Poland`),
        statics,
      ),
    ).not.toThrow();
  });

  it("should refuse a compare stating a false ratio, with a fix that is the true one", () => {
    const list = compare("1.9 times Poland");
    const error = refusal(() =>
      stage("flow", FLOW, FLOW_CLAIM, "static", list, statics),
    );
    expect(() =>
      stage(
        "flow",
        FLOW,
        FLOW_CLAIM,
        "static",
        applyFix(list, error.fix),
        statics,
      ),
    ).not.toThrow();
  });

  it("should ring the compared band and accent the subject", () => {
    const { scheduled } = stage(
      "flow",
      FLOW,
      FLOW_CLAIM,
      "static",
      compare(`${(DEU / POL).toFixed(1)} times Poland`),
      statics,
    );
    expect([scheduled.accent, scheduled.rings]).toEqual([
      ["Germany"],
      ["Poland"],
    ]);
  });

  it("should accept a filter note stating the kept bands' sum (flows add up)", () => {
    const sum = (DEU + POL).toLocaleString("en-US");
    expect(() =>
      stage(
        "flow",
        FLOW,
        FLOW_CLAIM,
        "static",
        [
          {
            do: "filter",
            marks: ["Germany", "Poland"],
            note: `${sum} together`,
          },
        ],
        statics,
      ),
    ).not.toThrow();
  });

  it("should refuse a compare on three bands, keeping the first two", () => {
    const error = refusal(() =>
      stage(
        "flow",
        FLOW,
        FLOW_CLAIM,
        "static",
        [
          {
            do: "compare",
            marks: ["Germany", "Poland", "Czechia"],
            note: "more",
          },
        ],
        statics,
      ),
    );
    expect(error.fix).toEqual({
      set: { index: 0, field: "marks", value: ["Germany", "Poland"] },
    });
  });

  it("should take three video events whose states all differ, ending at the whole camera", () => {
    const { scheduled } = stage(
      "flow",
      FLOW,
      FLOW_CLAIM,
      "video",
      [
        { do: "reveal" },
        { do: "highlight", mark: "Germany" },
        { do: "filter", marks: ["Germany", "Poland"] },
        { do: "pull-back" },
      ].filter((_, i) => i !== 2),
      (v: any, a: any) => scheduleGeoPointVideo({ gestures: v, adapter: a }),
    );
    expect(scheduled.states.reference.shown).toBe(0);
    expect(scheduled.states.conclusion.camera).toBe("whole");
  });
});

// ── locator ─────────────────────────────────────────────────────────────────────────────────────

describe("locator gestures", () => {
  const adapter = createGeoPoint({
    variant: "locator",
    marks: LOCATOR,
    span: { lon: 4.5, lat: 2.6 },
  });
  const factor = adapter.factorOf(["Zaporizhzhia"])!;
  const zoom = (note: string) => [
    { do: "highlight", mark: "Zaporizhzhia" },
    { do: "zoom", mark: "Zaporizhzhia", note },
    { do: "pull-back" },
  ];

  it("should value each settlement by its distance to the subject, the subject at zero", () => {
    expect([
      LOCATOR[0].value,
      LOCATOR.find((m: any) => m.name === "Kyiv")!.value > 400,
    ]).toEqual([0, true]);
  });

  it("should accept a zoom printing the factor the two cameras give", () => {
    expect(() =>
      stage(
        "locator",
        LOCATOR,
        LOCATOR_CLAIM,
        "video",
        zoom(`×${factor.toFixed(1)}`),
        (v: any, a: any) => scheduleGeoPointVideo({ gestures: v, adapter: a }),
        { span: { lon: 4.5, lat: 2.6 } },
      ),
    ).not.toThrow();
  });

  it("should refuse a zoom printing a false factor (no-let-camera-magnification), and its fix is accepted", () => {
    const list = zoom(`×${(factor * 3).toFixed(0)}`);
    const run = (l: any[]) =>
      stage(
        "locator",
        LOCATOR,
        LOCATOR_CLAIM,
        "video",
        l,
        (v: any, a: any) => scheduleGeoPointVideo({ gestures: v, adapter: a }),
        { span: { lon: 4.5, lat: 2.6 } },
      );
    const error = refusal(() => run(list));
    expect(() => run(applyFix(list, error.fix))).not.toThrow();
  });

  it("should refuse a ring on a settlement, offering the subject", () => {
    const error = refusal(() =>
      stage(
        "locator",
        LOCATOR,
        { ...LOCATOR_CLAIM, takeaway: "Kyiv and Zaporizhzhia" },
        "static",
        [{ do: "highlight", mark: "Kyiv" }],
        statics,
      ),
    );
    expect(error.fix).toEqual({
      set: { index: 0, field: "mark", value: "Zaporizhzhia" },
    });
  });

  it("should travel the camera linearly and gate words while it travels", () => {
    const { scheduled } = stage(
      "locator",
      LOCATOR,
      LOCATOR_CLAIM,
      "video",
      zoom(`×${factor.toFixed(1)}`),
      (v: any, a: any) => scheduleGeoPointVideo({ gestures: v, adapter: a }),
      { span: { lon: 4.5, lat: 2.6 } },
    );
    const mid = cameraAt(scheduled, "subject", 0.2).camZoom;
    expect([
      mid > scheduled.cameras.reveal.camZoom &&
        mid < scheduled.cameras.subject.camZoom,
      wordsAt(scheduled, "subject", 0.2),
      wordsAt(scheduled, "subject", 0.6),
    ]).toEqual([true, false, true]);
  });

  it("should give one scrolly card per gesture and close at the whole camera", () => {
    const { scheduled } = stage(
      "locator",
      LOCATOR,
      LOCATOR_CLAIM,
      "scrolly",
      zoom(`×${factor.toFixed(1)}`).slice(0, 2),
      (v: any, a: any) => scheduleGeoPointScrolly({ gestures: v, adapter: a }),
      { span: { lon: 4.5, lat: 2.6 } },
    );
    expect([
      scheduled.cards.length,
      scheduled.cards[1].state.camera,
      scheduled.closing.state.camera,
    ]).toEqual([2, "closeUp", "whole"]);
  });
});

// ── contour ─────────────────────────────────────────────────────────────────────────────────────

describe("contour gestures", () => {
  const median = Math.round(FIELD.median);
  const reference = (note: string, value = median) => [
    { do: "reference", value, note },
    { do: "name", mark: km(FIELD.deepest) },
  ];

  it("should accept a reference line whose note states the share of land within it", () => {
    expect(() =>
      stage(
        "contour",
        CONTOUR,
        CONTOUR_CLAIM,
        "static",
        reference(
          `${Math.round(FIELD.within(median))} % of the land within ${median} km`,
        ),
        statics,
        { field: FIELD },
      ),
    ).not.toThrow();
  });

  it("should refuse a reference note stating a false share", () => {
    const error = refusal(() =>
      stage(
        "contour",
        CONTOUR,
        CONTOUR_CLAIM,
        "static",
        reference(
          `${Math.round(FIELD.within(median)) + 20} % of the land within ${median} km`,
        ),
        statics,
        { field: FIELD },
      ),
    );
    expect(error.field).toBe("gestures[0].note");
  });

  it("should refuse a reference outside the field, offering its median", () => {
    const error = refusal(() =>
      stage(
        "contour",
        CONTOUR,
        CONTOUR_CLAIM,
        "static",
        reference("beyond", 132 + 900),
        statics,
        { field: FIELD },
      ),
    );
    expect(error.fix).toEqual({
      set: { index: 0, field: "value", value: median },
    });
  });

  it("should refuse a zoom onto a line, offering the summit", () => {
    const error = refusal(() =>
      stage(
        "contour",
        CONTOUR,
        CONTOUR_CLAIM,
        "web",
        [
          { do: "zoom", mark: km(FIELD.levels[0]), note: "×4" },
          { do: "name", mark: km(FIELD.deepest) },
        ],
        (v: any, a: any) => scheduleGeoPointWeb({ gestures: v, adapter: a }),
        { field: FIELD },
      ),
    );
    expect(error.fix).toEqual({
      set: { index: 0, field: "mark", value: km(FIELD.deepest) },
    });
  });

  it("should draw the reference as its own line in the static plate", () => {
    const { scheduled } = stage(
      "contour",
      CONTOUR,
      CONTOUR_CLAIM,
      "static",
      reference(`within ${median} km: half the land`),
      statics,
      { field: FIELD },
    );
    expect(scheduled.lines.map((l: any) => l.value)).toEqual([median]);
  });
});

// ── the static plate and the drive ──────────────────────────────────────────────────────────────

describe("point-map plate and drive", () => {
  it("should refuse a second note on one mark of a still plate, keeping the gesture", () => {
    const error = refusal(() =>
      stage(
        "flow",
        FLOW,
        FLOW_CLAIM,
        "static",
        [
          { do: "highlight", mark: "Germany", note: "the largest" },
          { do: "annotate", mark: "Germany", note: "1,250,825" },
        ],
        statics,
      ),
    );
    expect(error.fix).toEqual({
      set: { index: 1, field: "note", value: undefined },
    });
  });

  it("should give every scrolly card a flat state of finite numbers, each differing from the one before", () => {
    const G = { variant: "flow", W: 1000, H: 760, plate: "", marks: FLOW.slice(0, 3).map((m: any, i: number) => ({ name: m.name, kind: "band", x: 100 * i, y: 50, d: "", w: 2, label: m.name, detail: m.name })), whole: { x: 0, y: 0, w: 1000, h: 760 } };
    const pictures = [
      { roles: { accent: ["Germany"], rings: [], back: [], hidden: [], lines: [] }, focus: null, factor: null },
      { roles: { accent: ["Germany"], rings: ["Poland"], back: [], hidden: [], lines: [] }, focus: null, factor: null },
    ];
    const states = flatStates({ pictures, geometry: G, words: [], boxOf });
    expect([states.every((s: any) => Object.values(s).every((v) => Number.isFinite(v))), states[0].g1, states[1].g1]).toEqual([true, 0, 1]);
  });

  it("should schedule the shipped video examples of the three unrendered types without a held event", () => {
    const sym = () => stage("symbol", SYMBOL, SYMBOL_CLAIM, "video", [{ do: "reveal" }, { do: "highlight", mark: "Nuclear", note: `${nuclearSites.length} nuclear sites` }, { do: "name", mark: "site 1" }], (v: any, a: any) => scheduleGeoPointVideo({ gestures: v, adapter: a }));
    const flow = () => stage("flow", FLOW, FLOW_CLAIM, "video", [{ do: "reveal" }, { do: "highlight", mark: "Germany" }, { do: "compare", marks: ["Germany", "Poland"], note: `${(DEU / POL).toFixed(1)} times Poland` }], (v: any, a: any) => scheduleGeoPointVideo({ gestures: v, adapter: a }));
    const contour = () => stage("contour", CONTOUR, CONTOUR_CLAIM, "video", [{ do: "reveal" }, { do: "reference", value: Math.round(FIELD.median), note: "within the line: half the land" }, { do: "name", mark: km(FIELD.deepest) }], (v: any, a: any) => scheduleGeoPointVideo({ gestures: v, adapter: a }), { field: FIELD });
    for (const run of [sym, flow, contour]) expect(run).not.toThrow();
  });
});

describe("point-map repair", () => {
  it("should repair a false compare ratio to the true ratio, never to the pair's count", () => {
    const list = [{ do: "highlight", mark: "Germany" }, { do: "compare", marks: ["Germany", "Poland"], note: "1.9 times Poland" }];
    const error = refusal(() => stageGeoPoint({ variant: "flow", gestures: list, marks: FLOW, claim: FLOW_CLAIM, format: "static", schedule: statics }));
    expect((error.fix as any).set.value).toBe(`${(DEU / POL).toFixed(1)} times Poland`);
  });
});
