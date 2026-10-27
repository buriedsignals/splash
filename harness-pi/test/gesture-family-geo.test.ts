// The Geo family's AREA maps (choropleth, tile cartogram, hex cartogram, dot density): the adapter, the four
// schedulers, and the family rules, on each type's own proof data.
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { GestureRefusal } from "../craft/_shared/gesture-core.mjs";
import * as registry from "../craft/_shared/gesture-registry.mjs";
import * as family from "../craft/_shared/gesture-family-geo.mjs";
import * as staticGeo from "../craft/_shared/gesture-geo-area-static.mjs";
import * as webGeo from "../craft/_shared/gesture-geo-area-web.mjs";
import * as videoGeo from "../craft/_shared/gesture-geo-area-video.mjs";
import * as scrollyGeo from "../craft/_shared/gesture-geo-area-scrolly.mjs";
import * as shapesGeo from "../craft/_shared/gesture-geo-area-shapes.mjs";
import * as runGeo from "../craft/_shared/gesture-geo-area-run.mjs";

// The .mjs modules carry JSDoc, not types: read them as untyped.
const { FAMILIES } = registry as any;
const { createGeo, fitCamera, geoGesturesOf, registerGeoVariant, roundBreaks, zoomFactor } = family as any;
const { calloutForms, composeGeoStatic, stageGeo } = staticGeo as any;
const { scheduleGeoWeb } = webGeo as any;
const { geoFrameState, scheduleGeoVideo } = videoGeo as any;
const { applyGeoAreaState, scheduleGeoScrolly } = scrollyGeo as any;
const { gridCodes, layoutCells } = shapesGeo as any;

const PROOF = join(import.meta.dirname, "..", "..", "proof");
const csv = (path: string) => {
  const [head, ...lines] = readFileSync(path, "utf8")
    .replace(/\r/g, "")
    .trim()
    .split("\n")
    .map((l) => l.split(","));
  return lines.map((l) => Object.fromEntries(head.map((h, i) => [h, l[i]])));
};
const n = (v: string | undefined) => Number(v || 0);

function lowCarbon() {
  return csv(join(PROOF, "static-choropleth-europe-lowcarbon", "data.csv")).map(
    (r) => {
      const clean = [
        "hydro",
        "wind",
        "solar",
        "bioenergy_stacked",
        "other_renewables",
        "nuclear",
      ].reduce((s, k) => s + n(r[`${k}_generation__twh`]), 0);
      const total =
        clean +
        ["gas", "coal", "oil"].reduce(
          (s, k) => s + n(r[`${k}_generation__twh`]),
          0,
        );
      return {
        key: r.code,
        name: r.entity,
        value: total > 0 ? (clean / total) * 100 : null,
      };
    },
  );
}
function protection() {
  const pop = new Map(
    csv(join(PROOF, "static-hex-grid-europe-protection", "population.csv")).map(
      (r) => [r.code, n(r.population_2023)],
    ),
  );
  return [
    ...csv(
      join(PROOF, "static-hex-grid-europe-protection", "protection.csv"),
    ).map((r) => ({
      key: r.code,
      name: r.entity,
      value: (n(r.people) / pop.get(r.code)!) * 1000,
    })),
    { key: "UKR", name: "Ukraine", value: null },
  ];
}
function stations() {
  const counts = new Map<string, number>();
  for (const r of csv(
    join(PROOF, "static-dot-density-europe-stations", "stations.csv"),
  ))
    counts.set(r.fuel, (counts.get(r.fuel) ?? 0) + 1);
  return [...counts].map(([key, value]) => ({ key, name: key, value }));
}

const LOWCARBON = {
  takeaway:
    "Seven European countries clear 94 % low-carbon electricity: six in the north-west, and Albania",
};
const HEX = {
  takeaway:
    "Per inhabitant it is not Germany: Czechia hosts 36.1 Ukrainians per 1,000 inhabitants",
  subject: "Czechia",
};
const DOTS = {
  takeaway:
    "72 reactors among 8,900 low-carbon stations, and a third of the capacity",
};

