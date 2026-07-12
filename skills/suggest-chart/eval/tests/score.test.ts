import { describe, it, expect } from "bun:test";
import { scoreSpec } from "../score";

// A valid world choropleth: ISO-A3 country codes join world-2019 on its DW_STATE_CODE key
// (world-2019 has NO ISO_A3 key — verified live, DW_STATE_CODE carries the alpha-3 codes and
// joins ~all rows). validateMapSpec checks this against map-dw/src/basemap-keys.ts.
// 22 countries (≥ 20 rows, ≈ 10% of world-2019's 212 regions): broad enough that the
// sparse-basemap-subset guardrail stays silent — this fixture tests routing/join-key
// machinery, and its old 2-row data was itself the sparse anti-pattern the guard flags.
const validMap = {
  producer: "map-dw",
  mapType: "choropleth",
  basemap: "world-2019",
  mapKeyAttr: "DW_STATE_CODE",
  regionKey: "code",
  valueColumn: "share",
  title: "Renewables form a clear north–south gradient across Europe",
  altInsight: "Norway leads at 99%, France at 27%",
  source: { name: "Ember", url: "https://example.org" },
  data:
    "code,share\nNOR,99\nSWE,68\nFIN,54\nDNK,61\nISL,100\nFRA,27\nDEU,59\nESP,42\nITA,36\nPOL,21\n" +
    "NLD,33\nBEL,28\nAUT,58\nCHE,55\nPRT,47\nGRC,35\nIRL,39\nCZE,22\nHUN,19\nROU,31\nBGR,24\nHRV,44",
};

describe("scoreSpec — map routing", () => {
  it("passes a valid map when a map is expected", () => {
    const r = scoreSpec(validMap, { family: "geographic", element: "map" });
    expect(r.pass).toBe(true);
  });
  it("fails when a map is expected but a chart was emitted (under-routing)", () => {
    const chart = {
      type: "d3-bars",
      title: "x",
      data: "code,share\nNOR,99",
      altInsight: "x",
    };
    const r = scoreSpec(chart, { family: "geographic", element: "map" });
    expect(r.pass).toBe(false);
    expect(r.notes.some((n) => /map/i.test(n))).toBe(true);
  });
  it("fails when a chart is expected but a map was emitted (Gate 5: ranking should stay bars)", () => {
    const r = scoreSpec(validMap, { family: "ranking", element: "chart" });
    expect(r.pass).toBe(false);
    expect(r.notes.some((n) => /map|gate 5/i.test(n))).toBe(true);
  });
  // UNIT EMISSION (QA Wave 10, Italian case): the journalist explicitly wanted the hover
  // to show the exact millimetres, the article measured mm of rainfall — and ② emitted
  // `unit: undefined`, so map-dw's (working) tooltip-unit mechanism had nothing to append.
  // `expect.requireUnit` makes a unit-ful intent mechanically fail a unit-less map spec.
  it("requireUnit: fails a map spec that omits the unit when the intent measures one", () => {
    const r = scoreSpec(validMap, {
      family: "geographic",
      element: "map",
      requireUnit: true,
    });
    expect(r.pass).toBe(false);
    expect(r.notes.some((n) => /unit/i.test(n))).toBe(true);
  });
  it("requireUnit: passes when the emitted map spec carries the unit", () => {
    const r = scoreSpec(
      { ...validMap, unit: " %" },
      { family: "geographic", element: "map", requireUnit: true },
    );
    expect(r.pass).toBe(true);
  });
  it("requireUnit: a blank unit does not satisfy it", () => {
    const r = scoreSpec(
      { ...validMap, unit: "  " },
      { family: "geographic", element: "map", requireUnit: true },
    );
    expect(r.pass).toBe(false);
  });
  it("Gate 5: a ranking framing over non-contiguous geographic blocs must route to a bar, not a choropleth", () => {
    // Finding 6 (eu-renewables-ranking): a hand-picked, non-contiguous set of countries
    // framed as a ranking ("which leads / which lags") has no adjacency to read → bar.
    const rankingBar = {
      type: "d3-bars",
      title: "Norway leads on renewables while Poland lags furthest behind",
      data: "code,share\nNOR,99\nSWE,68\nDEU,59\nFRA,27\nPOL,21",
      altInsight: "Norway highest at 99%, Poland lowest at 21%",
      baseColor: "#009E73",
      sort: "desc",
    };
    // The correct routing (sorted bar) passes.
    expect(
      scoreSpec(rankingBar, {
        family: "ranking",
        element: "chart",
        maxWarnings: 0,
      }).pass,
    ).toBe(true);
    // Routing the same ranking story to a choropleth (the anti-pattern) fails.
    const r = scoreSpec(validMap, { family: "ranking", element: "chart" });
    expect(r.pass).toBe(false);
    expect(r.notes.some((n) => /map|gate 5|bars/i.test(n))).toBe(true);
  });

  it("defaults element to chart (existing behaviour unchanged)", () => {
    const chart = {
      type: "d3-bars",
      title: "Departments by budget share",
      data: "department,budget\nEducation,42\nRoads,31\nHealth,28",
      altInsight: "Education gets the largest share",
      baseColor: "#0072B2",
      sort: "desc",
    };
    const r = scoreSpec(chart, { family: "ranking" }); // no element → chart
    expect(r.validates).toBe(true);
  });
});

