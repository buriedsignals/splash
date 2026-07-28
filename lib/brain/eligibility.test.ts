// lib/brain/eligibility.test.ts
import { test, expect, describe, it } from "bun:test";
import { deriveFacts } from "./facts";
import { eligible, buildabilityMark } from "./eligibility";
import { loadTypology, renderableSheets, type TypeSheet } from "./typology";
import type { VisualFormat } from "../core/vocabulary";
// renderableSheets() only sees a type once its engine has self-registered into
// lib/core/registry — the same side-effect import lib/brain/typology-drift.test.ts uses.
// eligibility.ts itself stays engine-agnostic; the composition root (or, here, the test) is
// what makes the registry non-empty.
import "../loop/engines";
import { isLoopBuildable } from "../loop/buildable";
import { bgIsDark } from "../core/theme";

const TWO_POINTS = deriveFacts({
  columns: ["canton", "2019", "2024"],
  numericColumns: ["2019", "2024"],
  rowCount: 8,
});

const BASE = {
  facts: TWO_POINTS,
  channel: "article-web",
} as const;

// A minimal, valid TypeSheet fixture for tests that need to isolate one engine pairing from
// the real KB's coincidences (e.g. every real dw-chart/map-dw sheet in this KB also names a
// non-Datawrapper engine, so a real sheet alone cannot prove a Datawrapper-only refusal
// actually empties `eligible` for that id — a synthetic single-engine sheet can).
function fakeSheet(
  id: string,
  formats: VisualFormat[],
  limits: Record<string, number> = {},
): TypeSheet {
  return {
    id,
    engines: { "fake-engine": ["fake-key"] },
    intent: ["magnitude"],
    shape: "single",
    limits,
    formats,
    bestFor: ["a fixture for eligibility.test.ts, not a real KB sheet"],
    notFor: ["anything real"],
    sheetPath: "test/fake.md",
    body: "",
  };
}

test("a two-point wide dataset makes slope legal", () => {
  const { eligible: ok } = eligible({ ...BASE });
  expect(ok.some((c) => c.id === "slope")).toBe(true);
});

test("a limit the data breaks excludes the form WITH its reason", () => {
  const many = deriveFacts({
    columns: ["canton", "2019", "2024"],
    numericColumns: ["2019", "2024"],
    rowCount: 40, // slope caps maxSeries at 12
  });
  const { eligible: ok, excluded } = eligible({ ...BASE, facts: many });
  expect(ok.some((c) => c.id === "slope")).toBe(false);
  const why = excluded.find((e) => e.id === "slope");
  expect(why?.reason).toMatch(/40/);
});

test("a channel that forbids a format excludes it, with the channel named", () => {
  const { eligible: ok, excluded } = eligible({
    ...BASE,
    channel: "social-vertical",
  });
  expect(ok.every((c) => c.format !== "interactive")).toBe(true);
  expect(excluded.some((e) => /social-vertical/.test(e.reason))).toBe(true);
});

test("a missing capability MARKS the form — it never removes it", () => {
  const { eligible: ok } = eligible({
    ...BASE,
    readiness: [
      {
        id: "chart-native",
        label: "Charts built in-house",
        status: "missing",
        reason: "chart-native is not installed",
        help: [],
      },
    ],
  });
  const slope = ok.find((c) => c.id === "slope");
  expect(slope).toBeDefined(); // still offered…
  expect(slope!.readiness?.status).toBe("missing"); // …but marked
});

test("a dark house theme excludes the Datawrapper engine", () => {
  const { eligible: ok } = eligible({ ...BASE, themeBg: "#12233A" });
  expect(ok.every((c) => c.engine !== "dw-chart")).toBe(true);
});

