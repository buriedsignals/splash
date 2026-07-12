import { describe, it, expect } from "bun:test";
import { deriveChartStory, narrativeBeatErrors } from "../src/chart-story";

// ---------------------------------------------------------------------------
// Explicit narrative beats — the journalist-confirmed override (spec.beats).
// Wave 8 failure class: the engine auto-picked its beats (line: first+last+
// 2 biggest jumps; bar: top-3+tail) and the journalist's confirmed 3-beat plan
// (farm income) / explicit department walk (aging) had NO field to land in.
// ---------------------------------------------------------------------------

// The farm-income shape: crises 2005-2016 / rebuild 2016-2025 / record+caveat.
const lineSpec = {
  nativeType: "line",
  title: "Farm income fell through a decade of crises, then rebuilt",
  unit: "income index (2005 = 100)",
  source: { name: "X" },
  data: "year,income\n2005,100\n2010,72\n2016,64\n2020,88\n2025,112",
  directLabel: "income",
};

describe("deriveChartStory (line) — explicit beats override", () => {
  const plan = [
    {
      x: "2005",
      xEnd: "2016",
      text: "A decade of crises: income fell by a third",
    },
    {
      x: "2016",
      xEnd: "2025",
      text: "The rebuild: back above water in nine years",
    },
    { x: "2025", text: "A record year — but a caveat on input costs" },
  ];
  const beats = deriveChartStory(
    { ...lineSpec, beats: plan } as never,
    "Farm income is at a record, fragile high",
  );

  it("keeps the title → establish → reveals → takeaway frame", () => {
    expect(beats[0].kind).toBe("title");
    expect(beats[1].kind).toBe("establish");
    expect(beats[beats.length - 1].kind).toBe("takeaway");
  });

  it("emits EXACTLY the confirmed beats, in the confirmed order, with the confirmed captions", () => {
    const reveals = beats.filter((b) => b.kind === "reveal");
    expect(reveals.length).toBe(3);
    expect(reveals.map((b) => b.copy)).toEqual(plan.map((p) => p.text));
  });

  it("anchors each reveal on the beat's x (range → draws to xEnd)", () => {
    const reveals = beats.filter((b) => b.kind === "reveal");
    // 2005-2016 draws to 2016 (index 2); 2016-2025 draws to 2025 (index 4); 2025 = index 4
    expect(reveals.map((b) => b.dataIndex)).toEqual([2, 4, 4]);
  });

  it("closes the takeaway on the FULL line (dataIndex = last data point)", () => {
    const takeaway = beats[beats.length - 1];
    expect(takeaway.kind).toBe("takeaway");
    expect(takeaway.dataIndex).toBe(4);
  });

  it("preserves a NON-chronological journalist order (narrative order wins)", () => {
    const b = deriveChartStory({
      ...lineSpec,
      beats: [
        { x: "2025", text: "Today: a record high" },
        { x: "2016", text: "…but remember the 2016 trough" },
      ],
    } as never);
    const reveals = b.filter((r) => r.kind === "reveal");
    expect(reveals.map((r) => r.dataIndex)).toEqual([4, 2]);
    expect(reveals.map((r) => r.copy)).toEqual([
      "Today: a record high",
      "…but remember the 2016 trough",
    ]);
  });

  it("falls back to the data-tied auto caption when a beat has no text", () => {
    const b = deriveChartStory({
      ...lineSpec,
      beats: [{ x: "2005", xEnd: "2016" }, { x: "2025" }],
    } as never);
    const reveals = b.filter((r) => r.kind === "reveal");
    expect(reveals[0].copy).toBe("2005–2016 — 64");
    expect(reveals[1].copy).toBe("2025 — 112");
  });

  it("fails LOUD on an x value that does not exist in the data (typo tripwire)", () => {
    expect(() =>
      deriveChartStory({
        ...lineSpec,
        beats: [{ x: "2019", text: "no such point" }],
      } as never),
    ).toThrow(/2019/);
    expect(() =>
      deriveChartStory({
        ...lineSpec,
        beats: [{ x: "2019", text: "no such point" }],
      } as never),
    ).toThrow(/2005/); // the error lists the valid x values
  });

  it("fails LOUD on a line beat with no x anchor", () => {
    expect(() =>
      deriveChartStory({
        ...lineSpec,
        beats: [{ text: "anchorless" }],
      } as never),
    ).toThrow(/x/);
  });
});

