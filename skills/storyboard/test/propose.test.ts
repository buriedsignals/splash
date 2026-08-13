import { describe, it, expect } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
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
    .map((f) => ({ file: f, text: code(readFileSync(join(scriptsDir, f), "utf8")) }));

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
      columns: [{ name: "surface", type: "number", min: 40, max: 90, sum: 500 }],
    });
    expect(resolved.verdict).toBe("unverifiable");
    expect(resolved.supported.length).toBe(0);
    expect(resolved.detail).toContain("nothing was confirmed and nothing was refuted");
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
      groundingScalar(refuted, { override: "the series was revised after publication" }),
    ).toBe('overridden — "the series was revised after publication"');
  });

  it("should pass a resolved verdict straight through", () => {
    expect(groundingScalar({ verdict: "supported", detail: "" })).toBe("supported");
    expect(groundingScalar({ verdict: "unverifiable", detail: "" })).toBe("unverifiable");
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
        "| type | what it is for | proven formats | sheet |",
        "|---|---|---|---|",
        "| **Beeswarm** | Every raw observation on one axis. | — none rendered here yet | `chart-beat/references/types/beeswarm.md` |",
        "| **Bar and column** | One value per category. | static, web | `chart-beat/references/types/bar-and-column.md` |",
      ].join("\n"),
    );
    expect(rows[0].provenFormats).toEqual([]);
    expect(rows[1].provenFormats).toEqual(["static", "web"]);
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
      proposeMediums({ capabilities: mapClosed }).find((m) => m.medium === "chart")
        ?.reachable,
    ).toBe(true);
  });

  it("should offer scrolly for every medium that has a producer for it", () => {
    for (const medium of ["chart", "map", "image"]) {
      const scrolly = proposeFormats({ medium }).find((g) => g.format === "scrolly");
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
    for (const format of proposeFormats({ medium: "map", capabilities: mapClosed })) {
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
    expect(confirmFormatReachable({ medium: "chart", format: "scrolly" })).toBe("yes");
    expect(confirmFormatReachable({ medium: "map", format: "web" })).toBe("yes");
    expect(confirmFormatReachable({ medium: "image", format: "static" })).toBe("yes");
  });

  it("should refuse a pair with no producer, naming what that medium can reach", () => {
    expect(() => confirmFormatReachable({ medium: "image", format: "video" })).toThrow(
      /for image it can reach static, scrolly/,
    );
  });

  it("should refuse a pair the environment has closed, naming the key", () => {
    expect(() =>
      confirmFormatReachable({ medium: "map", format: "static", capabilities: mapClosed }),
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
      assertDistinctWays([{ type: "Stacked bar" }, { type: "Waterfall (bridge)" }]),
    ).toBe(true);
  });

  it("should refuse a candidate that does not name its type at all", () => {
    expect(() => assertDistinctWays([{ why: "it looks nice" }, { type: "Bar and column" }])).toThrow(
      /must name the type/,
    );
  });

  it("should render each candidate with the sheet's own purpose sentence, verbatim", () => {
    const text = formatCandidates({
      medium: "chart",
      candidates: [
        { type: "Stacked bar", format: "static", why: "the total and its parts in one mark" },
        { type: "Waterfall (bridge)", format: "static", why: "the losses read as steps to the total" },
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
          { type: "Stacked bar", format: "static", why: "the total and its parts" },
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
