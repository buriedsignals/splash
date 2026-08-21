import { describe, it, expect } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  resolveGrounding,
  groundingScalar,
  readTypeSurvey,
  typeSurvey,
  proposeMediums,
  proposeFormats,
  proposeSizes,
  confirmFormatReachable,
  assertDistinctWays,
  formatCandidates,
  recommendVisualChoice,
} from "../scripts/propose.mjs";

// The frozen profile shape `intake`'s `profileTable` produces, with the run's own numbers:
// three components of a melt total, 14 + 11 + 9 = 34.
const meltProfile = {
  columns: [
    { name: "glace_fondue_mt", type: "number", min: 9, max: 14, sum: 34 },
  ],
};

const mapClosed = {
  map: {
    id: "map",
    opens: "map beats",
    available: false,
    reason: "MAPTILER_KEY is not set",
  },
};

// ---------------------------------------------------------------------------------------------
// THE HOLE THIS FILE EXISTS TO CLOSE.
//
// Measured before `propose.mjs` was written:
//   grep -rn "formatGap(\|capabilityGap(\|groundTakeaway(" skills/ --include=*.mjs
//   -> 4 lines, all four of them the definitions.
//
// `grounding:` and `reachable:` are recorded scalars BOTH Gate-2 readings check, and both gates
// were checking a field no code had ever produced. The convergence was real; the verdict was not.
// This walks the skill's own scripts and asserts each verdict has a caller other than its own
// definition — a rule that goes red the moment the seam is deleted again, which a test importing
// `propose.mjs` directly would not.
//
// RED, in a copy of the tree under /tmp, with the three calls removed from `propose.mjs`:
//
//   77 |       expect(callers.map((c) => c.file).length).toBeGreaterThan(0);
//                                                          ^
//   error: expect(received).toBeGreaterThan(expected)
//   Expected: > 0   Received: 0
//
//   (fail) the verdicts are consulted > groundTakeaway is called by something other than its own definition
//   (fail) the verdicts are consulted > formatGap is called by something other than its own definition
//   (fail) the verdicts are consulted > capabilityGap is called by something other than its own definition
//   ... and 8 more, every one of them a promise this file makes about the proposal
//    16 pass, 11 fail
describe("the verdicts are consulted", () => {
  const scriptsDir = new URL("../scripts/", import.meta.url).pathname;

  // COMMENTS STRIPPED BEFORE SCANNING, and that is not tidiness. The first draft of this guard
  // scanned the raw text and stayed GREEN through the mutation that deleted all three calls —
  // because the header of `propose.mjs` QUOTES the grep that found the hole, so the literals
  // `groundTakeaway(`, `formatGap(` and `capabilityGap(` were all sitting in a comment. A guard
  // that a comment can satisfy is worse than none.
  const code = (text: string) =>
    text.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

  const sources = readdirSync(scriptsDir)
    .filter((f) => f.endsWith(".mjs"))
    .map((f) => ({
      file: f,
      text: code(readFileSync(join(scriptsDir, f), "utf8")),
    }));

  for (const verdict of ["groundTakeaway", "formatGap", "capabilityGap"]) {
    it(`${verdict} is called by something other than its own definition`, () => {
      const callers = sources.filter(
        ({ text }) =>
          !text.includes(`export function ${verdict}`) &&
          new RegExp(`\\b${verdict}\\(`).test(text),
      );
      expect(callers.map((c) => c.file).length).toBeGreaterThan(0);
    });
  }
});

// ---------------------------------------------------------------------------------------------
describe("resolveGrounding — how N claim verdicts become one scalar", () => {
  // Nothing anywhere stated this collapse, so which single word closed G1 was the model's own
  // call — and `supported` is the one that lets it proceed. A real takeaway carrying two numbers
  // typically resolves one and cannot place the other, because every bare integer is range-tested.
  it("should read supported when a claim is confirmed and the rest merely could not be placed", () => {
    const resolved = resolveGrounding(
      "En 2024, 34 Mt de glace ont fondu",
      meltProfile,
    );
    expect(resolved.verdict).toBe("supported");
    expect(resolved.supported.length).toBe(1);
    expect(resolved.unplaceable.length).toBe(1); // the year
    expect(resolved.detail).toContain("could not be placed either way");
    expect(resolved.detail).toContain("glace_fondue_mt");
  });

  it("should read unverifiable when nothing in the takeaway could be placed at all", () => {
    const resolved = resolveGrounding("Le glacier recule depuis 2003", {
      columns: [
        { name: "surface", type: "number", min: 40, max: 90, sum: 500 },
      ],
    });
    expect(resolved.verdict).toBe("unverifiable");
    expect(resolved.supported.length).toBe(0);
    expect(resolved.detail).toContain(
      "nothing was confirmed and nothing was refuted",
    );
  });

  it("should read unverifiable, not supported, for a takeaway with no checkable claim in it", () => {
    const resolved = resolveGrounding("Le glacier recule", meltProfile);
    expect(resolved.claims.length).toBe(0);
    expect(resolved.verdict).toBe("unverifiable");
  });

  it("should read contradicted when a single claim is refuted, whatever else resolved", () => {
    const profile = {
      columns: [
        { name: "year", type: "number", min: 1990, max: 2024, sum: null },
        { name: "co2", type: "number", min: 30, max: 40, sum: 700 },
      ],
      rows: [
        { year: 1993, co2: 35.95 },
        { year: 2024, co2: 37.18 },
      ],
    };
    const resolved = resolveGrounding(
      "less CO2 in 2024 than in any year since 1993",
      profile,
    );
    expect(resolved.verdict).toBe("contradicted");
    expect(resolved.detail).toContain("the data refutes");
  });

  // `groundTakeaway` now returns `{ claims, coverage }` (round-three stress redesign); this is the
  // ONE caller `coverage.unevaluated` is written for (see `ground-claim.mjs`'s own header). A
  // sentence that produced no claim at all is named in `detail`, not silently dropped alongside
  // the sentence that WAS checked.
  it("should fold coverage.unevaluated into the detail, naming the untouched sentence", () => {
    const resolved = resolveGrounding(
      "En 2024, 34 Mt de glace ont fondu. Renewables overtook coal as the main source.",
      meltProfile,
    );
    expect(resolved.coverage.unevaluated).toEqual(["Renewables overtook coal as the main source."]);
    expect(resolved.detail).toContain("Renewables overtook coal as the main source");
  });
});