const validLine = {
  type: "d3-lines",
  title: "Unemployment fell to a five-year low",
  data: "year,value\n2018,5.1\n2023,3.7",
  altInsight: "Unemployment fell from 5.1% in 2018 to 3.7% in 2023",
  baseColor: "#0072B2",
};

describe("scoreSpec", () => {
  it("passes a valid spec in the right family with no warnings", () => {
    const r = scoreSpec(validLine, {
      family: "change-over-time",
      maxWarnings: 0,
    });
    expect(r.validates).toBe(true);
    expect(r.familyMatch).toBe(true);
    expect(r.guardrailsOk).toBe(true);
    expect(r.pass).toBe(true);
  });

  it("fails and notes an invalid spec", () => {
    const r = scoreSpec(
      { ...validLine, title: "" },
      { family: "change-over-time" },
    );
    expect(r.validates).toBe(false);
    expect(r.pass).toBe(false);
    expect(r.notes.join()).toMatch(/invalid/);
  });

  it("fails when the type is outside the expected family", () => {
    const r = scoreSpec(validLine, { family: "ranking" });
    expect(r.validates).toBe(true);
    expect(r.familyMatch).toBe(false);
    expect(r.pass).toBe(false);
    expect(r.notes.join()).toMatch(/not in family/);
  });

  it("fails when warnings exceed maxWarnings", () => {
    const labelTitle = { ...validLine, title: "year" };
    const r = scoreSpec(labelTitle, {
      family: "change-over-time",
      maxWarnings: 0,
    });
    expect(r.validates).toBe(true);
    expect(r.guardrailsOk).toBe(false);
    expect(r.pass).toBe(false);
    expect(r.notes.join()).toMatch(/warnings/);
  });

  it("passes a no-chart decision when family is none", () => {
    const r = scoreSpec(
      { decision: "no-chart", reason: "data too thin" },
      { family: "none" },
    );
    expect(r.pass).toBe(true);
  });

  it("fails when a chart is emitted but no-chart was expected", () => {
    const r = scoreSpec(validLine, { family: "none" });
    expect(r.pass).toBe(false);
    expect(r.notes.join()).toMatch(/no-chart/);
  });
});

const nativeMap = {
  producer: "map-native",
  regionKey: "code",
  valueField: "share",
  rows: [
    { code: "NOR", share: 99 },
    { code: "POL", share: 21 },
  ],
  basemap: "world",
  title: "Renewables form a clear north–south gradient across Europe",
  description: "Share of electricity from renewables, by country, 2024",
  valueUnit: "%",
  source: { name: "Ember", url: "https://example.org" },
};