test("a dark theme's Datawrapper refusal is reported when no other engine offers the form, and the same physical reason covers a Datawrapper MAP too", () => {
  const dwOnly = fakeSheet("dw-only-form", ["static", "interactive"]);
  const mapDwOnly = fakeSheet("map-dw-only-form", ["static", "interactive"]);
  const { eligible: ok, excluded } = eligible({ ...BASE, themeBg: "#12233A" }, [
    { sheet: dwOnly, engine: "dw-chart", key: "fake-key" },
    { sheet: mapDwOnly, engine: "map-dw", key: "fake-key" },
  ]);
  expect(ok.length).toBe(0);
  const dwReason = excluded.find((e) => e.id === "dw-only-form");
  const mapDwReason = excluded.find((e) => e.id === "map-dw-only-form");
  expect(dwReason?.reason).toMatch(/Datawrapper|light/i);
  expect(mapDwReason?.reason).toMatch(/Datawrapper|light/i);
});

test("a form still offered through ANOTHER engine is not reported excluded, even though its Datawrapper variant was refused", () => {
  const dual = fakeSheet("dual-engine-form", ["static", "interactive"]);
  const { eligible: ok, excluded } = eligible({ ...BASE, themeBg: "#12233A" }, [
    { sheet: dual, engine: "chart-native", key: "fake-key" },
    { sheet: dual, engine: "dw-chart", key: "fake-key" },
  ]);
  expect(
    ok.some((c) => c.id === "dual-engine-form" && c.engine === "chart-native"),
  ).toBe(true);
  expect(
    ok.every((c) => !(c.id === "dual-engine-form" && c.engine === "dw-chart")),
  ).toBe(true);
  // The id IS offered (via chart-native) — reporting it in `excluded` too would tell the
  // journalist a contradiction ("here is dual-engine-form" and "dual-engine-form was
  // discarded" in the same breath). A journalist has no interest in which of two
  // interchangeable renderers lost out.
  expect(excluded.some((e) => e.id === "dual-engine-form")).toBe(false);
});

test("an engine that has no producer for a format the channel allows is excluded, naming the engine and the formats", () => {
  const videoOnly = fakeSheet("video-only-form", ["video"]);
  const { eligible: ok, excluded } = eligible(
    { facts: TWO_POINTS, channel: "article-web" },
    [{ sheet: videoOnly, engine: "dw-chart", key: "fake-key" }],
  );
  expect(ok.length).toBe(0);
  const why = excluded.find((e) => e.id === "video-only-form");
  expect(why?.reason).toMatch(/dw-chart/);
  expect(why?.reason).toMatch(/video/);
});

test("real KB: dw-chart and map-dw never offer video — they have no video producer", () => {
  const { eligible: ok } = eligible({ ...BASE });
  expect(
    ok.every((c) => !(c.engine === "dw-chart" && c.format === "video")),
  ).toBe(true);
  expect(
    ok.every((c) => !(c.engine === "map-dw" && c.format === "video")),
  ).toBe(true);
  // ...but the SAME form still offers video through its OTHER engine — this is a narrowed
  // format, not a dropped id.
  expect(
    ok.some(
      (c) =>
        c.id === "scatter" &&
        c.engine === "chart-native" &&
        c.format === "video",
    ),
  ).toBe(true);
});

test("check order is pinned: a channel refusal is reported even when the data would ALSO break a limit", () => {
  // A form that fails BOTH: formats=[scrolly] (killed by social-vertical, which allows neither
  // scrolly nor interactive) AND minPoints:3 (killed by TWO_POINTS' points:2). Channel-format
  // is checked first — the journalist reads the channel-agnostic reason, not the data-specific
  // one that happened to also apply. A fixture, not a real sheet: the KB's only scrolly sheet
  // (image-scrolly) carries no data limit any more, so no real sheet fails both at once.
  const doublyRefused = fakeSheet("doubly-refused-form", ["scrolly"], {
    minPoints: 3,
  });
  const { excluded } = eligible(
    { facts: TWO_POINTS, channel: "social-vertical" },
    [{ sheet: doublyRefused, engine: "image-native", key: "fake-key" }],
  );
  const why = excluded.find((e) => e.id === "doubly-refused-form");
  expect(why?.reason).toMatch(/social-vertical/);
  expect(why?.reason).not.toMatch(/points/);
});

