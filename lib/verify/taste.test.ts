import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DENSITY_MARKS_PER_100PX,
  MAP_NATIVE_TITLE_PREFIX,
  MAP_NATIVE_TITLE_PREFIXES,
  MIN_COLOUR_SEPARATION,
  TAKEAWAY_COVERAGE_FLOOR,
  TAKEAWAY_OVERLAP_FLOOR,
  WHITESPACE_FILL_FLOOR,
  detectTasteRisks,
  juxtaposeTitleAndTakeaway,
} from "./taste";
import { runReview } from "./review";
import type { CaptureRecord } from "./types";

function captureRecord(over: Partial<CaptureRecord> = {}): CaptureRecord {
  return {
    breakpoint: "primary",
    path: "/run/review-primary.png",
    sha256: "c".repeat(64),
    cssViewport: { width: 1200, height: 675 },
    deviceScaleFactor: 2,
    rootBox: { x: 24, y: 24, width: 1152, height: 557 },
    rootSelector: "#root > div",
    documentScroll: { width: 1200, height: 605 },
    artifactSha256: "d".repeat(64),
    artifactPath: "/run/interactive.html",
    destinationId: "channel:article-web",
    channel: "article-web",
    format: "interactive",
    capturedAt: "2026-07-26T10:00:00.000Z",
    marks: 18,
    markColours: ["#1b7f79", "#d95f02"],
    ...over,
  };
}

const TAKEAWAY = "Health premiums rose in every canton shown";

describe("the taste lane names a RISK — it never grades", () => {
  it("has no field a verdict could be written into", () => {
    const [signal] = detectTasteRisks({
      captures: [captureRecord({ marks: 4000 })],
      confirmedTakeaway: TAKEAWAY,
      renderedTitle: TAKEAWAY,
    });
    expect(signal).toBeDefined();
    expect(Object.keys(signal!).sort()).toStrictEqual([
      "detector",
      "dimension",
      "evidence",
      "routedTo",
    ]);
    expect(signal!.routedTo).toBe("human-signoff");
  });

  it("stays quiet on a comfortable, on-message chart", () => {
    expect(
      detectTasteRisks({
        captures: [captureRecord()],
        confirmedTakeaway: TAKEAWAY,
        renderedTitle: TAKEAWAY,
      }),
    ).toStrictEqual([]);
  });
});

describe("density", () => {
  it("flags a chart carrying more marks than its width can carry", () => {
    const perWidth = Math.ceil((1152 / 100) * DENSITY_MARKS_PER_100PX + 1);
    const risks = detectTasteRisks({
      captures: [captureRecord({ marks: perWidth })],
      confirmedTakeaway: TAKEAWAY,
      renderedTitle: TAKEAWAY,
    });
    const d = risks.find((r) => r.dimension === "density");
    expect(d).toBeDefined();
    expect(d!.evidence.join(" ")).toContain(String(perWidth));
  });

  it("judges density against the NARROW breakpoint too, not only the roomy one", () => {
    const risks = detectTasteRisks({
      captures: [
        captureRecord({
          breakpoint: "narrow",
          rootBox: { x: 24, y: 24, width: 312, height: 584 },
          marks: 60,
        }),
      ],
      confirmedTakeaway: TAKEAWAY,
      renderedTitle: TAKEAWAY,
    });
    expect(risks.some((r) => r.dimension === "density")).toBe(true);
  });
});

describe("palette adjacency", () => {
  it("flags two categorical colours a reader may not be able to tell apart", () => {
    const risks = detectTasteRisks({
      captures: [captureRecord({ markColours: ["#1b7f79", "#1d8a80"] })],
      confirmedTakeaway: TAKEAWAY,
      renderedTitle: TAKEAWAY,
    });
    const p = risks.find((r) => r.dimension === "palette-adjacency");
    expect(p).toBeDefined();
    expect(p!.evidence.join(" ")).toContain("#1b7f79");
    expect(MIN_COLOUR_SEPARATION).toBeGreaterThan(0);
  });

  it("says nothing about a well-separated pair", () => {
    const risks = detectTasteRisks({
      captures: [captureRecord({ markColours: ["#1b7f79", "#d95f02"] })],
      confirmedTakeaway: TAKEAWAY,
      renderedTitle: TAKEAWAY,
    });
    expect(risks.some((r) => r.dimension === "palette-adjacency")).toBe(false);
  });
});