// The aging-departments shape: 12 categories, an explicit 5-step walk that MUST
// include Alpes-Maritimes (the auto walk is top-3 + tail = 4 steps, cherry-picked).
const barSpec = {
  nativeType: "bar",
  title: "Where the population is aging fastest",
  unit: "share of residents 65+ (%)",
  valueUnit: "%",
  source: { name: "X" },
  data:
    "department,share\nCreuse,34\nNièvre,32\nLot,31\nCantal,30\nGers,29\n" +
    "Dordogne,28\nAveyron,27\nAllier,26\nIndre,25\nHaute-Loire,24\n" +
    "Corrèze,23\nAlpes-Maritimes,22",
};

describe("deriveChartStory (bar) — explicit highlight-walk override", () => {
  const walk = [
    { category: "Creuse" },
    { category: "Cantal" },
    { category: "Aveyron" },
    { category: "Corrèze" },
    {
      category: "Alpes-Maritimes",
      text: "And Alpes-Maritimes — coastal, yet aging too",
    },
  ];
  const beats = deriveChartStory(
    { ...barSpec, beats: walk } as never,
    "Aging is national",
  );

  it("the walk length follows the list length (5, not the fixed auto 4)", () => {
    const reveals = beats.filter((b) => b.kind === "reveal");
    expect(reveals.length).toBe(5);
  });

  it("walks the categories in the confirmed order with display-order highlight indices", () => {
    const reveals = beats.filter((b) => b.kind === "reveal");
    // value-desc display order: Creuse(0) … Alpes-Maritimes(11)
    expect(reveals.map((b) => b.highlightIndex)).toEqual([0, 3, 6, 10, 11]);
    expect(reveals.map((b) => b.callout?.name)).toEqual([
      "Creuse",
      "Cantal",
      "Aveyron",
      "Corrèze",
      "Alpes-Maritimes",
    ]);
  });

  it("uses the confirmed caption when given, the rank-aware auto caption otherwise", () => {
    const reveals = beats.filter((b) => b.kind === "reveal");
    expect(reveals[0].copy).toBe("Creuse leads — 34%"); // rank 1 auto wording
    expect(reveals[4].copy).toBe(
      "And Alpes-Maritimes — coastal, yet aging too",
    );
    expect(reveals[4].rankRole).toBe("tail"); // it IS the minimum in display order
  });

  it("fails LOUD on a category that does not exist in the data (typo tripwire)", () => {
    expect(() =>
      deriveChartStory({
        ...barSpec,
        beats: [{ category: "Alpes-Maritime" }], // missing final s
      } as never),
    ).toThrow(/Alpes-Maritime/);
  });

  it("fails LOUD on a bar beat with no category anchor", () => {
    expect(() =>
      deriveChartStory({ ...barSpec, beats: [{ x: "Creuse" }] } as never),
    ).toThrow(/category/);
  });
});

describe("narrative beats — validation edges", () => {
  it("an EMPTY beats list fails loud (omit the field for the auto narrative)", () => {
    expect(() => deriveChartStory({ ...lineSpec, beats: [] } as never)).toThrow(
      /empty/i,
    );
  });

  it("beats on a SCATTER fail loud (override supports line and bar only)", () => {
    const scatterSpec = {
      nativeType: "scatter",
      title: "Spend vs longevity",
      unit: "",
      source: { name: "X" },
      data: "country,spend,years\nUSA,12500,76\nJapan,4700,84",
      beats: [{ category: "USA" }],
    };
    expect(() => deriveChartStory(scatterSpec as never)).toThrow(
      /line and bar/i,
    );
  });

  it("narrativeBeatErrors returns [] when the override is absent", () => {
    expect(narrativeBeatErrors(lineSpec as never)).toEqual([]);
  });

  it("narrativeBeatErrors reports a typo'd x without throwing", () => {
    const errs = narrativeBeatErrors({
      ...lineSpec,
      beats: [{ x: "1999" }],
    } as never);
    expect(errs.length).toBe(1);
    expect(errs[0]).toContain("1999");
  });
});