describe("scoreSpec — native map", () => {
  it("passes a valid map-native config when producer map-native is expected", () => {
    const r = scoreSpec(nativeMap, {
      family: "geographic",
      element: "map",
      producer: "map-native",
    });
    expect(r.pass).toBe(true);
  });
  it("fails when producer map-native is expected but a map-dw spec was emitted", () => {
    const mapDw = {
      producer: "map-dw",
      mapType: "choropleth",
      basemap: "world-2019",
      mapKeyAttr: "DW_STATE_CODE",
      regionKey: "code",
      valueColumn: "share",
      data: "code,share\nNOR,99",
      title: "Renewables form a clear north–south gradient across Europe",
      altInsight: "north high, south low",
    };
    const r = scoreSpec(mapDw, {
      family: "geographic",
      element: "map",
      producer: "map-native",
    });
    expect(r.pass).toBe(false);
    expect(r.notes.some((n) => /producer/i.test(n))).toBe(true);
  });
  it("still accepts a map-dw spec when producer is unset (element-level only)", () => {
    const mapDw = {
      producer: "map-dw",
      mapType: "choropleth",
      basemap: "world-2019",
      mapKeyAttr: "DW_STATE_CODE",
      regionKey: "code",
      valueColumn: "share",
      data: "code,share\nNOR,99",
      title: "Renewables form a clear north–south gradient across Europe",
      altInsight: "north high, south low",
    };
    expect(
      scoreSpec(mapDw, { family: "geographic", element: "map" }).validates,
    ).toBe(true);
  });
});

describe("scoreSpec — world choropleth join key (regression: grey dataless map)", () => {
  // A suggester that follows the map-dw guidance MUST emit the valid basemap+key. world-2019's
  // ISO-A3 alpha-3 key is DW_STATE_CODE, NOT ISO_A3 — world-2019 has no ISO_A3 join key at all,
  // so `basemap:"world-2019" + mapKeyAttr:"ISO_A3"` joins 0 rows and ships a fully grey map.
  // validateMapSpec (via basemap-keys.ts) must HARD-reject the broken combo and accept the valid one.
  it("scores the valid world-2019 + DW_STATE_CODE combo as validating", () => {
    const r = scoreSpec(validMap, { family: "geographic", element: "map" });
    expect(r.validates).toBe(true);
    expect(r.pass).toBe(true);
  });
  it("rejects the broken world-2019 + ISO_A3 combo (would render a grey dataless map)", () => {
    const broken = { ...validMap, mapKeyAttr: "ISO_A3" };
    const r = scoreSpec(broken, { family: "geographic", element: "map" });
    expect(r.validates).toBe(false);
    expect(r.pass).toBe(false);
    expect(r.notes.some((n) => /not a join key|DW_STATE_CODE/.test(n))).toBe(
      true,
    );
  });
});

describe("scoreSpec — scrolly", () => {
  const scrolly = {
    producer: "scrolly",
    regionKey: "code",
    valueField: "share",
    rows: [
      { code: "NOR", share: 99 },
      { code: "POL", share: 21 },
    ],
    basemap: "world",
    title: "Renewables form a clear north–south gradient across Europe",
    description: "Share of electricity from renewables, by country, 2024",
    valueUnit: "%",
    source: { name: "Ember", url: "https://example.org" },
  };
  it("passes a valid scrolly config when producer scrolly is expected", () => {
    const r = scoreSpec(scrolly, {
      family: "geographic",
      element: "map",
      producer: "scrolly",
    });
    expect(r.pass).toBe(true);
  });
  it("fails when scrolly is expected but a map-native config was emitted", () => {
    const native = { ...scrolly, producer: "map-native" };
    const r = scoreSpec(native, {
      family: "geographic",
      element: "map",
      producer: "scrolly",
    });
    expect(r.pass).toBe(false);
    expect(r.notes.some((n) => /producer/i.test(n))).toBe(true);
  });
});