// =============================================================================================
// ROUND FOUR (2026-08-21), finding 4 — the scalar stops discarding its own coverage.
//
// `stress-s-unspent-fund` closed G1 `supported` on ONE match: the incidental `2026`, inside a
// `year` column whose min and max are both 2026 — a check that cannot fail. The two numbers the
// sentence actually asserts, 4.1 and 0, both came back unverifiable. One incidental numeral
// outvoted the two load-bearing ones and closed the editorial gate.
//
// Run against the story's OWN frozen profile and CSV, not a fixture built to fail.
const storyFile = (relative) =>
  readFileSync(new URL(`../../../stories/${relative}`, import.meta.url), "utf8");
const storyProfile = (story) => JSON.parse(storyFile(`${story}/source/profile.json`));
const storyCsv = (story) => storyFile(`${story}/source/data.csv`);

describe("resolveGrounding — a scalar that reflects what the data actually decided", () => {
  const STRESS_S_TAKEAWAY =
    "Of the €4.1 billion allocated to the regional resilience fund, €0 had been disbursed by the end of June 2026.";

  it("should refuse to close G1 supported on a tautological match, on the real frozen story", () => {
    const resolved = resolveGrounding(STRESS_S_TAKEAWAY, storyProfile("stress-s-unspent-fund"), {
      csv: storyCsv("stress-s-unspent-fund"),
    });
    expect(resolved.verdict).toBe("unverifiable");
    expect(groundingScalar(resolved)).toBe("unverifiable");
    expect(resolved.supported.length).toBe(0);
    expect(resolved.consistent.length).toBe(1);
    expect(resolved.detail).toContain("placed but not confirmed");
    expect(resolved.detail).toContain("CANNOT FAIL");
  });

  it("should report the decided fraction of the takeaway in every detail it writes", () => {
    const resolved = resolveGrounding(STRESS_S_TAKEAWAY, storyProfile("stress-s-unspent-fund"), {
      csv: storyCsv("stress-s-unspent-fund"),
    });
    expect(resolved.coverage.decided).toBe(0);
    expect(resolved.detail).toContain("0 of 1 sentence(s)");
  });

  it("should close supported on a real story whose superlative the frozen table confirms", () => {
    const resolved = resolveGrounding(
      "Germany has the most.",
      storyProfile("stress-l-mixed-unit-clinics"),
      { csv: storyCsv("stress-l-mixed-unit-clinics") },
    );
    expect(resolved.verdict).toBe("supported");
    expect(groundingScalar(resolved)).toBe("supported");
    expect(resolved.coverage.decided).toBe(1);
  });

  it("should refuse to close supported while a sentence of the takeaway produced no claim at all", () => {
    const resolved = resolveGrounding(
      "Germany has the most. Renewables overtook coal as the main source.",
      storyProfile("stress-l-mixed-unit-clinics"),
      { csv: storyCsv("stress-l-mixed-unit-clinics") },
    );
    expect(resolved.supported.length).toBe(1);
    expect(resolved.verdict).toBe("unverifiable");
    expect(resolved.detail).toContain("did not read the whole");
  });
});

describe("groundingScalar — contradicted never closes G1", () => {
  const refuted = {
    verdict: "contradicted",
    detail: "co2 in 2024 = 37.18 is not less than co2 in 1993 = 35.95",
  };

  it("should refuse to hand back a closing value for a refuted takeaway", () => {
    expect(() => groundingScalar(refuted)).toThrow(/never closes G1/);
  });

  // The override reason is the JOURNALIST's. This function will not manufacture one, which is why
  // an empty string is refused exactly as a missing one is.
  it("should refuse an override with no reason behind it", () => {
    expect(() => groundingScalar(refuted, { override: "   " })).toThrow(
      /never closes G1/,
    );
  });

  it("should write the override in the vocabulary both gates read", () => {
    expect(
      groundingScalar(refuted, {
        override: "the series was revised after publication",
      }),
    ).toBe('overridden — "the series was revised after publication"');
  });

  it("should pass a resolved verdict straight through", () => {
    expect(groundingScalar({ verdict: "supported", detail: "" })).toBe(
      "supported",
    );
    expect(groundingScalar({ verdict: "unverifiable", detail: "" })).toBe(
      "unverifiable",
    );
  });
});

