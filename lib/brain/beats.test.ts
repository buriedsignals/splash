import { test, expect, describe } from "bun:test";
import { suggestBeats, canDraftBeats } from "./beats";

// The engine's own sample (skills/scrolly/assets/sample-data/line-scrolly.json): seven
// September sea-ice minima. Chosen because it is the shape the scrolly track actually ships.
const SEA_ICE =
  "year,extent\n1979,7.0\n1995,6.1\n2003,6.1\n2007,4.3\n2012,3.6\n2020,3.9\n2025,4.3";

const PREMIUMS =
  "canton,premium\nGenève,583\nVaud,531\nZurich,478\nBern,412\nUri,357";

describe("suggestBeats (line)", () => {
  const { beats, refusal } = suggestBeats({
    nativeType: "line",
    dataCsv: SEA_ICE,
    valueUnit: "million km²",
  });

  test("offers a plan, not a refusal", () => {
    expect(refusal).toBeUndefined();
    expect(beats.length).toBeGreaterThanOrEqual(3);
  });

  test("anchors on x values that are actually in the data, in data order", () => {
    const xs = SEA_ICE.split("\n")
      .slice(1)
      .map((l) => l.split(",")[0]);
    const anchors = beats.map((b) => b.anchor.value);
    for (const a of anchors) expect(xs).toContain(a);
    // ascending through the series — a line beat plan walks the data
    const positions = anchors.map((a) => xs.indexOf(a));
    expect(positions).toEqual([...positions].sort((p, q) => p - q));
    expect(new Set(anchors).size).toBe(anchors.length);
  });

  test("opens on establish, closes on payoff, and never guesses the turn", () => {
    expect(beats[0]!.role).toBe("establish");
    expect(beats[beats.length - 1]!.role).toBe("payoff");
    expect(beats.some((b) => b.role === "build")).toBe(true);
    expect(beats.some((b) => b.role === "turn")).toBe(false);
  });

  test("ids are positional, so the id encodes the order the guard checks", () => {
    expect(beats.map((b) => b.id)).toEqual(
      beats.map((_, i) => `beat-${i + 1}`),
    );
  });

  test("every beat carries a draft caption — shown as a starting point", () => {
    for (const b of beats) expect(b.draftText.trim().length).toBeGreaterThan(0);
  });

  test("a beat's own facts carry its anchor and its value", () => {
    const first = beats[0]!;
    expect(Object.values(first.beatSource.facts)).toContain("1979");
    expect(Object.values(first.beatSource.facts)).toContain("7");
  });

  test("the plan's shared facts carry the series' shape", () => {
    const shared = beats[0]!.beatSource.shared;
    expect(shared.points).toBe("7");
    expect(shared.first).toBe("7");
    expect(shared.last).toBe("4.3");
    expect(shared.min).toBe("3.6");
    expect(shared.max).toBe("7");
    expect(shared.change).toBe("-2.7");
    // (4.3 - 7) / 7 * 100 = -38.571… → two decimals
    expect(shared.changePercent).toBe("-38.57");
  });
});

describe("suggestBeats (bar)", () => {
  const { beats, refusal } = suggestBeats({
    nativeType: "bar",
    dataCsv: PREMIUMS,
    valueUnit: "CHF",
  });

  test("offers a plan", () => {
    expect(refusal).toBeUndefined();
    expect(beats.length).toBeGreaterThanOrEqual(3);
  });

  test("anchors on categories, in the order the bars will actually render", () => {
    const cats = PREMIUMS.split("\n")
      .slice(1)
      .map((l) => l.split(",")[0]);
    const anchors = beats.map((b) => b.anchor.value);
    for (const a of anchors) expect(cats).toContain(a);
    for (const b of beats) expect(b.anchor.kind).toBe("category");
    // A beat plan pins the bar sort to "none" (resolveBarSort), so the bars render in DATA
    // row order — a walk in any other order makes the highlight jump around the chart
    // (narrativeBeatWarnings names exactly this).
    const positions = anchors.map((a) => cats.indexOf(a));
    expect(positions).toEqual([...positions].sort((p, q) => p - q));
  });

  test("picks the salient rows — the leaders and the tail", () => {
    const anchors = beats.map((b) => b.anchor.value);
    expect(anchors).toContain("Genève"); // top
    expect(anchors).toContain("Uri"); // tail
  });

  test("shared facts describe the distribution", () => {
    const shared = beats[0]!.beatSource.shared;
    expect(shared.rows).toBe("5");
    expect(shared.top).toBe("583");
    expect(shared.bottom).toBe("357");
    expect(shared.range).toBe("226");
    expect(shared.total).toBe("2361");
  });
});