describe("scoreSpec — chart-native producer", () => {
  const nativeBar = {
    producer: "chart-native",
    nativeType: "bar",
    title: "Brazil runs on renewables while most big economies still lag",
    source: { name: "Ember 2025", url: "https://ourworldindata.org/x" },
    unit: "share of electricity from renewables (%)",
    data: "country,share\nBrazil,87.3\nIndia,19.8",
  };
  it("passes a valid native bar spec for the magnitude family", () => {
    const r = scoreSpec(nativeBar, {
      family: "magnitude",
      element: "chart",
      producer: "chart-native",
    });
    expect(r.pass).toBe(true);
  });
  it("fails an unknown nativeType", () => {
    const r = scoreSpec(
      { ...nativeBar, nativeType: "wat" },
      { family: "magnitude", element: "chart", producer: "chart-native" },
    );
    expect(r.pass).toBe(false);
    expect(r.notes.join(" ")).toMatch(/nativeType/);
  });
  it("fails a deferred nativeType (② must not route to an unready type)", () => {
    const r = scoreSpec(
      { ...nativeBar, nativeType: "sankey" },
      { family: "magnitude", element: "chart", producer: "chart-native" },
    );
    expect(r.pass).toBe(false);
  });
  it("fails a nativeType outside the intent family", () => {
    const r = scoreSpec(nativeBar, {
      family: "correlation",
      element: "chart",
      producer: "chart-native",
    });
    expect(r.familyMatch).toBe(false);
  });
  it("passes a valid native grouped spec for the magnitude family (post-flip)", () => {
    const r = scoreSpec(
      {
        producer: "chart-native",
        nativeType: "grouped",
        title: "Urban wages pulled ahead of rural pay across every region",
        source: { name: "INSEE 2025", url: "https://insee.fr/x" },
        unit: "median monthly wage (€)",
        data: "region,urban,rural\nNorth,2400,1900",
      },
      { family: "magnitude", element: "chart", producer: "chart-native" },
    );
    expect(r.pass).toBe(true);
  });

  // A grid/matrix intent — a value over TWO categorical dimensions (day × hour),
  // colour = value intensity — must route to the (now-wired) native heatmap, not
  // degrade to a grouped-column fallback (QA Wave 7 er-wait). The wide matrix CSV is
  // rows=first dimension, remaining numeric columns=second dimension.
  it("routes a day×hour matrix intent to a native heatmap in the magnitude family", () => {
    const r = scoreSpec(
      {
        producer: "chart-native",
        nativeType: "heatmap",
        title: "Emergency-room waits peak on Monday mornings",
        source: { name: "County health authority", url: "https://example.org/er" },
        unit: "median wait (minutes)",
        altInsight: "Waits are longest on weekday mornings and shortest overnight.",
        data:
          "day,06-10,10-14,14-18,18-22\n" +
          "Mon,52,38,41,60\nTue,44,33,39,55\nWed,40,31,37,50",
      },
      { family: "magnitude", element: "chart", producer: "chart-native" },
    );
    expect(r.pass).toBe(true);
    expect(r.familyMatch).toBe(true);
    expect(r.validates).toBe(true);
  });
});

describe("scoreSpec — chart-native line/scatter/pie routing + validation", () => {
  const base = {
    source: { name: "OWID 2025", url: "https://ourworldindata.org/x" },
  };
  it("routes a native line spec to change-over-time", () => {
    const r = scoreSpec(
      {
        producer: "chart-native",
        nativeType: "line",
        ...base,
        title: "Renewables climbed every year since 2015",
        unit: "share of electricity (%)",
        data: "year,share\n2015,20\n2020,30\n2024,42",
      },
      {
        family: "change-over-time",
        element: "chart",
        producer: "chart-native",
      },
    );
    expect(r.pass).toBe(true);
  });
  it("routes a native scatter spec to correlation", () => {
    const r = scoreSpec(
      {
        producer: "chart-native",
        nativeType: "scatter",
        ...base,
        title: "Higher spend tracks higher scores",
        unit: "score",
        data: "school,spend,score\nA,5200,72\nB,3100,58",
      },
      { family: "correlation", element: "chart", producer: "chart-native" },
    );
    expect(r.pass).toBe(true);
  });
  it("routes a native pie spec to part-to-whole", () => {
    const r = scoreSpec(
      {
        producer: "chart-native",
        nativeType: "pie",
        ...base,
        title: "Hydro supplies most clean power",
        unit: "share",
        data: "source,gwh\nHydro,420\nWind,180",
      },
      { family: "part-to-whole", element: "chart", producer: "chart-native" },
    );
    expect(r.pass).toBe(true);
  });
  it("fails a native spec with an empty title (validates parity with DW)", () => {
    const r = scoreSpec(
      {
        producer: "chart-native",
        nativeType: "line",
        ...base,
        title: "",
        unit: "x",
        data: "year,v\n2015,1\n2016,2",
      },
      {
        family: "change-over-time",
        element: "chart",
        producer: "chart-native",
      },
    );
    expect(r.validates).toBe(false);
  });
  it("fails a native spec whose data does not fit the type's shape", () => {
    // scatter is `paired` (needs ≥2 numeric); a single-numeric CSV must fail validation
    const r = scoreSpec(
      {
        producer: "chart-native",
        nativeType: "scatter",
        ...base,
        title: "This should not validate",
        unit: "x",
        data: "city,pop\nX,10\nY,20",
      },
      { family: "correlation", element: "chart", producer: "chart-native" },
    );
    expect(r.validates).toBe(false);
  });
});