// ---------------------------------------------------------------------------------------------
describe("the survey — what could be made of this data", () => {
  it("should read every type sheet the generated survey holds, with its own purpose sentence", () => {
    const rows = typeSurvey();
    expect(rows.length).toBe(40);
    expect(rows.filter((r) => r.medium === "chart").length).toBe(32);
    expect(rows.filter((r) => r.medium === "map").length).toBe(8);
    for (const row of rows) {
      expect(row.purpose.length).toBeGreaterThan(20);
      expect(row.sheet).toMatch(/references\/types\/.+\.md$/);
    }
  });

  // "Proven on disk" is a COVERAGE fact, never a reachability one, and the two must not collapse
  // into each other: a type nobody has rendered here yet is worth saying out loud.
  it("should keep an unrendered type's proven formats empty rather than inventing one", () => {
    const rows = readTypeSurvey(
      [
        "## Chart types",
        "| type | what it is for | when NOT to reach for it | refuses when | same idea as | proven formats | sheet |",
        "|---|---|---|---|---|---|---|",
        "| **Beeswarm** | Every raw observation on one axis. | Not past a few hundred points. | — | — | — none rendered here yet | `chart-beat/references/types/beeswarm.md` |",
        "| **Bar and column** | One value per category. | Not for a real time series. | — | — | static, web | `chart-beat/references/types/bar-and-column.md` |",
      ].join("\n"),
    );
    expect(rows[0].provenFormats).toEqual([]);
    expect(rows[1].provenFormats).toEqual(["static", "web"]);
  });

  // Round four, finding 24. Both halves of every sheet reach the exchange now: the survey used to
  // carry the purpose sentence alone, so nothing anywhere could say a type refuses this table.
  it("should carry every sheet's own refusal sentence and its stated limits", () => {
    const rows = typeSurvey();
    for (const row of rows) {
      expect(row.refusal.length).toBeGreaterThan(20);
    }
    const scatter = rows.find((r) => r.type === "Scatter (and bubble)")!;
    expect(scatter.refusal).toContain("fewer than about eight or ten points");
    expect(scatter.limits).toEqual([{ unit: "rows", op: "<", value: 8 }]);
    const lollipop = rows.find((r) => r.type === "Lollipop")!;
    expect(lollipop.sameIdeaAs).toBe("Bar and column");
    const pie = rows.find((r) => r.type === "Pie and donut")!;
    expect(pie.limits).toEqual([{ unit: "slices", op: ">", value: 5 }]);
  });
});

describe("medium, then format, then size — each verified before it is offered", () => {
  it("should mark a medium closed by the environment, at the medium question, with what would open it", () => {
    const map = proposeMediums({ capabilities: mapClosed }).find(
      (m) => m.medium === "map",
    );
    expect(map?.reachable).toBe(false);
    expect(map?.why).toContain("MAPTILER_KEY is not set");
    // and the chart medium is untouched by a map key nobody asked for
    expect(
      proposeMediums({ capabilities: mapClosed }).find(
        (m) => m.medium === "chart",
      )?.reachable,
    ).toBe(true);
  });

  it("should offer scrolly for every medium that has a producer for it", () => {
    for (const medium of ["chart", "map", "image"]) {
      const scrolly = proposeFormats({ medium }).find(
        (g) => g.format === "scrolly",
      );
      expect(scrolly?.reachable).toBe(true);
      expect(scrolly?.producer).toBe("scrolly");
    }
  });

  // An absent pair is NAMED as absent at the format gate rather than quietly omitted — that is the
  // whole reason the catalog is keyed on the pair.
  it("should name the formats a medium cannot reach, not omit them", () => {
    const formats = proposeFormats({ medium: "image" });
    expect(formats.map((g) => g.format).sort()).toEqual([
      "scrolly",
      "static",
      "video",
      "web",
    ]);
    const video = formats.find((g) => g.format === "video");
    expect(video?.reachable).toBe(false);
    expect(video?.why).toContain("for image it can reach static, scrolly");
  });

  it("should close every format of a medium the environment has shut, with the same reason", () => {
    for (const format of proposeFormats({
      medium: "map",
      capabilities: mapClosed,
    })) {
      expect(format.reachable).toBe(false);
      expect(format.why).toContain("MAPTILER_KEY is not set");
    }
  });

  it("should offer three sizes for a static or a video, and none for a page that fills its container", () => {
    expect(proposeSizes("static")).toEqual(["landscape", "square", "portrait"]);
    expect(proposeSizes("video")).toEqual(["landscape", "square", "portrait"]);
    expect(proposeSizes("web")).toEqual([]);
    expect(proposeSizes("scrolly")).toEqual([]);
  });
});