describe("suggestBeats — refusals, in the engine's own words", () => {
  test("refuses a type the engine's beats override does not support", () => {
    const { beats, refusal } = suggestBeats({
      nativeType: "scatter",
      dataCsv: "country,spend,life\nUS,10,78\nJP,4,84\nFR,5,82\nDE,6,81",
    });
    expect(beats).toEqual([]);
    expect(refusal).toContain("line");
    expect(refusal).toContain("bar");
    expect(refusal).toContain("scatter");
  });

  test("refuses a series too short to carry an argument, naming the arc", () => {
    const { beats, refusal } = suggestBeats({
      nativeType: "line",
      dataCsv: "year,extent\n2020,3.9\n2025,4.3",
    });
    expect(beats).toEqual([]);
    expect(refusal).toContain("establish");
    expect(refusal).toContain("build");
    expect(refusal).toContain("payoff");
  });

  test("refuses data with no numeric column", () => {
    const { beats, refusal } = suggestBeats({
      nativeType: "line",
      dataCsv: "region,note\nNord,low\nSud,high\nEst,mid",
    });
    expect(beats).toEqual([]);
    expect(refusal!.length).toBeGreaterThan(0);
  });
});

describe("suggestBeats — an explicit anchor list (the re-draft door)", () => {
  test("honours the journalist's own anchors, in their order", () => {
    const { beats, refusal } = suggestBeats({
      nativeType: "line",
      dataCsv: SEA_ICE,
      anchors: ["2012", "1979", "2025"],
    });
    expect(refusal).toBeUndefined();
    expect(beats.map((b) => b.anchor.value)).toEqual(["2012", "1979", "2025"]);
    expect(beats[0]!.role).toBe("establish");
    expect(beats[2]!.role).toBe("payoff");
  });

  test("refuses an anchor that is not in the data, naming it", () => {
    const { beats, refusal } = suggestBeats({
      nativeType: "line",
      dataCsv: SEA_ICE,
      anchors: ["2012", "1066", "2025"],
    });
    expect(beats).toEqual([]);
    expect(refusal).toContain("1066");
  });

  test("still refuses an explicit list too short for an arc", () => {
    const { refusal } = suggestBeats({
      nativeType: "line",
      dataCsv: SEA_ICE,
      anchors: ["1979", "2025"],
    });
    expect(refusal).toContain("build");
  });
});

// ---------------------------------------------------------------------------
// THE MAP WALK — sub-project ③ (docs/superpowers/specs/2026-08-04-proposal-step-design.md).
// A map's walk was never machine-drafted: `arcBeats` had to be written from nothing, which is
// the opposite of the proposal step. These pin what the brain may now offer, and what it still
// must refuse.
// ---------------------------------------------------------------------------
const RENTS =
  "canton,rent\nGenève,1780\nZug,1690\nZurich,1610\nVaud,1450\nBern,1290\nJura,1010";

