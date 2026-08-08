import { test, expect } from "bun:test";
import {
  ASSEMBLERS,
  assemblerFor,
  declineReason,
  heightPolicyFor,
} from "./index";
import {
  isLoopBuildable,
  LOOP_BUILDABLE_ENGINES,
  unbuildableEngineReason,
} from "../buildable";
// The registry has to be POPULATED for engineTypes to answer — the deferred check reads each
// engine's own manifest, and an unregistered registry would make it a silent no-op.
import "../../../skills/splash/src/register-producers";
import { allProducers, engineTypes } from "../../core/registry";

test("the buildable list is exactly the table's keys — no hand-written second copy", () => {
  expect([...LOOP_BUILDABLE_ENGINES].sort()).toEqual(
    Object.keys(ASSEMBLERS).sort(),
  );
});

// The deferred witness is READ FROM THE REGISTRY, never named by hand. Both this test and
// "deferral narrows a TYPE" pinned `sankey` — a hand-picked name that went red the day the flow
// family graduated, i.e. for a fact about the world rather than about `isLoopBuildable`.
// (The original point stands and is unchanged: the table used to CLAIM sankey while
// chart-native's manifest declared it deferred, so it was offering a type the engine denies.)
const deferredType = () => {
  const t = engineTypes("chart-native").find((x) => x.deferred);
  expect(
    t,
    "every chart-native type is reachable — these deferral tests need a new witness",
  ).toBeTruthy();
  return t!;
};

test("an engine with no per-type restriction builds any of its REACHABLE types", () => {
  expect(isLoopBuildable("chart-native", "line")).toBe(true);
  expect(isLoopBuildable("chart-native", "heatmap")).toBe(true);
  expect(isLoopBuildable("chart-native", deferredType().id)).toBe(false);
});

test("an unknown engine is not buildable, with or without a type", () => {
  expect(isLoopBuildable("crayon")).toBe(false);
  expect(isLoopBuildable("crayon", "line")).toBe(false);
});

test("no engine at all is the pre-brain default path, which is chart-native", () => {
  expect(isLoopBuildable(undefined)).toBe(true);
});

// THE FORMAT AXIS (task 12), and what closed it. dw-chart's static export is a PNG the loop
// records by path; its interactive is a hosted embed with NO file (skills/dw-chart/src/manifest.ts
// returns `files: []`, form "hosted"). The table used to decline the second, because the run
// manifest's artifact slot required a path and produce() dead-ended on a chart Datawrapper had
// published perfectly well. The slot now records a hosted delivery as the URL it is
// (ArtifactRecordSchema), so BOTH formats are buildable and the brain may offer either.
test("both of a hosted engine's formats are buildable — the file one and the URL one", () => {
  expect(isLoopBuildable("dw-chart", "column-chart", "static")).toBe(true);
  expect(isLoopBuildable("dw-chart", "column-chart", "interactive")).toBe(true);
  // The hosted MAP too — it never carried a format clause, and its interactive was blocked one
  // level down, in produce(), rather than in this table.
  expect(isLoopBuildable("map-dw", "choropleth", "interactive")).toBe(true);
});

test("asked without a format, a type-restricted engine still answers for itself", () => {
  // The engine-level question ("can the loop build through dw-chart at all") must not answer
  // "no" for an engine it does build — several callers ask it with no format in hand.
  expect(isLoopBuildable("dw-chart", "column-chart")).toBe(true);
  expect(isLoopBuildable("dw-chart")).toBe(true);
});

test("a type Datawrapper has no slug for is unbuildable in every format", () => {
  expect(isLoopBuildable("dw-chart", "beeswarm", "static")).toBe(false);
});