describe("confirmFormatReachable — the recorded verdict, computed", () => {
  it("should hand back the exact string the slot records, for a pair that is genuinely wired", () => {
    expect(confirmFormatReachable({ medium: "chart", format: "scrolly" })).toBe(
      "yes",
    );
    expect(confirmFormatReachable({ medium: "map", format: "web" })).toBe(
      "yes",
    );
    expect(confirmFormatReachable({ medium: "image", format: "static" })).toBe(
      "yes",
    );
  });

  it("should refuse a pair with no producer, naming what that medium can reach", () => {
    expect(() =>
      confirmFormatReachable({ medium: "image", format: "video" }),
    ).toThrow(/for image it can reach static, scrolly/);
  });

  it("should refuse a pair the environment has closed, naming the key", () => {
    expect(() =>
      confirmFormatReachable({
        medium: "map",
        format: "static",
        capabilities: mapClosed,
      }),
    ).toThrow(/MAPTILER_KEY is not set/);
  });
});

describe("the candidates are genuinely different ways of seeing it", () => {
  // The run offered three candidates and all three were stacked-or-grouped bars of the same three
  // numbers: a menu of one idea, presented as a choice.
  it("should refuse a candidate set that is one idea wearing three labels", () => {
    expect(() =>
      assertDistinctWays([
        { type: "Bar and column" },
        { type: "bar and column" },
        { type: "Bar and column" },
      ]),
    ).toThrow(/1 way\(s\) of seeing this data, not 3/);
  });

  it("should accept two genuinely different types, because two honest ways beat three fake ones", () => {
    expect(
      assertDistinctWays([
        { type: "Stacked bar" },
        { type: "Waterfall (bridge)" },
      ]),
    ).toBe(true);
  });

  it("should refuse a candidate that does not name its type at all", () => {
    expect(() =>
      assertDistinctWays([
        { why: "it looks nice" },
        { type: "Bar and column" },
      ]),
    ).toThrow(/must name the type/);
  });

  it("should render each candidate with the sheet's own purpose sentence, verbatim", () => {
    const text = formatCandidates({
      medium: "chart",
      candidates: [
        {
          type: "Stacked bar",
          format: "static",
          why: "the total and its parts in one mark",
        },
        {
          type: "Waterfall (bridge)",
          format: "static",
          why: "the losses read as steps to the total",
        },
      ],
    });
    const sheetSentence = typeSurvey().find(
      (r) => r.medium === "chart" && r.type === "Stacked bar",
    )!.purpose;
    expect(text).toContain(sheetSentence);
    expect(text).toContain("Why here: the total and its parts in one mark");
  });

  it("should refuse a candidate offered with no reason it would be interesting", () => {
    expect(() =>
      formatCandidates({
        medium: "chart",
        candidates: [
          {
            type: "Stacked bar",
            format: "static",
            why: "the total and its parts",
          },
          { type: "Waterfall (bridge)", format: "static", why: "  " },
        ],
      }),
    ).toThrow(/carries no reason/);
  });

  // The menu is RENDERED from the verdicts, so it physically cannot offer a pair the catalog
  // refuses — which is the difference between a proposal that promises reachability and one that
  // checks it.
  it("should refuse to render a menu offering a pair nothing can produce", () => {
    expect(() =>
      formatCandidates({
        medium: "image",
        candidates: [
          { type: "Locator", format: "video", why: "the route, animated" },
          { type: "Choropleth", format: "static", why: "the regions shaded" },
        ],
      }),
    ).toThrow(/not one this toolchain can produce or deliver yet/);
  });
});

// ---------------------------------------------------------------------------------------------
// ROUND FOUR (2026-08-21), finding 24 — A TREATMENT WAS NEVER CHECKED AGAINST ITS OWN SHEET.
//
// `stress-p-transport-ridership`'s slot 2 first closed on a SCATTER of six rows.
// `types/scatter.md` refuses that outright, in the sheet's own words, and had done all along:
// "If there are fewer than about eight or ten points, a scatter is an expensive way to draw what
// a labelled dot-strip or a small table would show just as well — a cloud needs enough members to
// have a shape." `checkStoryboard` returned `[]` and `whereIs` said `production`, because
// `formatCandidates` lifted each sheet's *What it is for* sentence and never read its *When NOT to
// use it*. Its neighbour: `assertDistinctWays` compared NAMES, so it accepted a bar and a lollipop
// as two ways of seeing one table, though `types/lollipop.md` calls itself "a bar, minus the fill".
// ---------------------------------------------------------------------------------------------