test('themeBg "dark" excludes Datawrapper the same as a dark hex', () => {
  const { eligible: ok } = eligible({ ...BASE, themeBg: "dark" });
  expect(ok.every((c) => c.engine !== "dw-chart")).toBe(true);
});

test('themeBg "light" does not exclude Datawrapper', () => {
  const { eligible: ok } = eligible({ ...BASE, themeBg: "light" });
  expect(ok.some((c) => c.engine === "dw-chart")).toBe(true);
});

test("an unparseable themeBg throws rather than silently reading as light", () => {
  expect(() => eligible({ ...BASE, themeBg: "midnight" })).toThrow();
});

// "Is this ground dark" had TWO answers: this file's own luminance < 0.5, and lib/core/theme's
// bgIsDark (< 0.4), the resolver every renderer already routes through. On the band between
// them a newsroom lost both Datawrapper engines on a false premise — and because a form offered
// through another engine is deduped out of `excluded`, the loss never even showed up as a
// discard. One predicate now, so the brain and the renderer cannot disagree about one ground.
test("the dark-ground decision agrees with the renderer's own predicate, at every ground", () => {
  for (const bg of [
    "#B4B4B4",
    "#AAAAAA",
    "#FFFFFF",
    "#18181B",
    "#12233A",
    "#717171",
    "dark",
    "light",
  ]) {
    const { eligible: ok } = eligible({ ...BASE, themeBg: bg });
    const offersDw = ok.some((c) => c.engine === "dw-chart");
    expect({ bg, offersDw }).toEqual({ bg, offersDw: !bgIsDark(bg) });
  }
});

// The mark is about whether the branch EXISTS in this build, never about what the run asked
// for. It used to fire only when `input.route !== "article"` — so a manifest declaring
// route:"article" (a plain field any caller may set) got image-scrolly offered CLEAN: no
// readiness at all, buildable by nobody. `EligibilityInput` no longer carries `route`, so the
// condition cannot be re-introduced by accident.
test("the article branch MARKS every form that needs it, whatever the run declared — and marking never removes the form", () => {
  // image-scrolly is the KB's narrative sheet; only article-web allows its scrolly format.
  const facts = deriveFacts({
    columns: ["step", "note", "alt"],
    numericColumns: ["step", "note", "alt"],
    rowCount: 4,
  });
  const { eligible: ok } = eligible({
    facts,
    channel: "article-web",
    readiness: [
      {
        id: "image-native",
        label: "Local images",
        status: "unverified",
        reason: "image-native could not be reached when it was last checked",
        help: [],
      },
    ],
  });
  const scrolly = ok.find((c) => c.id === "image-scrolly");
  expect(scrolly).toBeDefined(); // still offered…
  expect(scrolly!.requires).toContain("article-branch");
  // worst of {article-branch: missing, image-native: unverified} is missing (3 > 1) — the
  // rule this pins, not just image-scrolly's own readiness.
  expect(scrolly!.readiness?.status).toBe("missing");
  // …and the sentence a journalist reads is the branch's, not a deeper wiring detail.
  expect(scrolly!.readiness!.reason).toMatch(/whole-article branch/);
});