// A row-driven Datawrapper export ships the channel's WIDTH and a content-driven height (pinning
// the height crops rows — silent data loss). That cost the offer NINE of Datawrapper's twenty-two
// types while the capture layer could only measure a whole box. It can now measure a width against
// a content-driven height (lib/verify/types.ts HeightPolicy), so the nine are back — and the
// knowledge that justified excluding them now DECLARES their shape instead (heightPolicyFor).
test("the whole row-driven family is back in the offer, declaring its own shape", () => {
  for (const t of [
    "d3-bars",
    "d3-bars-grouped",
    "d3-bars-stacked",
    "d3-bars-bullet",
    "d3-dot-plot",
    "d3-range-plot",
  ]) {
    expect(isLoopBuildable("dw-chart", t, "static")).toBe(true);
    expect(declineReason("dw-chart", t, "static")).toBeUndefined();
    expect(heightPolicyFor("dw-chart", t)).toBe("content-driven");
  }
  // THREE of the nine left this list on 2026-07-28, and not because the height policy changed:
  // dw-chart's OWN manifest declares `d3-bars-split`, `d3-arrow-plot` and `tables` `deferred`
  // ("no KB sheet models this"), and the table now reads that flag instead of claiming what the
  // manifest denies. NOTHING A JOURNALIST SEES MOVES, and that is measurable rather than hoped:
  // lib/brain/typology.ts's renderableSheets already joins through `isRenderable`, which is the
  // same flag — a deferred key could never have become a candidate. Their SHAPE is still
  // declared, because the shape is a fact about the type whether or not the loop composes it.
  for (const t of ["d3-bars-split", "d3-arrow-plot", "tables"]) {
    expect(isLoopBuildable("dw-chart", t, "static")).toBe(false);
    // The manifest's own reason, quoted rather than replaced by the generic engine sentence.
    expect(declineReason("dw-chart", t, "static")).toContain(
      "but cannot build it",
    );
    expect(heightPolicyFor("dw-chart", t)).toBe("content-driven");
  }
  // Its fixed-aspect sibling — the vertical column chart — exports AT the box, and stays pinned:
  // the relaxation is earned per type, not handed to the engine wholesale.
  expect(isLoopBuildable("dw-chart", "column-chart", "static")).toBe(true);
  expect(heightPolicyFor("dw-chart", "column-chart")).toBe("pinned");
});

// A SCROLLY IS THE SECOND SHAPE THAT EARNS THE RELAXATION, and it earns it for the same reason
// the row-driven family does: its height belongs to its content. A scrolly is its own scroll —
// measured on a loop-produced chart scrolly, 3645px of narrative walk in a 1200x675 destination —
// so the destination's height is not a bound on it, and holding it to one filed a blocking
// `component-overflows-viewport` on every scrolly that has ever been produced.
//
// Declared on the HOST, not on the type: skills/scrolly hosts chart-native's and map-native's
// tracks, so `resolveBuilder` answers "scrolly" for every one of them and the property is true of
// all. image-native answers for itself (its only format IS scrolly).
test("a scrolly's height belongs to its walk, whichever track it hosts", () => {
  for (const t of ["line", "bar", "choropleth", "symbol"])
    expect(heightPolicyFor("scrolly", t)).toBe("content-driven");
  expect(heightPolicyFor("image-native", "image-scrolly")).toBe(
    "content-driven",
  );
  // …and the same engines' NON-scrolly forms are untouched: a chart-native interactive is still
  // pinned to its box. The relaxation follows the builder that actually renders the page.
  expect(heightPolicyFor("chart-native", "line")).toBe("pinned");
  expect(heightPolicyFor("map-native", "choropleth")).toBe("pinned");
});

// The default is the strict one, everywhere. A policy that leaked to another engine (or to an
// option carrying no engine at all — hand-authored manifests predating the brain) would relax a
// check for artifacts that never earned it.
test("every other engine, and an unset one, stays pinned", () => {
  expect(heightPolicyFor("chart-native", "d3-bars")).toBe("pinned");
  expect(heightPolicyFor("map-dw", "choropleth")).toBe("pinned");
  expect(heightPolicyFor(undefined, undefined)).toBe("pinned");
  expect(heightPolicyFor("dw-chart", undefined)).toBe("pinned");
  expect(heightPolicyFor("dw-chart", "not-a-real-type")).toBe("pinned");
});