describe("a candidate is checked against its own sheet's refusal", () => {
  const sixRows = { rowCount: 6, columns: [] };

  it("should refuse a six-row scatter, in the sheet's own words", () => {
    expect(() =>
      formatCandidates({
        medium: "chart",
        profile: sixRows,
        candidates: [
          { type: "Scatter (and bubble)", format: "static", why: "population against trips" },
          { type: "Bar and column", format: "static", why: "trips per resident, ranked" },
        ],
      }),
    ).toThrow(/fewer than about eight or ten points/);
  });

  // The same six rows, measured off the frozen story the slot actually closed on.
  it("should refuse that scatter on the frozen story it was proposed for", () => {
    const profile = frozenProfile("stress-p-transport-ridership");
    expect(profile.rowCount).toBe(6);
    expect(() =>
      formatCandidates({
        medium: "chart",
        profile,
        candidates: [
          { type: "Scatter (and bubble)", format: "static", why: "population against trips" },
          { type: "Bar and column", format: "static", why: "trips per resident, ranked" },
        ],
      }),
    ).toThrow(/refuses 6 row\(s\)/);
  });

  it("should render every candidate with the sheet's own refusal beside its purpose", () => {
    const text = formatCandidates({
      medium: "chart",
      profile: { rowCount: 13, columns: [] },
      candidates: [
        { type: "Bar and column", format: "static", why: "schools per region, ranked" },
        { type: "Dot strip", format: "static", why: "the spread of the same thirteen" },
      ],
    });
    const sheet = typeSurvey().find(
      (r) => r.medium === "chart" && r.type === "Bar and column",
    )!;
    expect(text).toContain(sheet.refusal);
  });

  // A limit the frozen profile cannot answer is CARRIED, not silently enforced against a number
  // that does not mean what the sheet means: a profile counts rows, never slices.
  it("should hand a limit it cannot check to the journalist rather than guessing", () => {
    const text = formatCandidates({
      medium: "chart",
      profile: { rowCount: 13, columns: [] },
      candidates: [
        { type: "Pie and donut", format: "static", why: "the shares of one whole" },
        { type: "Bar and column", format: "static", why: "the same shares, ranked" },
      ],
    });
    expect(text).toContain("slices > 5");
    expect(text).toMatch(/check.*by hand/i);
  });

  // -------------------------------------------------------------------------------------------
  // ROUND SIX (2026-08-22), AB2 — THE SENTENCE THAT WOULD HAVE STOPPED THE WORST BEAT OF SIX
  // ROUNDS WAS THE ONE THE SURVEY DROPPED.
  //
  // `stress-ab-emigration-flows` is eight rows of origin -> destination pairs: six origins, five
  // destinations, many-to-many. It was built as a flow map on the web and came back with 29
  // defects, the highest count of any beat in six rounds. `flow-map.md` refuses exactly that
  // table — in its SECOND sentence, and the survey lifted only the first.
  // -------------------------------------------------------------------------------------------
  it("should carry flow-map's many-to-many refusal to the menu, on the frozen story it was chosen for", () => {
    const profile = frozenProfile("stress-ab-emigration-flows");
    const origins = profile.columns.find((c: any) => c.name === "origin");
    const destinations = profile.columns.find((c: any) => c.name === "destination");
    // Not a fixture: six origins and five destinations over eight rows is many-to-many.
    expect(origins.distinct).toBeGreaterThan(1);
    expect(destinations.distinct).toBeGreaterThan(1);
    const text = formatCandidates({
      medium: "map",
      profile,
      candidates: [
        { type: "Flow map (route)", format: "web", why: "where the people who left went" },
        { type: "Proportional symbol (symbol / bubble map)", format: "web", why: "how many left each district" },
      ],
    });
    expect(text).toContain("not a many-to-many flow");
    expect(text).toContain("OD flow diagram");
  });

  it("should refuse two labels for one idea, because the sheet says they are one idea", () => {
    expect(() =>
      assertDistinctWays([
        { type: "Bar and column" },
        { type: "Lollipop" },
        { type: "Treemap" },
      ]),
    ).toThrow(/Lollipop/);
  });

  it("should still accept three types that are genuinely three ideas", () => {
    expect(
      assertDistinctWays([
        { type: "Bar and column" },
        { type: "Dot strip" },
        { type: "Treemap" },
      ]),
    ).toBe(true);
  });
});