// A FICTIONAL engine, on purpose. This used to filter the real KB's own offer for a sheet
// whose engine had no assembler yet (map-native, then dw-chart, then map-dw) — each wiring
// falsified it in turn, and now the assembler table covers every REAL engine the KB names
// (chart-native, map-native, scrolly, image-native, map-dw, dw-chart), so no real sheet can
// prove this rule any more. Same resolution lib/loop/produce.test.ts already carries: declare
// a dead end instead of borrowing the last real one.
test("a form whose engine the loop cannot build through is MARKED, never offered clean", () => {
  const unbuildableSheet = fakeSheet("fx-crayon-form", ["static"]);
  const { eligible: ok } = eligible({ ...BASE }, [
    ...renderableSheets(),
    { sheet: unbuildableSheet, engine: "crayon", key: "fake-key" },
  ]);
  const unbuildable = ok.filter((c) => !isLoopBuildable(c.engine));
  expect(unbuildable.length).toBeGreaterThan(0); // the fixture actually exercises the path
  for (const c of unbuildable) {
    expect(c.readiness?.status).toBe("missing");
    // …and it names what cannot be built — unless the form ALSO sits on the unbuilt article
    // branch, whose mark is the one a journalist needs to read first (it changes what would
    // be delivered, not just which renderer runs).
    if (!c.requires?.includes("article-branch"))
      expect(c.readiness!.reason).toContain(c.engine);
  }
  // …and the mark never removes: every buildable form is still there, unmarked by THIS rule.
  expect(ok.some((c) => c.engine === "chart-native" && !c.readiness)).toBe(
    true,
  );
});

test("every exclusion carries a non-empty reason — no silent drop", () => {
  const { excluded } = eligible({ ...BASE, channel: "social-feed" });
  for (const e of excluded) expect(e.reason.length).toBeGreaterThan(0);
});

test("a scrolly candidate is never clean — nothing can build it yet, and the offer says so", () => {
  const sheet = fakeSheet("fx-scrolly", ["scrolly"]);
  // The point of this fixture: chart-native itself IS loop-buildable, so a naive check on
  // c.engine alone would see this candidate as clean. It is the EFFECTIVE producer
  // (scrolly, via producerForFormat) that cannot be built through yet.
  expect(isLoopBuildable("chart-native")).toBe(true);
  const { eligible: legal } = eligible(
    { facts: TWO_POINTS, channel: "article-web" },
    [{ sheet, engine: "chart-native", key: "line" }],
  );
  expect(legal.length).toBe(1);
  expect(legal[0]!.format).toBe("scrolly");
  // Every scrolly candidate also carries the article-branch mark (unconditional on format,
  // regardless of engine — see withMarks), and that mark is pushed first, so it wins the
  // same-severity tie against the effective-producer buildability mark this task adds.
  // Both marks are real; only one is surfaced (the SEVERITY "worst, first-wins" rule already
  // governs every other mark in this file). What this test pins is that the candidate is
  // offered MARKED, never clean.
  expect(legal[0]!.readiness?.status).toBe("missing");
  expect(legal[0]!.readiness?.reason.length).toBeGreaterThan(0);
});

test("a producer that genuinely lacks a format still loses it — map-dw has no video", () => {
  const sheet = fakeSheet("fx-dw-video", ["video"]);
  const { eligible: legal, excluded } = eligible(
    { facts: TWO_POINTS, channel: "article-web" },
    [{ sheet, engine: "map-dw", key: "choropleth" }],
  );
  expect(legal).toEqual([]);
  expect(excluded.length).toBe(1);
});

// Direct seam on the buildability mark: inside a full eligible() call, this mark is masked
// for every scrolly candidate by the article-branch mark (same severity, pushed first — see
// the comment at eligibility.ts:207-211), so no black-box call through eligible() can tell
// whether this mark was resolved on the sheet's engine or on the effective producer. Testing
// the exported function directly is the only level at which a revert of the effective-producer
// fix is observable.
//
// The FIXTURE moved three times, each time because the engine it was pinned on became
// buildable — which is the point of the tranche, not a weakening of this test. It was
// "chart-native" + "scrolly" until task 9 wired the scrolly host (chart-native itself IS
// loop-buildable; its scrolly form was not), then "dw-chart" until task 12 wired the hosted
// chart, then "map-dw" until task 13 wired the hosted map — and now the assembler table covers
// every real engine the KB names, so no real engine is left with an unbuildable static form.
// A FICTIONAL engine ("crayon", the same convention lib/loop/produce.test.ts and the
// no-format-redirect test below use) still proves the point: nothing in the assembler table
// knows its name, so its static form is unbuildable, but `producerForFormat` redirects ANY
// engine's "scrolly" format to the shared scrolly host (lib/core/registry.ts's FORMAT_HOST),
// which IS buildable — so the same engine name has to answer differently for its two formats,
// or the resolution is reading chosen.engine instead of the format's actual producer.
test("buildabilityMark resolves the EFFECTIVE producer, not the sheet's engine — a fictional engine's scrolly form redirects to the buildable scrolly host", () => {
  const staticMark = buildabilityMark("crayon", "static");
  expect(staticMark).not.toBeNull();
  expect(staticMark!.reason).toContain("crayon");
  const scrollyMark = buildabilityMark("crayon", "scrolly");
  expect(scrollyMark).toBeNull();
});