// ---------------------------------------------------------------------------
// Regression pin — ABSENT override ⇒ byte-identical auto behavior. These are the
// EXACT beat arrays deriveChartStory produced before the beats override existed
// (captured from the pre-change implementation). Any drift here is a regression
// in the default auto-pick path, not a feature.
// ---------------------------------------------------------------------------
describe("narrative beats — absent override pins the auto path byte-identical", () => {
  const autoLineSpec = {
    nativeType: "line",
    title: "Arctic sea ice has shrunk since 1979",
    unit: "million km²",
    source: { name: "NSIDC" },
    data: "year,extent\n1979,7.0\n1995,6.1\n2012,3.6\n2025,4.3",
    directLabel: "extent",
  };
  const autoBarSpec = {
    nativeType: "bar",
    title: "CO₂ per capita",
    unit: "t",
    source: { name: "X" },
    data: "country,co2\nQatar,35\nUSA,15\nChina,8\nFrance,5\nKenya,1",
  };

  it("line auto beats are byte-identical to the pre-override output", () => {
    const beats = deriveChartStory(
      autoLineSpec as never,
      "The ice keeps thinning",
    );
    expect(JSON.parse(JSON.stringify(beats))).toEqual([
      {
        kind: "title",
        callout: null,
        copy: "Arctic sea ice has shrunk since 1979",
      },
      { kind: "establish", callout: null, copy: "" },
      {
        kind: "reveal",
        progress: 0,
        dataIndex: 0,
        callout: { name: "1979", value: "7", text: "1979 — 7" },
        copy: "1979 — 7",
      },
      {
        kind: "reveal",
        progress: 0.3067995643678385,
        dataIndex: 1,
        callout: { name: "1995", value: "6.1", text: "1995 — 6.1" },
        copy: "1995 — 6.1",
      },
      {
        kind: "reveal",
        progress: 0.7522462426231268,
        dataIndex: 2,
        callout: { name: "2012", value: "3.6", text: "2012 — 3.6" },
        copy: "2012 — 3.6",
      },
      {
        kind: "reveal",
        progress: 1,
        dataIndex: 3,
        callout: { name: "2025", value: "4.3", text: "2025 — 4.3" },
        copy: "2025 — 4.3",
      },
      { kind: "takeaway", callout: null, copy: "The ice keeps thinning" },
    ]);
  });

  it("bar auto beats are byte-identical to the pre-override output", () => {
    const beats = deriveChartStory(autoBarSpec as never, "The gap is vast");
    expect(JSON.parse(JSON.stringify(beats))).toEqual([
      { kind: "title", callout: null, copy: "CO₂ per capita" },
      { kind: "establish", callout: null, copy: "" },
      {
        kind: "reveal",
        highlightIndex: 0,
        rank: 1,
        rankRole: "leader",
        callout: { name: "Qatar", value: "35 t", text: "Qatar — 35 t" },
        copy: "Qatar leads — 35 t",
      },
      {
        kind: "reveal",
        highlightIndex: 1,
        rank: 2,
        rankRole: "leader",
        callout: { name: "USA", value: "15 t", text: "USA — 15 t" },
        copy: "USA — 15 t, 2nd",
      },
      {
        kind: "reveal",
        highlightIndex: 2,
        rank: 3,
        rankRole: "leader",
        callout: { name: "China", value: "8 t", text: "China — 8 t" },
        copy: "China — 8 t, 3rd",
      },
      {
        kind: "reveal",
        highlightIndex: 4,
        rank: 5,
        rankRole: "tail",
        callout: { name: "Kenya", value: "1 t", text: "Kenya — 1 t" },
        copy: "The lowest — Kenya, 1 t",
      },
      { kind: "takeaway", callout: null, copy: "The gap is vast" },
    ]);
  });
});