describe("advisory graphical ranking", () => {
  const baseModel = {
    schemaVersion: "splash-selection/v1",
    revisions: {
      story: "sha256:story",
      catalogue: "sha256:catalogue",
      capabilities: "sha256:capabilities",
    },
    evidence: {
      proves: "Adoption rose across five annual observations.",
      comparison: "2021 against 2025",
      placement: "after the third paragraph",
    },
  };
  const profile = {
    rowCount: 50,
    columns: [
      { name: "country", type: "text", distinct: 10 },
      { name: "year", type: "number", distinct: 5, min: 2021, max: 2025 },
      { name: "adoption_pct", type: "number", distinct: 30, min: 3, max: 64 },
    ],
  };

  it("ranks only reachable choices from confirmed fields and the frozen profile", () => {
    const result = recommendVisualChoice({
      profile,
      model: {
        ...baseModel,
        choices: [
          {
            id: "chart.line",
            kind: "treatment",
            enabled: true,
            dataShape: { requires: ["numeric-series", "ordered-axis"] },
          },
          {
            id: "chart.boxplot",
            kind: "treatment",
            enabled: true,
            dataShape: { requires: ["distribution"] },
          },
          {
            id: "chart.contour",
            kind: "treatment",
            enabled: false,
            proofOnly: true,
            dataShape: { requires: ["continuous-field"] },
          },
        ],
      },
    });
    expect(result.recommendedOptionId).toBe("chart.line");
    expect(result.ranking.map((row) => row.optionId)).toEqual([
      "chart.line",
      "chart.boxplot",
    ]);
    expect(result.ranking[0].matchedEvidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: "source/profile.json" }),
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("proofFormats");
  });

  it("makes ties explicit and changes the advisory revision when frozen evidence changes", () => {
    const model = {
      ...baseModel,
      choices: [
        {
          id: "chart.bar",
          kind: "treatment",
          enabled: true,
          dataShape: { requires: ["categorical", "numeric-value"] },
        },
        {
          id: "chart.dot",
          kind: "treatment",
          enabled: true,
          dataShape: { requires: ["categorical", "numeric-value"] },
        },
      ],
    };
    const first = recommendVisualChoice({ model, profile });
    const repeated = recommendVisualChoice({ model, profile });
    expect(first).toEqual(repeated);
    expect(first.tied).toBe(true);
    expect(first.recommendedOptionId).toBe("chart.bar");
    expect(first.ranking[0].tradeoffs.join(" ")).toContain(
      "stable catalogue order",
    );

    const changed = recommendVisualChoice({
      model,
      profile: { ...profile, rowCount: 51 },
    });
    expect(changed.profileRevision).not.toBe(first.profileRevision);
    expect(changed.revision).not.toBe(first.revision);
  });
});

// ---------------------------------------------------------------------------------------------
// ROUND FOUR (2026-08-21), findings 22 and 23 — THE RECOMMENDER READ A COLUMN'S TYPE AS EVIDENCE
// THAT A STORY EXISTS.
//
// Reproduced by the controller against `stress-s-unspent-fund`'s frozen profile — one row,
// `year=2026`, `fund=1`:
//
//   recommended: chart.streamgraph | tied: false
//      6 chart.streamgraph      | unresolved: 0
//      4 chart.area             | unresolved: 0
//
// Not a tie broken by catalogue order and not a "conservative fallback" — a confident top pick
// with NO unresolved requirement at all, on a table that supports no comparison whatsoever. Two
// causes, both closed below, both measured on frozen stories rather than on a fixture built to
// fail.
// ---------------------------------------------------------------------------------------------

const STORIES = join(import.meta.dirname, "..", "..", "..", "stories");

function frozenProfile(story: string) {
  return JSON.parse(
    readFileSync(join(STORIES, story, "source", "profile.json"), "utf8"),
  );
}

function everyTreatment() {
  const catalogue = JSON.parse(
    readFileSync(
      join(import.meta.dirname, "..", "references", "visual-catalog.json"),
      "utf8",
    ),
  );
  return {
    schemaVersion: "splash-selection/v1",
    revisions: {
      story: "sha256:story",
      catalogue: catalogue.catalogRevision,
      capabilities: "sha256:capabilities",
    },
    evidence: {},
    choices: catalogue.treatments.map((treatment: any) => ({
      id: treatment.id,
      kind: "treatment",
      enabled: treatment.state === "selectable",
      dataShape: treatment.dataShape,
    })),
  };
}