test("buildabilityMark is null when the loop can already build through the producer", () => {
  expect(buildabilityMark("chart-native", "video")).toBeNull();
});

// THE FORMAT AXIS (task 12), at the level that matters: what the journalist is SHOWN — and what
// closed it. dw-chart's static export is a PNG the loop records by path; its interactive is a
// hosted Datawrapper embed with no file at all. While the manifest could only record a path, that
// pairing was MARKED: unmarked it ranked FIRST in a real run's offer and dead-ended after the
// choice (measured). The manifest now records a hosted delivery as the URL it is
// (ArtifactRecordSchema, lib/loop/manifest.ts) and produce() writes it, so there is no dead end
// left to warn about and BOTH formats are offered clean.
//
// The TYPE axis still marks, and is asserted here beside it, so this test keeps guarding that
// buildabilityMark reads more than the engine name.
test("both of a hosted engine's formats are offered clean, while an unbuildable type still marks", () => {
  expect(buildabilityMark("dw-chart", "static", "column-chart")).toBeNull();
  expect(
    buildabilityMark("dw-chart", "interactive", "column-chart"),
  ).toBeNull();
  const unknownType = buildabilityMark("dw-chart", "static", "beeswarm");
  expect(unknownType).not.toBeNull();
  expect(unknownType!.status).toBe("missing");
  expect(unknownType!.reason).toContain(
    'Datawrapper does not build a "beeswarm" chart',
  );
});

test("buildabilityMark names the actual unbuildable engine when there is no format redirect", () => {
  // A FICTIONAL engine, on purpose. This assertion needs an engine that is unbuildable AND
  // whose format is not redirected to another producer — it named map-native (task 7), then
  // map-dw (task 13), and each wiring falsified it in turn. buildabilityMark takes any engine
  // string, so the test declares its own dead end instead of borrowing the last real one.
  const mark = buildabilityMark("crayon", "static");
  expect(mark).not.toBeNull();
  expect(mark!.reason).toContain("crayon");
});

test("a mark can never carry an empty reason, even for a capability disabled with no reason (readiness.ts:54)", () => {
  const { eligible: ok } = eligible({
    ...BASE,
    readiness: [
      {
        id: "chart-native",
        label: "Charts built in-house",
        status: "disabled",
        reason: "", // the real shape readiness.ts returns for a switched-off capability
        help: [],
      },
    ],
  });
  // Scoped to the engine the fixture actually disabled: a candidate on ANOTHER engine now
  // carries the "production cannot build this" mark instead, whose reason is a different (also
  // non-empty) sentence. What is pinned here is the empty-reason repair, not which mark wins.
  // A chart-native candidate in the scrolly format is excluded too: its EFFECTIVE producer is
  // skills/scrolly, so it carries the masking article-branch mark (severity `missing`, always
  // pushed first — see `withMarks` in eligibility.ts) instead of this readiness mark; that
  // masking is exercised directly by "buildabilityMark resolves the EFFECTIVE producer..." above.
  const marked = ok.filter(
    (c) => c.engine === "chart-native" && c.format !== "scrolly" && c.readiness,
  );
  expect(marked.length).toBeGreaterThan(0); // the fixture actually exercised the path
  for (const c of marked) {
    expect(c.readiness!.reason.length).toBeGreaterThan(0);
    expect(c.readiness!.reason).toMatch(/Charts built in-house/);
  }
  // …and no mark anywhere is wordless.
  for (const c of ok) if (c.readiness) expect(c.readiness.reason).not.toBe("");
});