describe("suggestBeats (map)", () => {
  const { beats, refusal } = suggestBeats({
    nativeType: "choropleth",
    dataCsv: RENTS,
    valueUnit: "CHF",
  });

  test("offers a plan for a map type it used to refuse outright", () => {
    expect(refusal).toBeUndefined();
    expect(beats.length).toBeGreaterThanOrEqual(3);
  });

  test("anchors on REGION, not on a chart axis", () => {
    for (const b of beats) expect(b.anchor.kind).toBe("region");
  });

  test("anchors on region keys the data actually carries, in data order", () => {
    const keys = RENTS.split("\n")
      .slice(1)
      .map((l) => l.split(",")[0]!);
    const anchors = beats.map((b) => b.anchor.value);
    for (const a of anchors) expect(keys).toContain(a);
    const positions = anchors.map((a) => keys.indexOf(a));
    expect([...positions].sort((x, y) => x - y)).toEqual(positions);
  });

  test("drafts a factual caption and leaves the claim unwritten", () => {
    expect(beats[0]!.draftText).toContain("Genève");
    expect(beats[0]!.draftText).toContain("1780");
    // The seam's whole point: what the machine offers lives in draftText, never in text.
    expect(beats[0]).not.toHaveProperty("text");
  });

  test("carries the plan-wide facts a claim may cite", () => {
    expect(beats[0]!.beatSource.shared.top).toBe("1780");
    expect(beats[0]!.beatSource.facts.region).toBe("Genève");
  });

  test("walks the arc: establish → … → payoff", () => {
    expect(beats[0]!.role).toBe("establish");
    expect(beats[beats.length - 1]!.role).toBe("payoff");
  });

  test("honours the journalist's own regions, in their order", () => {
    const { beats: own, refusal: r } = suggestBeats({
      nativeType: "symbol",
      dataCsv: RENTS,
      anchors: ["Jura", "Genève", "Bern"],
    });
    expect(r).toBeUndefined();
    expect(own.map((b) => b.anchor.value)).toEqual(["Jura", "Genève", "Bern"]);
  });

  test("refuses route and hex-grid — their anchor does not exist until produce", () => {
    for (const t of ["route", "hex-grid"]) {
      const { beats: none, refusal: why } = suggestBeats({
        nativeType: t,
        dataCsv: RENTS,
      });
      expect(none).toEqual([]);
      expect(why).toContain(t);
    }
  });
});

describe("suggestBeats (map) — the anchor column is the run's own, not the first column", () => {
  // The defect this closes: a map's region column is whatever the geography MATCHED
  // (run.orient.geo.column), and nothing guarantees it is column 0. Anchoring on the first
  // column regardless would draft a walk anchored on the wrong thing — silently, since the
  // labels would still be strings the data carries.
  const SHIFTED = "id,canton,rent\n1,Genève,1780\n2,Zug,1690\n3,Vaud,1450\n4,Jura,1010";

  test("anchors on the named key column", () => {
    const { beats, refusal } = suggestBeats({
      nativeType: "choropleth",
      dataCsv: SHIFTED,
      keyColumn: "canton",
    });
    expect(refusal).toBeUndefined();
    for (const b of beats)
      expect(["Genève", "Zug", "Vaud", "Jura"]).toContain(b.anchor.value);
  });

  test("refuses a key column the data does not carry, naming what it does", () => {
    const { beats, refusal } = suggestBeats({
      nativeType: "choropleth",
      dataCsv: SHIFTED,
      keyColumn: "region",
    });
    expect(beats).toEqual([]);
    expect(refusal).toContain("region");
    expect(refusal).toContain("canton");
  });
});

describe("canDraftBeats — which (type, format) pairs can be proposed a walk", () => {
  test("a bar VIDEO can be, since sub-project ④ made its bars enter in the walk's order", () => {
    expect(canDraftBeats("bar", "video")).toBe(true);
  });

  test("a LINE video cannot — its line draws continuously, there is no entrance to reorder", () => {
    expect(canDraftBeats("line", "video")).toBe(false);
  });

  test("both remain proposable in scrolly, unchanged", () => {
    expect(canDraftBeats("bar", "scrolly")).toBe(true);
    expect(canDraftBeats("line", "scrolly")).toBe(true);
  });

  test("a chart's static/interactive are not narrative formats at all", () => {
    for (const f of ["static", "interactive"]) {
      expect(canDraftBeats("bar", f)).toBe(false);
      expect(canDraftBeats("line", f)).toBe(false);
    }
  });
});

// The counterpart of the line refusal above, pinned so the two cannot drift into one claim:
// a bar video IS routed, and that is what makes the "chart video is closed" wording false.
test("the chart track's video is open for bar and closed for line — not one answer for both", () => {
  expect(canDraftBeats("bar", "video")).toBe(true);
  expect(canDraftBeats("line", "video")).toBe(false);
});