describe("row count is evidence, and a column type is not a story", () => {
  it("should recommend nothing for a one-row table, and say why", () => {
    const result = recommendVisualChoice({
      model: everyTreatment(),
      profile: frozenProfile("stress-s-unspent-fund"),
    });
    expect(result.recommendedOptionId).toBeNull();
    expect(result.refusal).toMatch(/one row|1 row/i);
    expect(result.ranking.every((row) => row.unresolvedRequirements.length > 0)).toBe(true);
  });

  it("should refuse to call a single moment an ordered axis", () => {
    const oneMoment = {
      rowCount: 1,
      columns: [
        { name: "year", type: "number", distinct: 1, min: 2026, max: 2026 },
        { name: "fund", type: "number", distinct: 1, min: 1, max: 1 },
      ],
    };
    const result = recommendVisualChoice({
      profile: oneMoment,
      model: {
        ...everyTreatment(),
        choices: [
          {
            id: "chart.line",
            kind: "treatment",
            enabled: true,
            dataShape: { requires: ["ordered-axis"] },
          },
        ],
      },
    });
    expect(result.ranking[0].unresolvedRequirements).toContain("ordered-axis");
  });

  // Finding 23. `ground-claim.mjs` has always excluded the year column from the measures — a
  // table's own x axis is not one of the things it measures. `requirementFinding` counted it in
  // `facts.numeric` AND `facts.temporal`, so a plain (year, value) table claimed TWO measures and
  // satisfied `multiple-series` on the strength of its own x axis.
  it("should not count the year column as one of the measures", () => {
    const yearAndValue = {
      rowCount: 30,
      columns: [
        { name: "year", type: "number", distinct: 30, min: 1995, max: 2024 },
        { name: "forest_loss_ha", type: "number", distinct: 30, min: 10, max: 900 },
      ],
    };
    const result = recommendVisualChoice({
      profile: yearAndValue,
      model: {
        ...everyTreatment(),
        choices: [
          {
            id: "chart.streamgraph",
            kind: "treatment",
            enabled: true,
            dataShape: { requires: ["multiple-series"] },
          },
          {
            id: "chart.scatter",
            kind: "treatment",
            enabled: true,
            dataShape: { requires: ["numeric-pair"] },
          },
        ],
      },
    });
    expect(result.ranking[0].unresolvedRequirements).toContain("multiple-series");
    expect(result.ranking[1].unresolvedRequirements).toContain("numeric-pair");
    expect(result.recommendedOptionId).toBeNull();
  });

  // The corpus measurement the raw findings file recorded: NINE of the twenty-one frozen stories
  // carry a year column beside exactly one measure, and every one of them claimed two.
  it("should stop the nine year-column stories claiming two measures", () => {
    const stories = readdirSync(STORIES).filter((name) =>
      existsSync(join(STORIES, name, "source", "profile.json")),
    );
    expect(stories.length).toBeGreaterThan(20);
    const model = {
      ...everyTreatment(),
      choices: [
        {
          id: "chart.streamgraph",
          kind: "treatment",
          enabled: true,
          dataShape: { requires: ["multiple-series"] },
        },
      ],
    };
    const claiming = stories.filter((story) => {
      const profile = frozenProfile(story);
      const numbers = (profile.columns ?? []).filter((c: any) => c.type === "number");
      const years = numbers.filter((c: any) => /year|date|ann[ée]e/i.test(c.name));
      if (years.length !== 1 || numbers.length !== 2) return false;
      const result = recommendVisualChoice({ model, profile });
      return result.ranking[0].unresolvedRequirements.length === 0;
    });
    expect(claiming).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------
// ROUND SIX (2026-08-22), Z1 — A REQUIREMENT THAT CANNOT FIRE IS WORSE THAN A MISSING ONE,
// BECAUSE IT READS AS COVERED.
//
//     "part-to-whole": [measures.length >= 2 && nonnegative, "two or more non-negative measures"]
//
// Two or more numeric COLUMNS. A part-to-whole table is long-form by nature — one category column,
// one value column — so the canonical shape carries ONE measure and the requirement failed by
// construction. Five treatments depend on it (Diverging stacked bar, Marimekko, Pie and donut,
// Stacked bar, Treemap) and in six rounds and twenty-seven stories not one of them was ever
// chosen. That absence read as taste. It was arithmetic.
//
// The second half is the half that must survive the widening: `stress-z-budget-parts` carries a
// NEGATIVE part (-9.7, a provision write-back the French nomenclature allows) and so does
// `stress-e-electricity-mix` (-4.1, net imports). A pie cannot draw either, and the refusal has to
// SAY so — "part-to-whole" printed in a list of unmet requirement names is a name, not a reason.
// ---------------------------------------------------------------------------------------------
describe("a part-to-whole table can reach a part-to-whole treatment", () => {
  const partToWholeTreatments = [
    "chart.diverging-stacked-bar",
    "chart.marimekko",
    "chart.pie-and-donut",
    "chart.stacked-bar",
    "chart.treemap",
  ];

  function rowFor(result: any, optionId: string) {
    return result.ranking.find((row: any) => row.optionId === optionId)!;
  }

  it("should satisfy part-to-whole on the long form the shape is actually written in", () => {
    // Seven countries, one non-negative measure, hectares of forest lost. The canonical long-form
    // part-to-whole, and until now the shape that could never satisfy the requirement named after it.
    const profile = frozenProfile("stress-m-forest-loss");
    const result = recommendVisualChoice({ model: everyTreatment(), profile });
    const pie = rowFor(result, "chart.pie-and-donut");
    expect(pie.unresolvedRequirements).not.toContain("part-to-whole");
    expect(JSON.stringify(pie.matchedEvidence)).toContain("part to whole");
  });

  it("should refuse a table with a negative part, and say that is why", () => {
    for (const story of ["stress-z-budget-parts", "stress-e-electricity-mix"]) {
      const profile = frozenProfile(story);
      const negative = profile.columns.filter(
        (column: any) => column.type === "number" && column.min < 0,
      );
      expect(negative.length).toBeGreaterThan(0);
      const result = recommendVisualChoice({ model: everyTreatment(), profile });
      for (const id of partToWholeTreatments) {
        const row = rowFor(result, id);
        expect(row.unresolvedRequirements).toContain("part-to-whole");
        // The reason, in words, not the requirement's name: which column, which value, and what a
        // slice cannot do with it.
        const why = row.unresolvedReasons.join(" ");
        expect(why).toContain(negative[0].name);
        expect(why).toContain(String(negative[0].min));
        expect(why).toMatch(/negative/i);
      }
    }
  });

  it("should not read a table of repeated observations as a table of parts", () => {
    // Ten countries over five years: 50 rows, and "country" names each of them five times. A
    // category that repeats is a table of observations, not of parts, and a share drawn from it
    // would be a share of one country counted five times.
    const profile = frozenProfile("heat-pump-adoption-across-europe");
    expect(profile.rowCount).toBe(50);
    expect(profile.columns.find((c: any) => c.name === "country").distinct).toBe(10);
    const result = recommendVisualChoice({ model: everyTreatment(), profile });
    const pie = rowFor(result, "chart.pie-and-donut");
    expect(pie.unresolvedRequirements).toContain("part-to-whole");
    expect(pie.unresolvedReasons.join(" ")).toMatch(/names each row exactly once|one row per part/);
  });

  it("should stop reporting zero part-to-whole tables across the whole corpus", () => {
    const stories = readdirSync(STORIES).filter((name) =>
      existsSync(join(STORIES, name, "source", "profile.json")),
    );
    expect(stories.length).toBeGreaterThan(27);
    const reaching = stories.filter((story) => {
      const result = recommendVisualChoice({
        model: everyTreatment(),
        profile: frozenProfile(story),
      });
      return partToWholeTreatments.some(
        (id) => !rowFor(result, id).unresolvedRequirements.includes("part-to-whole"),
      );
    });
    // Measured before this fix: zero. A requirement no table in the corpus can satisfy is a
    // requirement nobody can see failing.
    expect(reaching.length).toBeGreaterThan(0);
    expect(reaching).toContain("stress-m-forest-loss");
    // And the two tables with a negative part are NOT among them.
    expect(reaching).not.toContain("stress-z-budget-parts");
    expect(reaching).not.toContain("stress-e-electricity-mix");
  });
});

// ---------------------------------------------------------------------------------------------
// ROUND SIX (2026-08-22), AA2 — THE ONLY TWO REQUIREMENTS THAT CONSULT A COUNT READ THE WRONG ONE,
// AT A FLOOR OF FIVE.
//
// `stress-aa-salary-spread` is the first table in six rounds with a real distribution in it: 240
// rows, 234 salaries, 6 blank. `raw-observations` and `distribution` both read `rowCount` — 240,
// including the six rows that carry no salary at all — and both were satisfied at five. Five
// readings are not a distribution; `boxplot.md` says so on disk, in the sentence about "five points
// wearing a distribution's costume".
// ---------------------------------------------------------------------------------------------
describe("a distribution is a count of observations, and five of them is not one", () => {
  it("should let the first real distribution in the corpus reach a distribution type", () => {
    const profile = frozenProfile("stress-aa-salary-spread");
    const salary = profile.columns.find((c: any) => c.name === "annual_salary_eur");
    expect(profile.rowCount).toBe(240);
    expect(salary.missing).toBe(6);
    const result = recommendVisualChoice({ model: everyTreatment(), profile });
    const histogram = result.ranking.find((row: any) => row.optionId === "chart.histogram")!;
    expect(histogram.unresolvedRequirements).toEqual([]);
    // The count it reports is the observations, not the rows: 234, not 240.
    expect(JSON.stringify(histogram.matchedEvidence)).toContain("234");
  });

  it("should refuse to call five readings a distribution", () => {
    const fiveReadings = {
      rowCount: 5,
      columns: [
        { name: "district", type: "text", distinct: 5, missing: 0 },
        { name: "rent_eur", type: "number", distinct: 5, missing: 0, min: 700, max: 1900 },
      ],
    };
    const result = recommendVisualChoice({
      model: everyTreatment(),
      profile: fiveReadings,
    });
    const boxplot = result.ranking.find((row: any) => row.optionId === "chart.boxplot")!;
    expect(boxplot.unresolvedRequirements).toContain("distribution");
    expect(boxplot.unresolvedReasons.join(" ")).toMatch(/5 observation/);
  });

  it("should count a measure's blanks out of its observations", () => {
    const mostlyBlank = {
      rowCount: 240,
      columns: [
        { name: "employee", type: "text", distinct: 240, missing: 0 },
        { name: "salary_eur", type: "number", distinct: 7, missing: 233, min: 20000, max: 90000 },
      ],
    };
    const result = recommendVisualChoice({
      model: everyTreatment(),
      profile: mostlyBlank,
    });
    const histogram = result.ranking.find((row: any) => row.optionId === "chart.histogram")!;
    // 240 rows, 7 readings. The rows are not the evidence; the readings are.
    expect(histogram.unresolvedRequirements).toContain("distribution");
    expect(histogram.unresolvedReasons.join(" ")).toMatch(/7 observation/);
  });
});

// ROUND FIVE. `detail` counted the claims the check could not place and never said WHY it could
// not place them, so every refusal reached the journalist as one number. The reasons carry the
// column names, the ranges and the profiler's own refusals now, which is the half of the answer
// that tells a journalist what to do next.
describe("resolveGrounding — an unplaced claim says why, not just that it was unplaced", () => {
  it("should name the reason a claim could not be placed, not only how many were not", () => {
    const resolved = resolveGrounding("Le glacier a perdu 120 km2 de surface", {
      columns: [{ name: "surface", type: "number", min: 40, max: 90, sum: 500 }],
    });
    expect(resolved.verdict).toBe("unverifiable");
    expect(resolved.detail).toContain("nothing was confirmed and nothing was refuted");
    // The column it was put to, and the range it missed — not just "1 could not be placed".
    expect(resolved.detail).toContain("surface");
    expect(resolved.detail).toContain("[40, 90]");
  });
});