test("a requested format is a hard filter — only that format survives", () => {
  const { eligible: legal } = eligible({
    facts: TWO_POINTS,
    channel: "article-web",
    requestedFormat: "video",
  });
  expect(legal.length).toBeGreaterThan(0);
  expect(legal.every((c) => c.format === "video")).toBe(true);
});

test("a requested format the channel forbids is refused by name, with no exclusion spam", () => {
  const res = eligible({
    facts: TWO_POINTS,
    channel: "social-vertical",
    requestedFormat: "scrolly",
  });
  expect(res.eligible).toEqual([]);
  expect(res.excluded).toEqual([]);
  expect(res.refusal).toContain("social-vertical");
  expect(res.refusal).toContain("scrolly");
});

test("a form that does not come in the requested format is excluded with its own reason", () => {
  const sheet = fakeSheet("fx-static-only", ["static"]);
  const res = eligible(
    { facts: TWO_POINTS, channel: "article-web", requestedFormat: "video" },
    [{ sheet, engine: "fake-engine", key: "fake-key" }],
  );
  expect(res.eligible).toEqual([]);
  expect(res.excluded.length).toBe(1);
  expect(res.excluded[0]!.reason).toContain("video");
});

// This used to run on requestedFormat:"scrolly" — CHANNEL-legal on article-web (so the
// channel-legality refusal above never fires), and every real KB scrolly candidate was
// unbuildable (LOOP_BUILDABLE_ENGINES had no scrolly host), which used to leave the offer with
// rows but no refusal: nextActionsForElement would route back to choose-form forever with no
// verb to escape it. Task 9 wires scrolly (it composes whichever host engine's track the
// nativeType belongs to), so a real scrolly request on this KB now has buildable rows and this
// fixture no longer demonstrates the dead end. A synthetic single-engine sheet on a still-
// unwired engine (map-dw) reproduces the same mechanism: channel-legal, zero buildable
// candidates, refused by name. The rows stay OFFERED and MARKED (never removed) — this
// refusal is an ADDITIONAL sentence naming the dead end.
test("a requested format that is channel-legal but leaves zero buildable candidates is refused by name too", () => {
  const sheet = fakeSheet("fx-map-dw-static", ["static"]);
  const res = eligible(
    { facts: TWO_POINTS, channel: "article-web", requestedFormat: "static" },
    [{ sheet, engine: "map-dw", key: "fake-key" }],
  );
  // The row is NOT removed — offered, marked.
  expect(res.eligible.length).toBe(1);
  expect(res.eligible[0]!.format).toBe("static");
  expect(res.refusal).toBeDefined();
  expect(res.refusal).toContain("static");
  expect(res.refusal).toContain("article-web");
});

test("a requested format with at least one buildable candidate is not refused", () => {
  const res = eligible({
    facts: TWO_POINTS,
    channel: "article-web",
    requestedFormat: "video",
  });
  expect(res.eligible.some((c) => isLoopBuildable(c.engine))).toBe(true);
  expect(res.refusal).toBeUndefined();
});

describe("print (issue #1)", () => {
  it("keeps Datawrapper out of a print offer, with a reason a journalist can read", () => {
    const { eligible: rows, excluded } = eligible({
      facts: TWO_POINTS,
      channel: "print-page",
    });
    for (const c of rows) expect(c.engine).not.toBe("dw-chart");
    for (const c of rows) expect(c.engine).not.toBe("map-dw");
    const reasons = excluded.map((e) => e.reason).join(" | ");
    if (excluded.length > 0) expect(reasons).toMatch(/print|screen/i);
  });

  it("offers native forms, and only in the static format", () => {
    const { eligible: rows } = eligible({
      facts: TWO_POINTS,
      channel: "print-page",
    });
    expect(rows.length).toBeGreaterThan(0);
    for (const c of rows) expect(c.format).toBe("static");
  });
});