describe("title vs confirmed takeaway", () => {
  it("flags a title that shares almost nothing with what the journalist confirmed", () => {
    const risks = detectTasteRisks({
      captures: [captureRecord()],
      confirmedTakeaway: TAKEAWAY,
      renderedTitle: "Swiss cantons compared",
    });
    const t = risks.find((r) => r.dimension === "title-takeaway-divergence");
    expect(t).toBeDefined();
    expect(t!.evidence.join(" ")).toContain("Swiss cantons compared");
    expect(TAKEAWAY_OVERLAP_FLOOR).toBeGreaterThan(0);
  });

  it("says nothing when no title was rendered — that is a furniture question, not taste", () => {
    const risks = detectTasteRisks({
      captures: [captureRecord()],
      confirmedTakeaway: TAKEAWAY,
    });
    expect(risks.some((r) => r.dimension === "title-takeaway-divergence")).toBe(
      false,
    );
  });
});

// The bench the floor is calibrated on. Every pair is a REAL string from this repo's own
// fixtures or from a real run — the contradictory French pair is the one commit 4b07c1d
// records ("Genève paie la prime la plus lourde" beside "Fribourg est le moins cher": one
// story, two editorial points, and nothing refusing it at the time).
//
// Three families, because the detector has to survive all three: the loop's own wiring (the
// title IS the takeaway, verbatim), a real divergence, and a legitimate editorial rewrite of
// the SAME point. A detector that cannot tell the third from the second is noise.
const CALIBRATION: {
  label: string;
  takeaway: string;
  title: string;
  fires: boolean;
}[] = [
  // --- what produce.ts:168 actually renders today: the takeaway, verbatim ----------------
  {
    label: "verbatim fr",
    takeaway: "Genève paie la prime la plus lourde des cantons romands",
    title: "Genève paie la prime la plus lourde des cantons romands",
    fires: false,
  },
  {
    label: "verbatim en",
    takeaway: "Health premiums rose in every canton shown",
    title: "Health premiums rose in every canton shown",
    fires: false,
  },
  {
    label: "verbatim de",
    takeaway: "Die über 55-Jährigen übersteigen 55 % der Fälle",
    title: "Die über 55-Jährigen übersteigen 55 % der Fälle",
    fires: false,
  },
  {
    label: "verbatim it",
    takeaway: "Gli over 55 superano il 55% dei casi",
    title: "Gli over 55 superano il 55% dei casi",
    fires: false,
  },
  // The accessible name map-native declares is PREFIXED ("Interactive map: <title>",
  // ChoroplethMap.tsx:485). Harmless by construction: the metric is the share of the
  // TAKEAWAY's words the title carries, so extra words on the title side dilute nothing.
  {
    label: "engine prefix",
    takeaway: "Les primes ont augmenté dans les six cantons",
    title: "Interactive map: Les primes ont augmenté dans les six cantons",
    fires: false,
  },
  // --- real divergences ------------------------------------------------------------------
  {
    label: "the 4b07c1d pair — one story, two takeaways",
    takeaway: "Fribourg est le canton romand le moins cher",
    title: "Genève paie la prime la plus lourde",
    fires: true,
  },
  {
    // English-only stopwords score this 0.33 and stay QUIET: "der/die/das/über/mehr" count as
    // content words and inflate the overlap. This is the case that justifies the fr/de/it
    // function words — a newsroom publishing in German would never have seen the lane fire.
    label: "divergence de",
    takeaway: "Der Anteil erreicht 70 %",
    title: "Die über 55-Jährigen übersteigen 55 % der Fälle",
    fires: true,
  },
  {
    label: "divergence it",
    takeaway: "La quota raggiunge il 70%",
    title: "Gli over 55 superano il 55% dei casi",
    fires: true,
  },
  {
    label: "divergence fr — a section headline instead of the point",
    takeaway: "Les primes ont augmenté dans les six cantons",
    title: "Le coût de la santé en Suisse romande",
    fires: true,
  },
  {
    // DELIBERATELY not caught, and recorded here rather than hidden: same subject nouns
    // (packaging, recycling), inverted claim. It scores 0.33. Raising the floor to 0.5 to
    // catch it would fire on the German rewrite below, which also scores 0.33 — and a lane
    // that fires on legitimate rewrites is one people learn to click past (the gridline-tint
    // lesson, capture.ts:235-240). A token metric does not see an inverted claim; recall is
    // traded for silence on purpose.
    label: "divergence en, NOT caught — shared subject, inverted claim",
    takeaway: "Malta lags far behind on packaging recycling",
    title: "Estonia leads packaging recycling in Europe",
    fires: false,
  },
  // --- legitimate editorial rewrites of the same point -----------------------------------
  {
    label: "rewrite fr",
    takeaway: "Les primes ont augmenté dans les six cantons",
    title: "Les primes augmentent dans les six cantons",
    fires: false,
  },
  {
    label: "rewrite fr, shorter",
    takeaway: "L'écart entre cantons se creuse entre 2019 et 2024",
    title: "L'écart se creuse entre 2019 et 2024",
    fires: false,
  },
  {
    label: "rewrite en",
    takeaway: "Housing costs rose fastest in Annemasse.",
    title: "Housing costs rose fastest in Annemasse",
    fires: false,
  },
  {
    label: "rewrite de",
    takeaway: "Die über 55-Jährigen übersteigen 55 % der Fälle",
    title: "Über 55-Jährige: mehr als 55 % der Fälle",
    fires: false,
  },
];