const choropleth = () =>
  createGeo({
    variant: "choropleth",
    rows: lowCarbon(),
    breaks: [40, 55, 70, 85, 94],
  });
const above = (geo: any, floor: number) =>
  geo.marks.filter((m: any) => m.value >= floor).map((m: any) => m.key);
const refusalOf = (f: () => unknown) => {
  try {
    f();
  } catch (error) {
    if (error instanceof GestureRefusal) return error;
    throw error;
  }
  throw new Error("expected a refusal");
};

describe("the geo family", () => {
  it("should register geo as a non-additive family", () => {
    expect(FAMILIES.geo.additive).toBe(false);
  });
  it("should refuse a bracket because map values do not add up", () => {
    const e = refusalOf(() =>
      stageGeo({
        gestures: [{ do: "bracket", marks: ["ALB", "NOR"] }],
        geo: choropleth(),
        format: "static",
        claim: LOWCARBON,
      }),
    );
    expect(e.message).toContain("not available");
  });
  it("should let another map variant register its own gestures", () => {
    registerGeoVariant("test-point-map", {
      gestures: ["name", "trace"],
      basemap: "live",
      seat: "point",
    });
    expect(geoGesturesOf("test-point-map")).toEqual(["name", "trace"]);
  });
  it("should refuse trace on an area map with a fix that drops it", () => {
    const e = refusalOf(() =>
      stageGeo({
        gestures: [{ do: "trace", mark: "ALB" }],
        geo: choropleth(),
        format: "static",
        claim: LOWCARBON,
      }),
    );
    expect(e.fix).toEqual({ remove: 0 });
  });
  it("should leave a country with no value out of the marks", () => {
    expect(choropleth().marks.some((m: any) => m.key === "UKR")).toBe(false);
  });
  it("should refuse a gesture on a country the source does not report", () => {
    const e = refusalOf(() =>
      stageGeo({
        gestures: [{ do: "name", mark: "UKR" }],
        geo: choropleth(),
        format: "static",
        claim: LOWCARBON,
      }),
    );
    expect(e.field).toBe("gestures[0].mark");
  });
  it("should derive round breaks that rise", () => {
    const b = roundBreaks([3, 17, 41, 88]);
    expect(b.every((x: number, i: number) => i === 0 || x > b[i - 1])).toBe(true);
  });
  it("should print a close-up's factor from two cameras", () => {
    const whole = fitCamera(
      [
        [-25, 34],
        [42, 68],
      ],
      { width: 960, height: 540 },
    );
    const close = fitCamera(
      [
        [19, 39.5],
        [21, 42.5],
      ],
      { width: 960, height: 540 },
    );
    expect(zoomFactor(whole, close)).toBeGreaterThan(5);
  });
  it("should refuse words at a camera nobody measured", () => {
    const geo = createGeo({
      variant: "choropleth",
      rows: lowCarbon(),
      breaks: [40, 55, 70, 85, 94],
      seats: { whole: { ALB: { x: 1, y: 2 } } },
    });
    expect(() => geo.seat("ALB", "closeUp")).toThrow("measured");
  });
});