// A26: radar and parallel coordinates both need >= 3 axes to form a legible shape
// (checkRadarConformance / checkParallelConformance in skills/chart-native/src/core/conformance.ts
// enforce exactly this floor: "radar has N axes (< 3)" / "parallel coordinates need >= 3 axes").
// Until now that floor lived ONLY at render time — a 2-numeric-column CSV would have been offered
// by the brain as legal, then died downstream at conformance instead of being excluded here with
// a readable reason. `minPoints` already measures numeric-column count (facts.points); no new
// vocabulary is needed, only declaring the floor both sheets already document in prose ("4-8
// comparable dimensions" / "3-8 numeric dimensions") and their own conformance checker enforces.
//
// Both types are `deferred` in chart-native's own catalogue (Family B — "rare in a small
// newsroom"), so renderableSheets() never pairs them today (same reason typology-drift.test.ts
// uses "sankey" as its "a deferred type never pairs" example) — there is no LIVE path where an
// under-specified radar/parallel reaches a journalist yet. This test proves the mechanics
// directly, the same way the `fakeSheet` tests above isolate one engine pairing from the real
// KB's coincidences: it pairs the REAL sheet (loaded straight off disk, not a fixture) explicitly,
// bypassing the deferred filter, so the floor is proven correct now and stays correct the day
// Family B goes live — nobody has to remember to add it in that future moment.
const REAL_SHEETS = loadTypology();
function realPair(id: string) {
  const sheet = REAL_SHEETS.find((s) => s.id === id);
  if (!sheet) throw new Error(`no real KB sheet named "${id}"`);
  return {
    sheet,
    engine: "chart-native",
    key: sheet.engines["chart-native"][0],
  };
}

test("real KB: radar and parallel both declare a >= 3 axis floor, and refuse a two-axis dataset with it named", () => {
  const radarSheet = REAL_SHEETS.find((s) => s.id === "radar")!;
  const parallelSheet = REAL_SHEETS.find((s) => s.id === "parallel")!;
  expect(radarSheet.limits.minPoints).toBe(3);
  expect(parallelSheet.limits.minPoints).toBe(3);

  const twoAxes = deriveFacts({
    columns: ["entity", "reach", "trust"],
    numericColumns: ["reach", "trust"],
    rowCount: 3,
  });
  const { excluded } = eligible({ facts: twoAxes, channel: "article-web" }, [
    realPair("radar"),
    realPair("parallel"),
  ]);
  const radar = excluded.find((e) => e.id === "radar");
  const parallel = excluded.find((e) => e.id === "parallel");
  expect(radar?.reason).toMatch(/3.*point|point.*3/i);
  expect(parallel?.reason).toMatch(/3.*point|point.*3/i);
});

test("real KB: radar and parallel are legal once the data carries >= 3 axes", () => {
  const threeAxes = deriveFacts({
    columns: ["entity", "reach", "trust", "speed"],
    numericColumns: ["reach", "trust", "speed"],
    rowCount: 3,
  });
  const { eligible: ok } = eligible(
    { facts: threeAxes, channel: "article-web" },
    [realPair("radar"), realPair("parallel")],
  );
  expect(ok.some((c) => c.id === "radar")).toBe(true);
  expect(ok.some((c) => c.id === "parallel")).toBe(true);
});

