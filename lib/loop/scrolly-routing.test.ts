// EVERY SCROLLY FORM THE REAL KB CAN OFFER, WALKED. Not a fixture — `renderableSheets()` reads
// the shipped knowledge base (46 sheets today), so this file measures what a journalist could
// actually be shown rather than what a hand-written pairing says.
//
// Two whole-branch review findings live here, and they are ONE question asked twice: "is the
// form the offer promises the form the loop can build?"
//   · the offer promised a scrolly through engines whose track skills/scrolly does not host
//     (dw-chart's `d3-bars` slug composed a chart-native spec that threw at BUILD; map-dw's
//     choropleth silently became a MapLibre map the journalist never chose);
//   · and for the scrolly forms it does host, `nextActionsForElement` answered `draft-beats`
//     for tracks nothing can draft a plan for — forever, with no route back.
// A fixture-only test caught neither, which is why this one enumerates.
import { test, expect } from "bun:test";
import "../../skills/splash/src/register-producers";
import { renderableSheets } from "../brain/typology";
import { getProducer, producerForFormat } from "../core/registry";
import type { VisualFormat } from "../core/vocabulary";
import { isLoopBuildable, unbuildableEngineReason } from "./buildable";
import { canDraftBeats } from "../brain/beats";
import { nextActionsForElement, type RunManifest } from "./manifest";

/** The two filters lib/brain/eligibility.ts applies before a candidate reaches the offer
 *  UNMARKED: the effective producer must declare the format, and the loop must be able to
 *  compose its spec. Read here rather than through `eligible()` so the enumeration needs no
 *  facts, no channel and no readiness — the question is about the (engine, type, format)
 *  pairing alone. */
function offerableScrollyForms(): {
  id: string;
  engine: string;
  key: string;
  builder: string;
}[] {
  const out = [];
  for (const { sheet, engine, key } of renderableSheets()) {
    if (!sheet.formats.includes("scrolly")) continue;
    const builder = producerForFormat(engine, "scrolly");
    if (!getProducer(builder)?.formats.includes("scrolly")) continue;
    if (!isLoopBuildable(builder, key, "scrolly")) continue;
    out.push({ id: sheet.id, engine, key, builder });
  }
  return out;
}

// THE OFFER, ENUMERATED. Pinned as a list rather than as a property, because the defect was a
// row being PRESENT: a property test that says "every offered form is buildable" passes on a row
// the table wrongly admits. The five rows this list does not contain are the five the review
// measured (dw-chart's d3-bars / d3-lines / d3-scatter-plot, map-dw's choropleth / locator).
test("the scrolly forms the KB can offer are exactly the ones the two tracks host", () => {
  const shown = offerableScrollyForms()
    .map((f) => `${f.id} · ${f.engine}/${f.key} → ${f.builder}`)
    .sort();
  expect(shown).toEqual([
    "bar · chart-native/bar → scrolly",
    "cartogram · map-native/cartogram → scrolly",
    "choropleth · map-native/choropleth → scrolly",
    "dot-density · map-native/dot-density → scrolly",
    "hex-grid · map-native/hex-grid → scrolly",
    "image-scrolly · image-native/image-scrolly → image-native",
    "line · chart-native/line → scrolly",
    "locator · map-native/locator → scrolly",
    "proportional-symbol · map-native/symbol → scrolly",
  ]);
});

// SCATTER is the row this list deliberately does NOT hold, and it is not an oversight. The
// scrolly RENDERER hosts a scatter (skills/scrolly/src/scrolly-types.ts) and derives its walk,
// but chart-native accepts an AUTHORED beat plan for a line and a bar only — so a scatter scrolly
// would ship deriveChartStory's own captions under the journalist's byline, the exact defect the
// beats seam exists to remove. It is MARKED in the offer, with a sentence saying so, rather than
// offered clean and shipped with machine-written captions.
test("a scatter scrolly is marked, not offered — its captions could not be the journalist's", () => {
  expect(isLoopBuildable("scrolly", "scatter", "scrolly")).toBe(false);
  const why = unbuildableEngineReason("scrolly", "scatter", "scrolly");
  expect(why).toContain("under your byline");
  expect(why).not.toContain("nothing can build");
});

// A hosted Datawrapper form is not a scrolly, and the honest place to say so is the redirect
// that used to invent one. `producerForFormat` handing a dw-chart scrolly to skills/scrolly was
// what made the whole chain downstream reasonable-looking and wrong.
test("no Datawrapper engine is redirected into the scrolly host", () => {
  expect(producerForFormat("dw-chart", "scrolly")).toBe("dw-chart");
  expect(producerForFormat("map-dw", "scrolly")).toBe("map-dw");
  // …and neither declares the format itself, so eligibility drops the candidate rather than
  // offering a form nothing renders.
  expect(getProducer("dw-chart")!.formats.includes("scrolly")).toBe(false);
  expect(getProducer("map-dw")!.formats.includes("scrolly")).toBe(false);
});