describe("choropleth", () => {
  it("should accept a filter whose note states the class floor its places sit at", () => {
    const geo = choropleth();
    const keys = above(geo, 94);
    const out = stageGeo({
      gestures: [
        {
          do: "filter",
          marks: keys,
          note: `${keys.length} countries at 94 % or more`,
        },
      ],
      geo,
      format: "static",
      claim: LOWCARBON,
    });
    expect(out.valid[0].note).toBe(`${keys.length} countries at 94 % or more`);
  });
  it("should refuse a filter's count that is not the number of places it keeps", () => {
    const geo = choropleth();
    const keys = above(geo, 94);
    const e = refusalOf(() =>
      stageGeo({
        gestures: [
          {
            do: "filter",
            marks: keys,
            note: `${keys.length - 2} countries at 94 % or more`,
          },
        ],
        geo,
        format: "static",
        claim: LOWCARBON,
      }),
    );
    expect(e.fix).toEqual({
      set: {
        index: 0,
        field: "note",
        value: `${keys.length} countries at 94 % or more`,
      },
    });
  });
  it("should refuse the class floor stated as one place's own value", () => {
    const geo = choropleth();
    const keys = above(geo, 94);
    const e = refusalOf(() =>
      stageGeo({
        gestures: [
          {
            do: "filter",
            marks: keys,
            note: `${keys.length} countries at 94 % or more`,
          },
          { do: "name", mark: "ALB", note: "Albania, 94 %" },
        ],
        geo,
        format: "static",
        claim: LOWCARBON,
      }),
    );
    expect(e.field).toBe("gestures[1].note");
  });
  it("should refuse a reference off the class floors, offering the nearest break", () => {
    const e = refusalOf(() =>
      stageGeo({
        gestures: [{ do: "reference", value: 90 }],
        geo: choropleth(),
        format: "static",
        claim: LOWCARBON,
      }),
    );
    expect(e.fix).toEqual({ set: { index: 0, field: "value", value: 94 } });
  });
  it("should compose distinct plate fields for a filter, a name and a reference", () => {
    const geo = choropleth();
    const keys = above(geo, 94);
    const { staged } = stageGeo({
      gestures: [
        { do: "filter", marks: keys },
        { do: "name", mark: "ALB" },
        { do: "reference", value: 94, note: "the 94 % floor" },
      ],
      geo,
      format: "static",
      claim: LOWCARBON,
      stage: (v: any) => composeGeoStatic({ valid: v, geo }),
    });
    expect([
      staged.accent,
      staged.stepBack.length > 0,
      staged.floorValue,
      staged.named,
    ]).toEqual(["ALB", true, 94, ["ALB"]]);
  });
  it("should repair a false figure into the drawn one", () => {
    const out = stageGeo({
      gestures: [{ do: "name", mark: "ALB", note: "Albania, 80.0 %" }],
      geo: choropleth(),
      format: "static",
      claim: LOWCARBON,
      repair: true,
    });
    expect(out.gestures[0].note).toBe("Albania, 100.0 %");
  });
  it("should print every note in story order in the callout forms", () => {
    const plate = { notes: [{ text: "one" }, { text: "two." }] };
    expect(calloutForms(plate)).toEqual(["one. two.", "one."]);
  });
});

describe("family figures as percentages", () => {
  it("should refuse a count of places stated as a percentage", () => {
    const geo = choropleth();
    const keys = above(geo, 94);
    const e = refusalOf(() => stageGeo({ gestures: [{ do: "filter", marks: keys, note: `${keys.length} % of countries` }], geo, format: "static", claim: LOWCARBON }));
    expect(e.field).toBe("gestures[0].note");
  });
});

describe("the zoom factor", () => {
  it("should refuse a zoom printing a factor the camera does not take", () => {
    const e = refusalOf(() => (runGeo as any).assertZoomFactors([{ do: "zoom", marks: ["ALB"], note: "×8" }], () => 3.1));
    expect(e.fix).toEqual({ set: { index: 0, field: "note", value: "×3.1" } });
  });
});

describe("tile cartogram", () => {
  const geo = () =>
    createGeo({
      variant: "cartogram-area-distortion-and-tile-cartogram",
      rows: lowCarbon(),
      breaks: [40, 60, 75, 94],
    });
  it("should accept the mean of the places on a pull-back", () => {
    const g = geo();
    const mean =
      g.marks.reduce((s: number, m: any) => s + m.value, 0) / g.marks.length;
    const out = stageGeo({
      gestures: [
        { do: "pull-back", note: `mean by country ${mean.toFixed(1)} %` },
      ],
      geo: g,
      format: "static",
      claim: {
        takeaway: `Counted by country, the low-carbon share is ${mean.toFixed(1)} %`,
      },
    });
    expect(out.valid).toHaveLength(1);
  });
  it("should refuse a pull-back mean that the places do not give", () => {
    const e = refusalOf(() =>
      stageGeo({
        gestures: [{ do: "pull-back", note: "mean by country 50.0 %" }],
        geo: geo(),
        format: "static",
        claim: {
          takeaway: "Counted by country, the low-carbon share is 65.1 %",
        },
      }),
    );
    expect(e.field).toBe("gestures[0].note");
  });
  it("should lay one tile per study row on the designed grid", () => {
    const rows = lowCarbon().filter((r) =>
      gridCodes("cartogram-area-distortion-and-tile-cartogram").includes(r.key),
    );
    expect(
      layoutCells("cartogram-area-distortion-and-tile-cartogram", {
        rows,
        box: { x: 0, y: 0, width: 600, height: 400 },
      }).cells,
    ).toHaveLength(rows.length);
  });
});