// A17: facts.series === rowCount always (facts.ts), so any sheet checking BOTH `maxSeries` and
// `maxCategories` was comparing the SAME number (rows) against two different ceilings — one of
// the two checks was a decoy that could never fire on its own terms. grouped-bar/stacked-bar/
// marimekko are exactly the CSV shape chart-selection.md documents as "first column = category
// [the ROWS], every following numeric column = a series [the COLUMNS]" — so on a real wide CSV
// for these three, "series" means numeric-column count (facts.points), not row count. A dataset
// with few series (2 columns) and many categories (10 rows) used to be excluded with "stays
// readable up to 3 series, and the data has 10" — true about the ROW count, false about the
// actual series count, and naming the wrong ceiling to the journalist reading it.
test("real KB: grouped-bar counts its series from the numeric columns, not the row count", () => {
  const manyCategoriesFewSeries = deriveFacts({
    columns: ["region", "2019", "2024"], // 2 series columns
    numericColumns: ["2019", "2024"],
    rowCount: 10, // 10 categories — legal (<= maxCategories: 6 is NOT satisfied, see below)
  });
  // 10 rows also breaks maxCategories (<=6), so isolate the series axis: 6 categories, 2 series.
  const sixCategoriesTwoSeries = deriveFacts({
    columns: ["region", "2019", "2024"],
    numericColumns: ["2019", "2024"],
    rowCount: 6,
  });
  const { eligible: ok } = eligible({
    facts: sixCategoriesTwoSeries,
    channel: "article-web",
  });
  expect(ok.some((c) => c.id === "grouped-bar")).toBe(true);

  // Before the fix this used to read the ROW count (10) as the series count and exclude with
  // "stays readable up to 3 series, and the data has 10" — a true statement about rows, and a
  // false one about series (there are only 2). Now: excluded for the real reason (too many
  // categories), never a phantom series violation.
  const { excluded } = eligible({
    facts: manyCategoriesFewSeries,
    channel: "article-web",
  });
  const why = excluded.find((e) => e.id === "grouped-bar");
  expect(why?.reason).toMatch(/categories/);
  expect(why?.reason).not.toMatch(/series/);
});

test("real KB: grouped-bar refuses too many series (numeric columns), naming the real count", () => {
  const fourSeriesFewCategories = deriveFacts({
    columns: ["region", "2019", "2020", "2021", "2022"], // 4 series columns > maxSeries: 3
    numericColumns: ["2019", "2020", "2021", "2022"],
    rowCount: 4, // well under maxCategories: 6
  });
  const { eligible: ok, excluded } = eligible({
    facts: fourSeriesFewCategories,
    channel: "article-web",
  });
  expect(ok.some((c) => c.id === "grouped-bar")).toBe(false);
  const why = excluded.find((e) => e.id === "grouped-bar");
  expect(why?.reason).toMatch(/series/);
  expect(why?.reason).toContain("4");
});

test("real KB: stacked-bar shows the same fix (maxCategories: 8, maxSeries: 5)", () => {
  const sevenCategoriesTwoSeries = deriveFacts({
    columns: ["year", "hydro", "wind"],
    numericColumns: ["hydro", "wind"],
    rowCount: 7, // > maxCategories: 8? no — 7 <= 8, legal; picks a value distinct from grouped-bar's cap
  });
  const { eligible: ok } = eligible({
    facts: sevenCategoriesTwoSeries,
    channel: "article-web",
  });
  expect(ok.some((c) => c.id === "stacked-bar")).toBe(true);
});

// marimekko is `deferred` (Family B) in chart-native's own catalogue, so it never reaches
// renderableSheets() today — same reasoning as the radar/parallel test above: prove the
// mechanics now with a direct pairing, correct the day it goes live.
test("real KB: marimekko (deferred) also counts its series from numeric columns, not rows", () => {
  const marimekko = realPair("marimekko");
  expect(marimekko.sheet.limits).toEqual({ maxSeries: 5, maxCategories: 6 });

  const manyCategoriesFewSeries = deriveFacts({
    columns: ["segment", "urban", "rural"],
    numericColumns: ["urban", "rural"],
    rowCount: 10, // > maxCategories: 6
  });
  const { excluded } = eligible(
    { facts: manyCategoriesFewSeries, channel: "article-web" },
    [marimekko],
  );
  const why = excluded.find((e) => e.id === "marimekko");
  expect(why?.reason).toMatch(/categories/);
  expect(why?.reason).not.toMatch(/series/);
});