describe("title/takeaway calibration, on real strings", () => {
  for (const c of CALIBRATION)
    it(`${c.fires ? "fires" : "stays quiet"}: ${c.label}`, () => {
      const risks = detectTasteRisks({
        captures: [captureRecord()],
        confirmedTakeaway: c.takeaway,
        renderedTitle: c.title,
      });
      expect(
        risks.some((r) => r.dimension === "title-takeaway-divergence"),
      ).toBe(c.fires);
    });
});

// D16 (spec §4.2): SIGNAL, never block — a title carrying only PART of the confirmed takeaway,
// or ADDING a claim nobody confirmed, is a decision for the journalist, shown side by side with
// no score (a percentage invites a fight about the metric instead of a look at the title).
describe("title coverage and overrun — D16, the confirmed takeaway is only PART of the title", () => {
  it("sees a title that carries half the confirmed takeaway", () => {
    // Measured (fix-scatter-snake-headers, frontaliers-dots, …): half the takeaway. Overlap is
    // WELL above the 0.3 divergence floor, so the existing detector says nothing.
    const signals = detectTasteRisks({
      captures: [],
      confirmedTakeaway:
        "Rents rose fastest in Geneva while wages stagnated across the whole canton",
      renderedTitle: "Rents rose fastest in Geneva",
    });
    expect(signals.map((s) => s.dimension)).toContain("title-partial-coverage");
    expect(TAKEAWAY_COVERAGE_FLOOR).toBeGreaterThan(TAKEAWAY_OVERLAP_FLOOR);
  });

  it("sees a title that says MORE than was confirmed", () => {
    // Measured (cloudflare-embed-scrolly): "9 biennial years" became "decade after decade" —
    // words ADDED, none removed. Overlap-based detection is structurally blind to this.
    const signals = detectTasteRisks({
      captures: [],
      confirmedTakeaway: "Nine biennial years of measurements",
      renderedTitle:
        "Nine biennial years of measurements, decade after decade of decline",
    });
    expect(signals.map((s) => s.dimension)).toContain("title-overrun");
  });

  it("does not fire title-overrun on map-native's own accessible-name prefix", () => {
    // Controller ruling (task 16, round 1): the reviewer reproduced this exact input firing
    // title-overrun on the pre-existing "engine prefix" calibration case above (same pair) —
    // "Interactive map: " is furniture five map-native components hand-copy
    // (ChoroplethMap.tsx:486, CartogramMap.tsx:353, RouteMap.tsx:516, HexGridMap.tsx:368,
    // DotDensityMap.tsx:420), never journalist content, and firing on it would train the
    // journalist to ignore the line on nearly every map-native approve. The fixture element
    // carrying the (would-be) failure is the "Interactive map: " prefix itself: strip it and
    // the title carries the takeaway exactly, nothing added.
    const signals = detectTasteRisks({
      captures: [],
      confirmedTakeaway: "Les primes ont augmenté dans les six cantons",
      renderedTitle:
        "Interactive map: Les primes ont augmenté dans les six cantons",
    });
    expect(signals.map((s) => s.dimension)).not.toContain("title-overrun");
  });

  it("does not fire it on the FRENCH accessible-name prefix either", () => {
    // The fixture above is a French takeaway under the ENGLISH prefix — which is what the
    // engine really shipped until 2026-08-08, and precisely the leak closed that day
    // (aria-label="Map: <French title>" on a built French page). Now that the prefix is
    // localized, the exemption has to know all four spellings or the fix would have handed
    // every French, German and Italian map a title-overrun signal: "carte"/"interactive" are
    // content words the confirmed takeaway does not contain. The fixture element carrying the
    // would-be failure is the French prefix itself.
    const signals = detectTasteRisks({
      captures: [],
      confirmedTakeaway: "Les primes ont augmenté dans les six cantons",
      renderedTitle:
        "Carte interactive : Les primes ont augmenté dans les six cantons",
    });
    expect(signals.map((s) => s.dimension)).not.toContain("title-overrun");
  });

  it("MAP_NATIVE_TITLE_PREFIXES still matches every production site that renders one", () => {
    // The exemption above is only correct while the constants equal what the engine actually
    // renders. Until 2026-08-08 the prefix was an English literal hand-copied into five
    // components, and this guard READ those sources to hold the sixth copy (here) against
    // them. The components now call `storyCopy(config.lang).mapAria(config.title)` — the same
    // table this file derives from — so the guard's job changed: it no longer checks that six
    // transcriptions agree, it checks that every component still goes THROUGH the table. Write
    // the prefix by hand again in any of them and this reddens, instead of silently
    // re-enabling the title-overrun false positive the exemption exists to prevent.
    const components = [
      "ChoroplethMap.tsx",
      "CartogramMap.tsx",
      "RouteMap.tsx",
      "HexGridMap.tsx",
      "DotDensityMap.tsx",
      "SymbolMap.tsx",
      "LocatorMap.tsx",
    ];
    const srcDir = join(
      import.meta.dir,
      "..",
      "..",
      "skills",
      "map-native",
      "src",
    );
    for (const file of components) {
      const src = readFileSync(join(srcDir, file), "utf8");
      expect(src).toContain("storyCopy(config.lang).mapAria(config.title)");
      // …and NOT the literal it replaced, in any language.
      for (const prefix of MAP_NATIVE_TITLE_PREFIXES)
        expect(src).not.toContain(`\`${prefix}\${config.title}\``);
    }
    // The count is pinned too: an EIGHTH interactive map component that prepends its own
    // accessible name must be added to this list rather than going unguarded.
    expect(components).toHaveLength(7);
    // And every language the table covers is exempted, not just English — a French page's
    // aria name would otherwise read as four added content words.
    expect(MAP_NATIVE_TITLE_PREFIXES).toHaveLength(4);
    expect(MAP_NATIVE_TITLE_PREFIXES[0]).toBe("Interactive map: ");
    expect(MAP_NATIVE_TITLE_PREFIXES).toContain("Carte interactive : ");
  });

  it("still fires title-overrun when a real addition follows the engine prefix", () => {
    // The exemption above must stay narrow: it strips a literal LEADING match, never a
    // mid-string word. The fixture element carrying the failure is ", decade after decade" —
    // appended AFTER the confirmed takeaway, itself appended after the "Interactive map: "
    // prefix — proving the strip does not swallow a genuine addition placed past it.
    const signals = detectTasteRisks({
      captures: [],
      confirmedTakeaway: "Rents rose fastest in Geneva while wages stagnated",
      renderedTitle:
        "Interactive map: Rents rose fastest in Geneva while wages stagnated, decade after decade",
    });
    expect(signals.map((s) => s.dimension)).toContain("title-overrun");
  });

  it("says nothing when the title is the takeaway", () => {
    const t = "Rents rose fastest in Geneva";
    expect(
      detectTasteRisks({
        captures: [],
        confirmedTakeaway: t,
        renderedTitle: t,
      }).map((s) => s.dimension),
    ).not.toContain("title-partial-coverage");
  });

  it("shows the two strings side by side, and no score", () => {
    const signals = detectTasteRisks({
      captures: [],
      confirmedTakeaway: "Rents rose fastest in Geneva while wages stagnated",
      renderedTitle: "Rents rose fastest in Geneva",
    });
    const lines = juxtaposeTitleAndTakeaway(signals);
    expect(lines.join("\n")).toContain(
      "Rents rose fastest in Geneva while wages stagnated",
    );
    expect(lines.join("\n")).toContain("Rents rose fastest in Geneva");
    expect(lines.join("\n")).not.toMatch(/\d+\s?%/);
  });

  it("is never handed a score-bearing dimension — the caller filters, juxtapose never grades", () => {
    // A signal from an unrelated dimension (e.g. density) must never leak into the juxtaposition:
    // the function's whole contract is "these two strings, nothing else".
    const lines = juxtaposeTitleAndTakeaway([
      {
        dimension: "density",
        detector: "marks per 100px > 8",
        evidence: ["[primary] 4000 marks across 1152px"],
        routedTo: "human-signoff",
      },
    ]);
    expect(lines).toStrictEqual([]);
  });
});

