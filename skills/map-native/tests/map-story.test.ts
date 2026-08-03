import { describe, it, expect } from "bun:test";
import { computeChoropleth, type ChoroplethData } from "../src/choropleth-geo";
import {
  deriveMapStory,
  deriveTakeawayCopy,
  magnitudeRevealRows,
  magnitudeCaption,
  auditMapStoryReveals,
} from "../src/map-story";

// The narrow no-break space (U+202F) — French/German unit + group separator, the same
// glyph core/locale's `labelWithUnit`/`localizeNumberString` emit.
const NBSP = " ";

function feat(iso: string, name: string, x: number, y: number) {
  return {
    type: "Feature",
    properties: { iso_a3: iso, name },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [x, y],
          [x + 1, y],
          [x + 1, y + 1],
          [x, y + 1],
          [x, y],
        ],
      ],
    },
  };
}
const features = {
  type: "FeatureCollection",
  features: [
    feat("NOR", "Norway", 8, 60),
    feat("DEU", "Germany", 10, 50),
    feat("POL", "Poland", 19, 52),
  ],
} as any;
const data: ChoroplethData = {
  regionKey: "code",
  valueField: "share",
  rows: [
    { code: "NOR", share: 99 },
    { code: "DEU", share: 59 },
    { code: "POL", share: 21 },
  ],
};
const meta = {
  title: "Renewables across Europe",
  insight: "North high, south low",
  unit: "%",
};

describe("deriveMapStory — value grammar", () => {
  const feats = {
    type: "FeatureCollection",
    features: [feat("NOR", "Norway", 8, 60), feat("DEU", "Germany", 10, 50)],
  } as any;
  it("singularises a plural WORD unit when the value is 1 ('1 nights' → '1 night')", () => {
    const d: ChoroplethData = {
      regionKey: "code",
      valueField: "nights",
      rows: [
        { code: "NOR", nights: 1 },
        { code: "DEU", nights: 40 },
      ],
    };
    const layout = computeChoropleth(d, feats, "iso_a3");
    const beats = deriveMapStory(layout, feats, "iso_a3", {
      title: "T",
      insight: "i",
      unit: " nights",
    });
    const reveals = beats.filter((b) => b.kind === "reveal");
    const one = reveals.find((b) => b.callout?.name === "Norway");
    expect(one?.callout?.value).toBe("1 night"); // not "1 nights"
  });
  it("localizes callout numbers when meta.lang is fr (thousands grouping AND the narrow no-break space before the unit, not a plain space)", () => {
    const d: ChoroplethData = {
      regionKey: "code",
      valueField: "mw",
      rows: [
        { code: "NOR", mw: 33900 },
        { code: "DEU", mw: 25600 },
      ],
    };
    const layout = computeChoropleth(d, feats, "iso_a3");
    const beats = deriveMapStory(layout, feats, "iso_a3", {
      title: "T",
      insight: "i",
      unit: " MW",
      lang: "fr",
    });
    const nor = beats.find((b) => b.callout?.name === "Norway");
    expect(nor?.callout?.value).toBe("33 900 MW");
  });
  it("never touches a SYMBOL unit like '%' at value 1, and attaches it directly in English", () => {
    const d: ChoroplethData = {
      regionKey: "code",
      valueField: "share",
      rows: [
        { code: "NOR", share: 1 },
        { code: "DEU", share: 40 },
      ],
    };
    const layout = computeChoropleth(d, feats, "iso_a3");
    const beats = deriveMapStory(layout, feats, "iso_a3", {
      title: "T",
      insight: "i",
      unit: " %",
    });
    const one = beats
      .filter((b) => b.kind === "reveal")
      .find((b) => b.callout?.name === "Norway");
    // A symbol unit attaches with no space in English (the same convention symbol-story's
    // labelWithUnit path already applies, e.g. "70%") — not the plain-space "1 %" the old
    // raw-concatenation body produced because the fixture pre-baked the space into `unit`.
    expect(one?.callout?.value).toBe("1%");
  });

  it("spaces a BARE word unit (the real caller convention — config.valueUnit carries no leading space) instead of gluing it (Fix E4)", () => {
    // Real-world regression, same class as the choropleth legend fix: `unit` reaches
    // `deriveMapStory` as `config.valueUnit ?? ""` — bare, no leading space — everywhere it
    // is called (ChoroplethStory.tsx, ChoroplethScrolly.tsx, route-story.ts). The old body
    // did `${formatLocaleNumber(n, meta.lang)}${unit}`, raw concatenation, which only read
    // right for a symbol unit by coincidence; a word unit like "CHF" glued straight onto the
    // number ("1,200CHF").
    const d: ChoroplethData = {
      regionKey: "code",
      valueField: "price",
      rows: [
        { code: "NOR", price: 1200 },
        { code: "DEU", price: 800 },
      ],
    };
    const layout = computeChoropleth(d, feats, "iso_a3");
    const beats = deriveMapStory(layout, feats, "iso_a3", {
      title: "T",
      insight: "i",
      unit: "CHF",
    });
    const nor = beats.find((b) => b.callout?.name === "Norway");
    expect(nor?.callout?.value).toBe("1,200 CHF");
  });
});