function runWith(option: {
  id: string;
  nativeType: string;
  engine: string;
}): RunManifest {
  return {
    runId: "scrolly-routing",
    schemaVersion: 6,
    route: "article",
    channel: "article-web",
    input: { data: { path: "input/data-abc.csv", sha256: "a".repeat(64) } },
    orient: {
      profile: { columns: ["c", "v"], numericColumns: ["v"], rowCount: 3 },
      supportsPoint: true,
    },
    elements: [
      {
        id: "e1",
        angle: {
          confirmedTakeaway: "t",
          emphasis: "e",
          altInsight: "a",
          unit: "u",
        },
        proposal: {
          options: [{ ...option, format: "scrolly", why: "w" }],
          excluded: [],
          chosenId: option.id,
        },
      },
    ],
    events: [],
  };
}

// THE STRANDING. Measured before the fix: image-native/image-scrolly, map-native/choropleth and
// map-native/symbol all answered ["draft-beats"], and `draftBeats` refused every one of them —
// so the run answered the same impossible action forever, and `deadEndReason` never fired
// because it is only consulted on "choose-form" (driver.ts:244). The invariant is not "which
// action" but "an action a journalist can actually take".
test("no offerable scrolly form is routed to an action the loop cannot perform", () => {
  const routed = offerableScrollyForms().map((f) => {
    const run = runWith({ id: f.id, nativeType: f.key, engine: f.engine });
    const next = nextActionsForElement(run, run.elements[0]!);
    return `${f.engine}/${f.key} → ${next.join(",")}`;
  });
  // draft-beats EXACTLY where a plan can be drafted, produce everywhere else.
  const expected = offerableScrollyForms().map(
    (f) =>
      `${f.engine}/${f.key} → ${canDraftBeats(f.key) ? "draft-beats" : "produce"}`,
  );
  expect(routed.sort()).toEqual(expected.sort());
  // …and the two halves are both non-empty, or the assertion above would hold vacuously.
  const drafted = offerableScrollyForms().filter((f) => canDraftBeats(f.key));
  expect(drafted.map((f) => f.key).sort()).toEqual([
    "bar",
    "image-scrolly",
    "line",
  ]);
  expect(offerableScrollyForms().length).toBeGreaterThan(drafted.length);
});

// THE TABLE'S OWN ANSWER, not just the offer's. Narrowing the redirect stopped the OFFER carrying
// a Datawrapper scrolly, but `isLoopBuildable("dw-chart", "d3-bars", "scrolly")` still answered
// TRUE afterwards — dw-chart's `supports` is a type list and knows nothing about formats. No
// journalist saw it (eligibility drops the candidate on the producer-format filter), and that is
// exactly why it needed closing: the branch's claim is that the table is the arbiter, so an
// arbiter answering yes for a form nothing renders is the same over-claim one axis over.
test("no engine is buildable in a format its own manifest does not declare", () => {
  const probes: [string, string, VisualFormat][] = [
    ["dw-chart", "d3-bars", "scrolly"],
    ["dw-chart", "column-chart", "video"],
    ["map-dw", "choropleth", "scrolly"],
    ["map-dw", "choropleth", "video"],
    ["image-native", "image-scrolly", "static"],
  ];
  for (const [engine, type, format] of probes) {
    expect(`${engine}/${type}/${format}`).toBe(
      isLoopBuildable(engine, type, format)
        ? "unreachable — an undeclared format answered buildable"
        : `${engine}/${type}/${format}`,
    );
    // The refusal names the format, in the engine's own words where it wrote them.
    const why = unbuildableEngineReason(engine, type, format);
    expect(`${engine}: ${why}`).not.toContain("nothing can build a");
  }
  // …and every format each engine DOES declare still answers true for a type it builds.
  expect(isLoopBuildable("dw-chart", "column-chart", "static")).toBe(true);
  expect(isLoopBuildable("dw-chart", "column-chart", "interactive")).toBe(true);
  expect(isLoopBuildable("map-dw", "choropleth", "interactive")).toBe(true);
  expect(isLoopBuildable("image-native", "image-scrolly", "scrolly")).toBe(true);
  expect(isLoopBuildable("chart-native", "line", "video")).toBe(true);
});