describe("hex cartogram", () => {
  const geo = () =>
    createGeo({
      variant: "hex-grid-spatial-binning-and-hex-cartogram",
      rows: protection(),
      breaks: [5, 12, 18, 25],
    });
  it("should give the accent to the place the takeaway names as a whole word", () => {
    const g = geo();
    const { staged } = stageGeo({
      gestures: [{ do: "compare", marks: ["CZE", "DEU"] }],
      geo: g,
      format: "static",
      claim: {
        takeaway: "Per habitant, Czechia hosts 36.1 per 1,000 habitants",
        subject: "Czechia",
      },
      stage: (v: any) => composeGeoStatic({ valid: v, geo: g }),
    });
    expect(staged.accent).toBe("CZE");
  });
  it("should ring the compared place in ink beside the accented subject", () => {
    const g = geo();
    const { staged } = stageGeo({
      gestures: [
        {
          do: "compare",
          marks: ["CZE", "DEU"],
          note: "Germany: 14.8 per 1,000",
        },
      ],
      geo: g,
      format: "static",
      claim: HEX,
      stage: (v: any) => composeGeoStatic({ valid: v, geo: g }),
    });
    expect(staged.rings).toEqual(["DEU"]);
  });
  it("should refuse a compare of three places with the first two as the fix", () => {
    const e = refusalOf(() =>
      stageGeo({
        gestures: [{ do: "compare", marks: ["CZE", "DEU", "POL"] }],
        geo: geo(),
        format: "static",
        claim: HEX,
      }),
    );
    expect(e.fix).toEqual({
      set: { index: 0, field: "marks", value: ["Czechia", "Germany"] },
    });
  });
});

describe("dot density", () => {
  const geo = () => createGeo({ variant: "dot-density", rows: stations() });
  it("should accept the whole count of dots in a filter's note", () => {
    const g = geo();
    const total = g.marks.reduce((s: number, m: any) => s + m.value, 0);
    const out = stageGeo({
      gestures: [
        {
          do: "filter",
          marks: ["Nuclear"],
          note: `72 nuclear sites of ${total} stations`,
        },
      ],
      geo: g,
      format: "static",
      claim: DOTS,
    });
    expect(out.valid).toHaveLength(1);
  });
  it("should refuse a reference on a dot map", () => {
    const e = refusalOf(() =>
      stageGeo({
        gestures: [{ do: "reference", value: 72 }],
        geo: geo(),
        format: "static",
        claim: DOTS,
      }),
    );
    expect(e.fix).toEqual({ remove: 0 });
  });
});

describe("the web scheduler", () => {
  const geo = choropleth();
  const keys = above(geo, 94);
  const { valid } = stageGeo({
    gestures: [
      { do: "name", mark: "ALB" },
      { do: "filter", marks: keys },
      { do: "compare", marks: ["ALB", "NOR"] },
    ],
    geo,
    format: "web",
    claim: LOWCARBON,
  });
  const web = scheduleGeoWeb({
    valid,
    geo,
    format: (v: number) => `${Math.round(v)} %`,
  });
  it("should make one control per non-resting gesture", () => {
    expect(web.controls.map((c: any) => c.atom)).toEqual([
      "filter-to-a-subset",
      "toggle-a-comparison",
    ]);
  });
  it("should give every control a picture distinct from the resting one", () => {
    expect(
      web.controls.every((c: any) => !geo.equal(c.state, web.resting)),
    ).toBe(true);
  });
  it("should refuse a page where every gesture rests", () => {
    const only = stageGeo({
      gestures: [{ do: "name", mark: "ALB" }],
      geo,
      format: "static",
      claim: LOWCARBON,
    }).valid;
    expect(() => scheduleGeoWeb({ valid: only, geo })).toThrow(
      "at least one gesture",
    );
  });
});