// The refusal a journalist reads for a wired engine must not be the generic one: "nothing can
// build a dw-chart form yet — production is wired for …, dw-chart" contradicts itself.
test("the refusal for a declined pairing is the table's own sentence, not the engine fallback", () => {
  // A type Datawrapper has no slug for — the pairing dw-chart declines whatever the format, so
  // this reads the property (table sentence beats generic fallback) off a case that is about the
  // TYPE axis and cannot be confused with a format restriction.
  const reason = unbuildableEngineReason("dw-chart", "beeswarm", "static");
  expect(reason).toBe(declineReason("dw-chart", "beeswarm", "static"));
  expect(reason).toContain('Datawrapper does not build a "beeswarm" chart');
  expect(reason).not.toContain("nothing can build");
});

// THE GENERIC FALLBACK belongs to an engine the table holds NO key for — and only to it. This
// test used to call unbuildableEngineReason("map-dw", "choropleth", "static"), a pairing
// isLoopBuildable answers TRUE for: it exercised the refusal writer on something that is never
// refused, passed for the wrong reason, and pinned the self-contradicting sentence ("nothing can
// build a map-dw form yet — production is wired for …, map-dw") as the expected one.
test("the generic engine sentence is for an engine nothing is wired for, and only that", () => {
  expect(isLoopBuildable("crayon", "choropleth", "static")).toBe(false);
  const reason = unbuildableEngineReason("crayon", "choropleth", "static");
  expect(reason).toContain("nothing can build a crayon form yet");
  // …and it names what IS wired, which is only useful because "crayon" is not among them.
  for (const engine of LOOP_BUILDABLE_ENGINES) expect(reason).toContain(engine);
});

// EVERY WIRED ENGINE ANSWERS IN ITS OWN WORDS. The generic sentence contradicts itself for any
// engine sitting in the buildable list, which is exactly what these four used to emit: "nothing
// can build a map-native form yet — production is wired for …, map-native …". Enumerated rather
// than sampled, so a future entry with a `supports` and no `declines` fails here.
test("a wired engine declining a pairing never falls back to the self-contradicting sentence", () => {
  const declined: [string, string][] = [
    ["dw-chart", "beeswarm"],
    ["map-dw", "symbol"],
    ["map-dw", "locator"],
    ["map-native", "treemap"],
    ["image-native", "line"],
    ["scrolly", "d3-bars"],
    ["scrolly", "scatter"],
  ];
  for (const [engine, type] of declined) {
    expect(isLoopBuildable(engine, type, "static")).toBe(false);
    const reason = unbuildableEngineReason(engine, type, "static");
    expect(`${engine}/${type}: ${reason}`).not.toContain("nothing can build a");
    expect(reason).toBe(declineReason(engine, type, "static")!);
  }
  // The two sentences that already existed and were DEAD — reached only from assembleMapDw,
  // which assemblerFor never calls for a type it declines.
  expect(unbuildableEngineReason("map-dw", "symbol")).toContain("hover only");
  expect(unbuildableEngineReason("map-dw", "locator")).toContain(
    "build the locator with map-native",
  );
  // "a image-native" was the other half of that sentence being generic — the article agrees now.
  expect(unbuildableEngineReason("image-native", "line")).toContain(
    "image-native walks the journalist's own photographs",
  );
});

// Every entry that RESTRICTS must also EXPLAIN. Without this, adding a `supports` to a new entry
// silently re-opens the generic-sentence hole one engine at a time.
test("every entry that narrows its types also carries the sentence for what it turned down", () => {
  const restricted = Object.entries(ASSEMBLERS).filter(([, e]) => e.supports);
  expect(restricted.length).toBeGreaterThan(0);
  expect(
    restricted.filter(([, e]) => !e.declines).map(([name]) => name),
  ).toEqual([]);
});