describe("deriveTakeawayCopy — distinct data-tied closer", () => {
  it("magnitude (EN): states leader ↔ tail with a 1-to-N gap", () => {
    expect(
      deriveTakeawayCopy({
        pattern: "magnitude",
        maxName: "Kenya",
        maxValue: 75,
        maxLabel: "75%",
        minName: "South Sudan",
        minValue: 8,
        minLabel: "8%",
      }),
    ).toBe("Kenya: 75%, South Sudan: 8% — a 9-fold gap");
  });
  it("magnitude (FR): French colon + 'écart de 1 à N', no risky prepositions", () => {
    expect(
      deriveTakeawayCopy({
        pattern: "magnitude",
        maxName: "Kenya",
        maxValue: 75,
        maxLabel: "75 %",
        minName: "Soudan du Sud",
        minValue: 8,
        minLabel: "8 %",
        lang: "fr",
      }),
    ).toBe("Kenya : 75 %, Soudan du Sud : 8 % — un écart de 1 à 9");
  });
  it("magnitude: drops the ratio clause when the ratio is not meaningful (<2 or min≤0)", () => {
    expect(
      deriveTakeawayCopy({
        pattern: "magnitude",
        maxName: "A",
        maxValue: 12,
        maxLabel: "12",
        minName: "B",
        minValue: 10,
        minLabel: "10",
      }),
    ).toBe("A: 12, B: 10");
  });
  it("temporal: closes on the earliest→latest span, not a ranking", () => {
    expect(
      deriveTakeawayCopy({
        pattern: "temporal",
        maxName: "Croatia",
        maxValue: 2013,
        maxLabel: "2013",
        minName: "Estonia",
        minValue: 2004,
        minLabel: "2004",
      }),
    ).toBe("Estonia: 2004, Croatia: 2013 — a 9-year span");
  });
  it("degenerate single-region story → empty (caller falls back)", () => {
    expect(
      deriveTakeawayCopy({
        pattern: "magnitude",
        maxName: "Solo",
        maxValue: 5,
        maxLabel: "5",
        minName: "Solo",
        minValue: 5,
        minLabel: "5",
      }),
    ).toBe("");
  });
});