describe("the video scheduler", () => {
  const geo = choropleth();
  const keys = above(geo, 94);
  const { valid } = stageGeo({
    gestures: [
      { do: "reveal" },
      { do: "filter", marks: keys },
      { do: "pull-back" },
    ],
    geo,
    format: "video",
    claim: LOWCARBON,
  });
  const { events } = scheduleGeoVideo({ valid, geo });
  it("should fill the six events", () => {
    expect(events.map((e: any) => e.event)).toEqual([
      "establish",
      "reference",
      "reveal",
      "subject",
      "conclusion",
      "hold",
    ]);
  });
  it("should climb the classes over the reveal", () => {
    expect([events[1].flat.classes, events[2].flat.classes]).toEqual([0, 6]);
  });
  it("should wash the others in the subject event and lift it in the conclusion", () => {
    expect([events[3].flat["b:DEU"], events[4].flat["b:DEU"]]).toEqual([1, 0]);
  });
  it("should interpolate linearly between two events", () => {
    expect(geoFrameState(events, 2, 0.5).classes).toBe(3);
  });
  it("should refuse a zoom in the conclusion naming pull-back", () => {
    const e = refusalOf(() =>
      stageGeo({
        gestures: [
          { do: "reveal" },
          { do: "name", mark: "ALB" },
          { do: "zoom", marks: ["ALB"], note: "×8" },
        ],
        geo,
        format: "video",
        claim: LOWCARBON,
      }),
    );
    expect(e.fix).toEqual({ set: { index: 2, value: { do: "pull-back" } } });
  });
});

describe("the scrolly scheduler", () => {
  const geo = choropleth();
  const keys = above(geo, 94);
  const claim = { ...LOWCARBON, facts: {} };
  const stage = (gestures: any[]) =>
    stageGeo({ gestures, geo, format: "scrolly", claim }).valid;
  it("should give one card per gesture and a closing card", () => {
    const { cards } = scheduleGeoScrolly({
      valid: stage([
        { do: "filter", marks: keys, card: ["Seven countries."] },
        { do: "name", mark: "ALB", card: ["Albania."] },
      ]),
      geo,
      claim,
    });
    expect(cards.map((c: any) => c.id)).toEqual([
      "g0-filter",
      "g1-name",
      "limits",
    ]);
  });
  it("should refuse a card stating a number its gesture does not draw", () => {
    const e = refusalOf(() =>
      scheduleGeoScrolly({
        valid: stage([{ do: "name", mark: "ALB", card: ["Albania, 61 %."] }]),
        geo,
        claim,
      }),
    );
    expect(e.field).toBe("gestures[0].card");
  });
  it("should lift the filter's wash on the closing card", () => {
    const { states } = scheduleGeoScrolly({
      valid: stage([{ do: "filter", marks: keys, card: ["Seven."] }, { do: "name", mark: "ALB", card: ["Albania."] }]),
      geo,
      claim,
    });
    expect([states[0]["b:DEU"], states[2]["b:DEU"]]).toEqual([1, 0]);
  });
  it("should paint a washed cell with its washed fill", () => {
    const attrs: Record<string, string> = {
      "data-geo-key": "DEU",
      "data-geo-class": "2",
      "data-fill": "#000000",
      "data-back": "#ffffff",
    };
    const path = {
      attrs: {} as Record<string, string>,
      setAttribute(k: string, v: string) {
        this.attrs[k] = v;
      },
    };
    const cell = {
      getAttribute: (k: string) => attrs[k] ?? null,
      querySelector: (sel: string) => (sel === "path" ? path : null),
    };
    const svg = {
      querySelectorAll: (sel: string) =>
        sel === "[data-geo-key]" ? [cell] : [],
      setAttribute() {},
    };
    const root: any = { querySelector: () => svg };
    applyGeoAreaState(root, { classes: 6, "b:DEU": 1 }, { resized: true });
    expect(path.attrs.fill).toBe("#ffffff");
  });
});