describe("scoreSpec — channel-driven format gate", () => {
  const nativeBar = {
    producer: "chart-native",
    nativeType: "bar",
    title: "Brazil runs on renewables while most big economies still lag",
    source: { name: "Ember 2025", url: "https://ourworldindata.org/x" },
    unit: "share of electricity from renewables (%)",
    data: "country,share\nBrazil,87.3\nIndia,19.8",
  };

  it("fails an interactive (chart-native) spec on a social-feed channel — interactive is never allowed there", () => {
    const r = scoreSpec(nativeBar, {
      family: "magnitude",
      element: "chart",
      producer: "chart-native",
      channel: "social-feed",
    });
    expect(r.pass).toBe(false);
    expect(
      r.notes.some((n) => /not allowed on channel 'social-feed'/.test(n)),
    ).toBe(true);
  });

  it("allows the same interactive spec on an article-web channel (interactive is the default there)", () => {
    const r = scoreSpec(nativeBar, {
      family: "magnitude",
      element: "chart",
      producer: "chart-native",
      channel: "article-web",
    });
    expect(r.pass).toBe(true);
  });

  it("allows a native spec explicitly rendered as video on a social-vertical channel (video ∈ the social set)", () => {
    // impliedFormat() cannot tell interactive vs video from `producer: "chart-native"`
    // alone (both derive from the same producer) — it prefers an explicit `format`
    // field on the spec itself when present, which disambiguates here.
    const r = scoreSpec(
      { ...nativeBar, format: "video" },
      {
        family: "magnitude",
        element: "chart",
        producer: "chart-native",
        channel: "social-vertical",
      },
    );
    expect(r.pass).toBe(true);
  });

  it("LIMITATION: without an explicit `format` field, a chart-native spec defaults to 'interactive' and is blocked on social channels even if it is actually destined to render as video (a false negative) — ② must set `format` on video renders for this gate to be accurate", () => {
    const r = scoreSpec(nativeBar, {
      family: "magnitude",
      element: "chart",
      producer: "chart-native",
      channel: "social-vertical",
    });
    expect(r.pass).toBe(false);
    expect(
      r.notes.some((n) => /not allowed on channel 'social-vertical'/.test(n)),
    ).toBe(true);
  });

  it("leaves scoring unaffected when expect.channel is unset (back-compat)", () => {
    const r = scoreSpec(nativeBar, {
      family: "magnitude",
      element: "chart",
      producer: "chart-native",
    });
    expect(r.pass).toBe(true);
  });
});

describe("scoreSpec — aspect↔type guard (row-driven horizontal type vs portrait/square channel)", () => {
  const rowDrivenBar = {
    type: "d3-bars",
    title: "Estonia recycles the most packaging waste in Europe",
    data: "country,rate\nEstonia,63\nMalta,31",
    altInsight: "Estonia recycles the most packaging waste in Europe.",
    baseColor: "#009E73",
  };

  it("fails a row-driven d3-bars spec on a social-vertical (portrait) channel", () => {
    const r = scoreSpec(rowDrivenBar, {
      family: "magnitude",
      element: "chart",
      channel: "social-vertical",
    });
    expect(r.pass).toBe(false);
    expect(r.notes.some((n) => /row-driven type 'd3-bars'/.test(n))).toBe(true);
  });

  it("does not flag a column-chart (not row-driven) on the same portrait channel", () => {
    const r = scoreSpec(
      { ...rowDrivenBar, type: "column-chart" },
      { family: "magnitude", element: "chart", channel: "social-vertical" },
    );
    expect(r.notes.some((n) => /row-driven/.test(n))).toBe(false);
    expect(r.pass).toBe(true);
  });

  it("does not flag a row-driven d3-bars spec on the article-web (landscape) channel", () => {
    const r = scoreSpec(rowDrivenBar, {
      family: "magnitude",
      element: "chart",
      channel: "article-web",
    });
    expect(r.notes.some((n) => /row-driven/.test(n))).toBe(false);
    expect(r.pass).toBe(true);
  });
});