describe("deriveMapStory", () => {
  it("magnitude: reveals the ranked leaders (not just max & min) — here all 3, high→low", () => {
    const layout = computeChoropleth(data, features, "iso_a3");
    const beats = deriveMapStory(layout, features, "iso_a3", meta);
    expect(beats.map((b) => b.kind)).toEqual([
      "title",
      "establish",
      "reveal",
      "reveal",
      "reveal",
      "takeaway",
    ]);
    expect(beats[2].highlight).toEqual(["NOR"]); // rank 1 (99)
    expect(beats[3].highlight).toEqual(["DEU"]); // rank 2 (59)
    expect(beats[4].highlight).toEqual(["POL"]); // rank 3 (21)
    expect(beats[2].rank).toBe(1);
    expect(beats[3].rank).toBe(2);
  });
  it("title beat uses meta.title as copy; establish beat has empty copy", () => {
    const layout = computeChoropleth(data, features, "iso_a3");
    const beats = deriveMapStory(layout, features, "iso_a3", meta);
    const [title, establish] = beats;
    expect(title.kind).toBe("title");
    expect(title.copy).toBe(meta.title);
    expect(title.camera).toEqual(layout.bounds);
    expect(title.dim).toBe(false);
    expect(title.callout).toBeNull();
    expect(establish.kind).toBe("establish");
    expect(establish.copy).toBe("");
    expect(establish.camera).toEqual(layout.bounds);
    expect(establish.dim).toBe(false);
    expect(establish.callout).toBeNull();
  });
  it("first magnitude reveal carries a RANK-AWARE caption ('leads'), not a bare name — value", () => {
    const layout = computeChoropleth(data, features, "iso_a3");
    const beats = deriveMapStory(layout, features, "iso_a3", meta);
    expect(beats[2].callout).toEqual({
      region: "NOR",
      name: "Norway",
      value: "99%",
      text: "Norway leads — 99%",
    });
    expect(beats[2].dim).toBe(true);
    expect(beats[2].copy).toBe("Norway leads — 99%");
    expect(beats[3].copy).toBe("Germany — 59%, 2nd"); // rank-aware, adapts to data
  });
  it("magnitude with MANY regions reveals top-3 leaders + the tail (adapts, F11)", () => {
    // 6 regions → a distribution two beats can't carry. Expect 4 reveals:
    // ranks 1/2/3 (leaders) + the long tail (the minimum).
    const many = {
      type: "FeatureCollection",
      features: ["A", "B", "C", "D", "E", "F"].map((k, i) =>
        feat(k, `Region ${k}`, i, 40 + i),
      ),
    } as any;
    const rich: ChoroplethData = {
      regionKey: "code",
      valueField: "share",
      rows: [
        { code: "A", share: 90 },
        { code: "B", share: 80 },
        { code: "C", share: 70 },
        { code: "D", share: 40 },
        { code: "E", share: 20 },
        { code: "F", share: 5 },
      ],
    };
    const layout = computeChoropleth(rich, many, "iso_a3");
    const beats = deriveMapStory(layout, many, "iso_a3", meta);
    const reveals = beats.filter((b) => b.kind === "reveal");
    expect(reveals.length).toBe(4); // top-3 + tail, not just max & min
    expect(reveals.map((b) => b.highlight[0])).toEqual(["A", "B", "C", "F"]);
    expect(reveals[0].copy).toBe("Region A leads — 90%");
    expect(reveals[3].rankRole).toBe("tail");
    expect(reveals[3].copy).toContain("long tail");
    // The guardrail passes on this adapted story…
    expect(auditMapStoryReveals(beats, 6)).toHaveLength(0);
  });

  it("guardrail FAILS a magnitude story that collapses to 2 reveals for a rich dataset", () => {
    // Simulate the pre-fix behaviour: only max & min revealed for 6 regions.
    const bad = [
      { kind: "reveal", pattern: "magnitude", rank: 1, copy: "A — 90%" } as any,
      { kind: "reveal", pattern: "magnitude", rank: 6, copy: "F — 5%" } as any,
    ];
    const v = auditMapStoryReveals(bad, 6);
    expect(v.some((s) => s.includes("must adapt to the data"))).toBe(true);
  });

  it("magnitudeRevealRows + magnitudeCaption are deterministic and rank-aware", () => {
    const rows = magnitudeRevealRows([
      { key: "A", value: 90 },
      { key: "B", value: 80 },
      { key: "C", value: 70 },
      { key: "D", value: 5 },
    ]);
    expect(rows.map((r) => r.key)).toEqual(["A", "B", "C", "D"]);
    expect(rows[0].rankRole).toBe("leader");
    expect(rows[3].rankRole).toBe("tail");
    expect(magnitudeCaption("Chile", "22%", 1, 4, "leader")).toBe(
      "Chile leads — 22%",
    );
    expect(magnitudeCaption("Spain", "21%", 2, 4, "leader")).toBe(
      "Spain — 21%, 2nd",
    );
    expect(magnitudeCaption("South Africa", "4%", 16, 4, "tail")).toBe(
      "The long tail — South Africa, 4%",
    );
  });

  it("magnitudeCaption threads lang — was English-only for EVERY language before this fix, French included (`ordinal()` took no lang parameter at all)", () => {
    expect(magnitudeCaption("Chile", "22%", 1, 4, "leader", "fr")).toBe(
      "Chile en tête — 22%",
    );
    expect(magnitudeCaption("Spain", "21%", 2, 4, "leader", "fr")).toBe(
      "Spain — 21%, 2e",
    );
    expect(magnitudeCaption("South Africa", "4%", 16, 4, "tail", "fr")).toBe(
      "La longue traîne — South Africa, 4%",
    );
    expect(magnitudeCaption("Chile", "22%", 1, 4, "leader", "de")).toBe(
      "Chile führt — 22%",
    );
    expect(magnitudeCaption("Spain", "21%", 2, 4, "leader", "de")).toBe(
      "Spain — 21%, 2.",
    );
    expect(magnitudeCaption("South Africa", "4%", 16, 4, "tail", "de")).toBe(
      "Der lange Schwanz — South Africa, 4%",
    );
    expect(magnitudeCaption("Chile", "22%", 1, 4, "leader", "it")).toBe(
      "Chile in testa — 22%",
    );
    expect(magnitudeCaption("Spain", "21%", 2, 4, "leader", "it")).toBe(
      "Spain — 21%, 2º",
    );
    expect(magnitudeCaption("South Africa", "4%", 16, 4, "tail", "it")).toBe(
      "La coda lunga — South Africa, 4%",
    );
  });

  it("deriveMapStory threads meta.lang into the magnitude walk — no English leak (the measured leak)", () => {
    const layout = computeChoropleth(data, features, "iso_a3");
    const deBeats = deriveMapStory(layout, features, "iso_a3", {
      ...meta,
      lang: "de",
    });
    const deReveals = deBeats.filter((b) => b.kind === "reveal");
    // German gets the narrow no-break space before "%" too — the same DIN 5008
    // convention as French, per core/locale's labelWithUnit (was glued "99%" before
    // fmt composed through labelWithUnit — the same Fix E4 class, a second occurrence).
    expect(deReveals[0].copy).toBe(`Norway führt — 99${NBSP}%`);
    expect(deReveals[1].copy).toBe(`Germany — 59${NBSP}%, 2.`);

    const itBeats = deriveMapStory(layout, features, "iso_a3", {
      ...meta,
      lang: "it",
    });
    const itReveals = itBeats.filter((b) => b.kind === "reveal");
    expect(itReveals[0].copy).toBe("Norway in testa — 99%");
    expect(itReveals[1].copy).toBe("Germany — 59%, 2º");
  });

  it("takeaway returns to full bounds with the insight copy", () => {
    const layout = computeChoropleth(data, features, "iso_a3");
    const beats = deriveMapStory(layout, features, "iso_a3", meta);
    const last = beats[beats.length - 1];
    expect(last.kind).toBe("takeaway");
    expect(last.camera).toEqual(layout.bounds);
    expect(last.copy).toBe(meta.insight);
  });
  it("consecutive beats have distinct cameras (the camera moves)", () => {
    const layout = computeChoropleth(data, features, "iso_a3");
    const beats = deriveMapStory(layout, features, "iso_a3", meta);
    // title and establish share layout.bounds — that's expected, the reveal beats differ.
    // Assert ≥2 distinct cameras across all beats.
    const cameras = new Set(beats.map((b) => JSON.stringify(b.camera)));
    expect(cameras.size).toBeGreaterThanOrEqual(2);
    // Reveal beats must differ from establish.
    for (let i = 2; i < beats.length - 1; i++) {
      expect(beats[i].camera).not.toEqual(layout.bounds);
    }
  });
  it("emits title → establish → reveal → takeaway when only one region has data", () => {
    const one: ChoroplethData = {
      regionKey: "code",
      valueField: "share",
      rows: [{ code: "DEU", share: 59 }],
    };
    const layout = computeChoropleth(one, features, "iso_a3");
    const beats = deriveMapStory(layout, features, "iso_a3", meta);
    expect(beats.map((b) => b.kind)).toEqual([
      "title",
      "establish",
      "reveal",
      "takeaway",
    ]);
  });
  it("takeaway is a DISTINCT data-tied closer (never the intro) when insight equals title", () => {
    // The bug: with no distinct editorial insight the takeaway went empty and the
    // scrolly re-rendered the intro description as the outro. Now it derives a gap
    // line from the extremes (Norway 99% ↔ Poland 21%, ~5-fold) — distinct + data-tied.
    const layout = computeChoropleth(data, features, "iso_a3");
    const metaSame = { ...meta, insight: meta.title };
    const beats = deriveMapStory(layout, features, "iso_a3", metaSame);
    const last = beats[beats.length - 1];
    expect(last.kind).toBe("takeaway");
    expect(last.copy).toBe("Norway: 99%, Poland: 21% — a 5-fold gap");
    expect(last.copy).not.toBe(meta.title);
  });
  it("beat/callout names come from the DATA label (labelField), not the basemap name", () => {
    // Basemap features are English ("Norway"/"Germany"/"Poland"); the data carries the
    // French display names. With labelField set the narration must use the DATA names.
    const fr: ChoroplethData = {
      regionKey: "code",
      valueField: "share",
      rows: [
        { code: "NOR", nom: "Norvège", share: 99 },
        { code: "DEU", nom: "Allemagne", share: 59 },
        { code: "POL", nom: "Pologne", share: 21 },
      ],
    };
    const layout = computeChoropleth(fr, features, "iso_a3", {
      labelField: "nom",
    });
    expect(layout.labels).toEqual({
      NOR: "Norvège",
      DEU: "Allemagne",
      POL: "Pologne",
    });
    const beats = deriveMapStory(layout, features, "iso_a3", {
      ...meta,
      insight: meta.title, // no distinct editorial insight → derive the takeaway
      lang: "fr",
    });
    const reveals = beats.filter((b) => b.kind === "reveal");
    expect(reveals[0].callout?.name).toBe("Norvège");
    expect(reveals[0].copy).toContain("Norvège");
    // takeaway uses the data names + French phrasing too.
    const last = beats[beats.length - 1];
    expect(last.copy).toContain("Norvège");
    expect(last.copy).toContain("Pologne");
    expect(last.copy).toContain("écart");
  });
  it("without labelField, names fall back to the basemap feature name (back-compat)", () => {
    const layout = computeChoropleth(data, features, "iso_a3");
    expect(layout.labels).toBeUndefined();
    const beats = deriveMapStory(layout, features, "iso_a3", meta);
    const reveals = beats.filter((b) => b.kind === "reveal");
    expect(reveals[0].callout?.name).toBe("Norway");
  });
  it("temporal field: orders reveals earliest→latest and tags seqIndex/seqTotal, no highest/lowest", () => {
    const yearly: ChoroplethData = {
      regionKey: "code",
      valueField: "year",
      rows: [
        { code: "NOR", year: 2009 },
        { code: "DEU", year: 2001 }, // earliest
        { code: "POL", year: 2025 }, // latest
      ],
    };
    const layout = computeChoropleth(yearly, features, "iso_a3");
    const beats = deriveMapStory(layout, features, "iso_a3", {
      title: "Marriage equality spread over time",
      insight: "A wave from 2001 to 2025",
      unit: "",
      valueField: "year",
    });
    const reveals = beats.filter((b) => b.kind === "reveal");
    // 3 regions ≤ ... first + middles + last; here 3 rows → first, one middle, last.
    expect(reveals[0].highlight).toEqual(["DEU"]); // 2001 first
    expect(reveals[reveals.length - 1].highlight).toEqual(["POL"]); // 2025 latest
    expect(reveals[0].pattern).toBe("temporal");
    expect(reveals[0].seqIndex).toBe(0);
    expect(reveals[0].seqTotal).toBe(reveals.length);
    expect(reveals[reveals.length - 1].seqIndex).toBe(reveals.length - 1);
  });

  it("explicit narrativePattern:'temporal' hint forces sequence even for a non-year field name", () => {
    const layout = computeChoropleth(data, features, "iso_a3");
    const beats = deriveMapStory(layout, features, "iso_a3", {
      ...meta,
      valueField: "share",
      narrativePattern: "temporal",
    });
    const reveals = beats.filter((b) => b.kind === "reveal");
    expect(reveals.every((r) => r.pattern === "temporal")).toBe(true);
    // ordered earliest→latest by value: POL(21) → ... → NOR(99)
    expect(reveals[0].highlight).toEqual(["POL"]);
    expect(reveals[reveals.length - 1].highlight).toEqual(["NOR"]);
  });

  it("magnitude field reveals ranked leaders high→low with pattern 'magnitude'", () => {
    const layout = computeChoropleth(data, features, "iso_a3");
    const beats = deriveMapStory(layout, features, "iso_a3", {
      ...meta,
      valueField: "share",
    });
    const reveals = beats.filter((b) => b.kind === "reveal");
    expect(reveals[0].highlight).toEqual(["NOR"]); // rank 1
    expect(reveals[reveals.length - 1].highlight).toEqual(["POL"]); // lowest of the 3
    expect(reveals.every((r) => r.pattern === "magnitude")).toBe(true);
    expect(reveals.every((r) => r.rank !== undefined)).toBe(true); // rank-tagged
  });

  it("breaks max/min ties by ascending region key (deterministic)", () => {
    const tie: ChoroplethData = {
      regionKey: "code",
      valueField: "share",
      rows: [
        { code: "POL", share: 50 },
        { code: "NOR", share: 50 },
        { code: "DEU", share: 10 },
      ],
    };
    const layout = computeChoropleth(tie, features, "iso_a3");
    const beats = deriveMapStory(layout, features, "iso_a3", meta);
    expect(beats[2].highlight).toEqual(["NOR"]); // first by key among the tied maxima (was beats[1])
  });
});