describe("whitespace", () => {
  it("flags a component that barely fills the container it publishes into", () => {
    const risks = detectTasteRisks({
      captures: [
        captureRecord({
          rootBox: { x: 24, y: 24, width: 200, height: 120 },
        }),
      ],
      confirmedTakeaway: TAKEAWAY,
      renderedTitle: TAKEAWAY,
    });
    const w = risks.find((r) => r.dimension === "whitespace");
    expect(w).toBeDefined();
    expect(WHITESPACE_FILL_FLOOR).toBeGreaterThan(0);
  });
});

describe("the lane reaches the review record, separated from the findings", () => {
  it("carries taste risks in their own field, and never as a blocking finding", async () => {
    const r = await runReview({
      source: {
        format: "interactive",
        channel: "article-web",
        confirmedTakeaway: TAKEAWAY,
        unit: "CHF",
        altText: "a description",
        sourceName: "the newsroom",
        evidenceExtracts: [],
        captures: [
          captureRecord({
            markColours: ["#1b7f79", "#1d8a80"],
            renderedTitle: "Swiss cantons compared",
          }),
        ],
        interactionResults: [],
        rubric: [],
      },
      checks: [],
      reviewedProvenanceHash: "prov-1",
      acceptedDestinationId: "channel:article-web",
    });
    expect(r.tasteRisk.length).toBeGreaterThan(0);
    expect(r.findings.every((f) => f.severity !== "blocking")).toBe(true);
    // The two lanes must not bleed: no finding may be minted from a taste dimension.
    for (const t of r.tasteRisk)
      expect(r.findings.some((f) => f.id === t.dimension)).toBe(false);
    expect(JSON.parse(JSON.stringify(r.tasteRisk))).toStrictEqual(r.tasteRisk);
  });

  it("fires the title detector from the CAPTURE alone — no caller supplies the title", async () => {
    // The gap this closes: `renderedTitle` was declared on three types and assigned by
    // nobody in production, so the divergence branch was structurally dead inside the loop.
    // The title now travels on the evidence line, which means the loop's existing
    // reviewStep — which already passes `captures: el.capture.images` — reaches it without
    // a line of lib/loop changing.
    const r = await runReview({
      source: {
        format: "interactive",
        channel: "article-web",
        confirmedTakeaway: TAKEAWAY,
        unit: "CHF",
        altText: "a description",
        sourceName: "the newsroom",
        evidenceExtracts: [],
        captures: [captureRecord({ renderedTitle: "Swiss cantons compared" })],
        interactionResults: [],
        rubric: [],
      },
      checks: [],
      reviewedProvenanceHash: "prov-1",
      acceptedDestinationId: "channel:article-web",
    });
    const t = r.tasteRisk.find(
      (x) => x.dimension === "title-takeaway-divergence",
    );
    expect(t).toBeDefined();
    // The evidence names BOTH strings, so the editor reading the sign-off document can see
    // what was painted next to what they confirmed — the whole point of routing it to a
    // human instead of grading it.
    expect(t!.evidence.join(" ")).toContain("Swiss cantons compared");
    expect(t!.evidence.join(" ")).toContain(TAKEAWAY);
  });

  it("stays quiet when the capture shows the title IS the confirmed takeaway", async () => {
    const r = await runReview({
      source: {
        format: "interactive",
        channel: "article-web",
        confirmedTakeaway: TAKEAWAY,
        unit: "CHF",
        altText: "a description",
        sourceName: "the newsroom",
        evidenceExtracts: [],
        captures: [captureRecord({ renderedTitle: TAKEAWAY })],
        interactionResults: [],
        rubric: [],
      },
      checks: [],
      reviewedProvenanceHash: "prov-1",
      acceptedDestinationId: "channel:article-web",
    });
    expect(
      r.tasteRisk.some((x) => x.dimension === "title-takeaway-divergence"),
    ).toBe(false);
  });

  it("says nothing about the title of a static deliverable — a png has no text to read", async () => {
    const r = await runReview({
      source: {
        format: "static",
        channel: "article-web",
        confirmedTakeaway: TAKEAWAY,
        unit: "CHF",
        altText: "a description",
        sourceName: "the newsroom",
        evidenceExtracts: [],
        captures: [captureRecord({ titleSource: "static-image", marks: 0 })],
        interactionResults: [],
        rubric: [],
      },
      checks: [],
      reviewedProvenanceHash: "prov-1",
      acceptedDestinationId: "channel:article-web",
    });
    expect(
      r.tasteRisk.some((x) => x.dimension === "title-takeaway-divergence"),
    ).toBe(false);
  });
});