// A DEFERRED TYPE IS NOT BUILDABLE, for every engine that declares one — enumerated FROM the
// registry, never from a list of names typed here (that list is exactly what would rot).
//
// The lie this closes, measured on the committed branch:
// `isLoopBuildable("chart-native", "sankey", "static")` answered TRUE. `sankey` is one of the
// fourteen family-B types chart-native's manifest marks `deferred` — no mapper builds them — and
// chart-native's table entry carries no `supports`, so every declared type passed. Nothing
// downstream would have rendered one (lib/brain's renderableSheets join drops a deferred type one
// layer up), which is precisely the problem: the table, which this branch makes the arbiter, was
// relying on a join sitting above it to be right.
test("a type its own engine declares deferred is refused by the table, and says why", () => {
  const deferred = allProducers().flatMap((p) =>
    (p.types ?? [])
      .filter((t) => t.deferred)
      .map((t) => ({ engine: p.name, id: t.id, reason: t.deferred! })),
  );
  // Non-vacuity: several engines declare deferred types today (chart-native's family B, map-dw's
  // symbol, dw-chart's two un-modelled slugs). A registry that stopped declaring any would make
  // the loop below pass by iterating nothing.
  expect(deferred.length).toBeGreaterThan(10);
  expect(new Set(deferred.map((d) => d.engine)).size).toBeGreaterThan(1);
  for (const d of deferred) {
    // Only for engines the table actually holds a key for — an engine with no key is unbuildable
    // for a different reason, already covered above.
    if (!(d.engine in ASSEMBLERS)) continue;
    expect(`${d.engine}/${d.id}`).toBe(
      isLoopBuildable(d.engine, d.id, "static")
        ? "unreachable — a deferred type answered buildable"
        : `${d.engine}/${d.id}`,
    );
    // …and the refusal is never the self-contradicting generic sentence.
    expect(unbuildableEngineReason(d.engine, d.id, "static")).not.toContain(
      "nothing can build a",
    );
  }
});

// The engine-level question is UNCHANGED by the deferral check: "can the loop build through
// chart-native at all" must still answer yes for an engine whose catalogue holds deferred types.
test("deferral narrows a TYPE, never the engine", () => {
  const t = deferredType();
  expect(isLoopBuildable("chart-native")).toBe(true);
  expect(isLoopBuildable("chart-native", "line", "static")).toBe(true);
  expect(isLoopBuildable("chart-native", t.id, "static")).toBe(false);
  // …and the refusal quotes the manifest's OWN reason, whichever type is carrying it.
  expect(unbuildableEngineReason("chart-native", t.id, "static")).toContain(
    t.deferred!,
  );
});

// ── The four chart types whose VIDEO cannot ship (2026-07-28 grid pass) ────────────────────────
//
// Measured, not assumed: the brain offered all four of these video forms CLEAN and the producer's
// own reveal contract refused every one of them after encoding the mp4 — the "offered but not
// producible" trap. The restriction is per-(type, format) precisely because the same four types
// render a static and an interactive chart perfectly well; a manifest `deferred` flag would have
// closed three working forms to close one broken one, and this test is what stops that from
// happening by accident later.
test("a video-unreachable chart type is refused in VIDEO and untouched in every other format", () => {
  for (const type of ["pyramid", "treemap", "waffle", "dot-strip"]) {
    expect(`${type}/video → ${isLoopBuildable("chart-native", type, "video")}`).toBe(
      `${type}/video → false`,
    );
    expect(`${type}/static → ${isLoopBuildable("chart-native", type, "static")}`).toBe(
      `${type}/static → true`,
    );
    expect(
      `${type}/interactive → ${isLoopBuildable("chart-native", type, "interactive")}`,
    ).toBe(`${type}/interactive → true`);
  }
});

test("the refusal a journalist reads names the form and the way out, never the guard", () => {
  const reason = declineReason("chart-native", "treemap", "video");
  expect(reason).toContain("cannot be shipped as a video yet");
  expect(reason).toContain("static or interactive");
  // Never the self-contradicting generic sentence, and never a maintainer's vocabulary.
  expect(reason).not.toContain("nothing can build a");
  expect(reason).not.toContain("snap-video");
  expect(reason).not.toContain("%");
});

// The restriction must not leak onto the types that DO animate — the whole video family would
// otherwise be closed by a typo in the map.
test("every other chart type still builds a video", () => {
  for (const type of ["line", "bar", "heatmap", "stacked-area", "beeswarm", "violin"])
    expect(`${type} → ${isLoopBuildable("chart-native", type, "video")}`).toBe(
      `${type} → true`,
    );
});
