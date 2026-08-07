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

// A real KB, spatial-shaped dataset — the eligibility layer never checks geo shape, only the
// numeric limits and format/channel legality, so a plain 2-column dataset is enough to make
// map-native's real sheets (hex-grid, choropleth, cartogram, proportional-symbol…) legal.
function inputForMapSymbolInteractive() {
  return {
    facts: deriveFacts({
      columns: ["city", "population"],
      numericColumns: ["population"],
      rowCount: 10,
    }),
    channel: "article-web" as const,
  };
}

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

// Task 21 — a declared render limit (lib/core/feature-reach.ts, task 19; fed by map-native,
// task 20) travels onto the Candidate that carries it.
it("should carry a measured render limit without changing what is legal", () => {
  const { eligible: legal } = eligible(inputForMapSymbolInteractive());
  const c = legal.find(
    (x) => x.engine === "map-native" && x.format === "interactive",
  );
  expect(c).toBeDefined();
  // declared, NOT marked: eligibility.ts's own imageWalkMark header records that a `missing`
  // readiness makes a form unreachable (rank tier 2 + the 3-row offer cap). A keyboard limit
  // must inform, not remove — decision 5, 2026-07-29.
  expect(c!.readiness).toBeUndefined();
  expect(c!.limits?.join(" ")).toContain("keyboard");
});

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

test("refuses the whole run when its language has no furniture", () => {
  const { eligible: legal, refusal } = eligible({
    ...BASE,
    contentLang: "es",
  });
  expect(legal).toEqual([]);
  expect(refusal ?? "").toContain("es");
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
        reasonCode: "incomplete-install",
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

// THE MARK IMAGE-NATIVE ACTUALLY EARNS — and it is not the one it used to carry.
//
// Until 2026-07-28 every image-scrolly and every scrolly candidate carried "this is the
// whole-article branch — it is not built yet, and it changes what gets delivered". Both halves
// of that sentence were measured false (lib/loop/scrolly-e2e.test.ts walks a scrolly to a
// delivered package), so the branch mark is gone.
//
// image-native keeps a mark, for a reason of its own. Its only format is `scrolly`, and its walk
// is one beat per photograph the journalist declares WITH THE RUN. This file's input is facts +
// channel + readiness + themeBg — `run.input.images` is not among them — so it cannot tell a run
// that HAS declared photographs from one that has none, and offering the form clean to a run with
// none strands it: nextActionsForElement answers `draft-beats`, draftBeats refuses, and
// deadEndReason is consulted only on "choose-form". So it is MARKED, with the sentence that is
// actually true.
test("an image scrolly is marked for the photographs it needs, not for a branch that exists — and marking never removes the form", () => {
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
        reasonCode: "unreachable",
        help: [],
      },
    ],
  });
  const scrolly = ok.find((c) => c.id === "image-scrolly");
  expect(scrolly).toBeDefined(); // still offered…
  // NOT in `requires`: that list is the decor's CAPACITÉ axis (ids a newsroom can turn on), and
  // no newsroom setting declares a photograph. "article-branch" was in it and was satisfiable by
  // nobody — a requirement carried into every manifest that no install could ever meet.
  expect(scrolly!.requires).toEqual(["image-native"]);
  expect(scrolly!.requires).not.toContain("article-branch");
  // worst of {photographs: missing, image-native: unverified} is missing (3 > 1) — the rule this
  // pins, not just image-scrolly's own readiness.
  expect(scrolly!.readiness?.status).toBe("missing");
  // …and the sentence a journalist reads is the one they can act on.
  expect(scrolly!.readiness!.reason).toMatch(/photograph/i);
  expect(scrolly!.readiness!.reason).not.toMatch(/whole-article branch/);
});

// THE MARK IS GONE FOR THE SCROLLY HOST. Measured end to end before it was removed: a chart-track
// scrolly walks produce → capture → review → preview → approve → request-delivery → deliver and is
// handed over as a package holding the produced scrolly.html byte for byte, with an <iframe>
// snippet — the embed genre, the same publishers and the same default destination an interactive
// gets (lib/loop/scrolly-e2e.test.ts).
test("a scrolly form the loop can build is offered CLEAN — no branch mark, on any track", () => {
  const { eligible: legal } = eligible({
    facts: deriveFacts({
      columns: ["year", "extent"],
      numericColumns: ["year", "extent"],
      rowCount: 7,
    }),
    channel: "article-web",
  });
  const scrollies = legal.filter((c) => c.format === "scrolly");
  expect(scrollies.length).toBeGreaterThan(0); // the KB really offers some
  const clean = scrollies.filter((c) => !c.readiness);
  expect(clean.length).toBeGreaterThan(0);
  // Nothing anywhere in the offer still says it, and nothing still requires it.
  for (const c of legal) {
    expect(c.requires ?? []).not.toContain("article-branch");
    expect(c.readiness?.reason ?? "").not.toMatch(/whole-article branch/);
  }
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
    // …and it names what cannot be built. Unconditional now: this used to exempt a form sitting
    // on the "unbuilt article branch", whose mark masked this one. That branch mark is gone, so
    // the wiring reason is the sentence every unbuildable form carries.
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

// A scrolly form the scrolly HOST does not host is marked — and that mark is now the only one a
// scrolly can carry, so it is also the only thing that can be observed through eligible().
//
// The fixture's key moved from "line" to "slope" on 2026-07-28, and the move is the point: while
// the article-branch mark fired on the FORMAT, every scrolly candidate was marked whatever its
// track, so a "line" scrolly (which the host builds perfectly well) read as marked too and this
// test could not tell the two apart. It can now — chart-native builds a slope chart, and the
// scrolly host does not host one at all.
test("a scrolly track the host does not host is MARKED, and the offer says which", () => {
  const sheet = fakeSheet("fx-scrolly", ["scrolly"]);
  // The point of this fixture: chart-native itself IS loop-buildable, so a naive check on
  // c.engine alone would see this candidate as clean. It is the EFFECTIVE producer
  // (scrolly, via producerForFormat) that cannot compose this track.
  expect(isLoopBuildable("chart-native")).toBe(true);
  const { eligible: legal } = eligible(
    { facts: TWO_POINTS, channel: "article-web" },
    [{ sheet, engine: "chart-native", key: "slope" }],
  );
  expect(legal.length).toBe(1);
  expect(legal[0]!.format).toBe("scrolly");
  expect(legal[0]!.readiness?.status).toBe("missing");
  expect(legal[0]!.readiness?.reason).toContain("slope");
  // …and the SAME sheet on a track the host does host is offered clean — which is what makes the
  // assertion above about the track rather than about the format.
  const { eligible: hosted } = eligible(
    { facts: TWO_POINTS, channel: "article-web" },
    [{ sheet, engine: "chart-native", key: "line" }],
  );
  expect(hosted[0]!.readiness).toBeUndefined();
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

// Direct seam on the buildability mark. It used to be MASKED for every scrolly candidate by the
// article-branch mark (same severity, pushed first), which is why this seam had to be tested
// through the exported function rather than through eligible(). That mask is gone — the test
// above now observes the same property through a full eligible() call — and this stays as the
// unit-level probe of the resolution itself, on a fixture eligible() cannot express.
//
// The FIXTURE moved three times, each time because the engine it was pinned on became
// buildable — which is the point of the tranche, not a weakening of this test. It was
// "chart-native" + "scrolly" until task 9 wired the scrolly host (chart-native itself IS
// loop-buildable; its scrolly form was not), then "dw-chart" until task 12 wired the hosted
// chart, then "map-dw" until task 13 wired the hosted map — and now the assembler table covers
// every real engine the KB names, so no real engine is left with an unbuildable static form.
// The fixture moved ONCE more on 2026-07-28, and this time because the redirect itself was
// narrowed: `producerForFormat` used to hand ANY engine's "scrolly" format to the shared host,
// so a fictional engine's scrolly form came back buildable and that asymmetry was the probe.
// It no longer does — the host names the engines it actually hosts (FORMAT_HOST), because the
// unconditional redirect was offering a Datawrapper `d3-bars` scrolly that threw at build.
//
// The property is unchanged and so is the shape of the probe: ONE engine, ONE type, TWO formats,
// two different answers — which can only happen if the resolution goes through the format's
// actual producer rather than through `engine`. chart-native/`slope` is that pair now:
// chart-native builds a slope chart (static), and the SCROLLY host does not host one at all
// (skills/scrolly's chart track is line and bar — a scrolly's captions are the journalist's
// beats, and no other chart type accepts an authored plan).
test("buildabilityMark resolves the EFFECTIVE producer, not the sheet's engine — one engine and type, two formats, two answers", () => {
  expect(buildabilityMark("chart-native", "static", "slope")).toBeNull();
  const scrollyMark = buildabilityMark("chart-native", "scrolly", "slope");
  expect(scrollyMark).not.toBeNull();
  expect(scrollyMark!.reason).toContain("slope");
  // …and an engine the table knows nothing about is still unbuildable in every format, which is
  // what the old fixture asserted on its static half.
  expect(buildabilityMark("crayon", "static")).not.toBeNull();
  expect(buildabilityMark("crayon", "static")!.reason).toContain("crayon");
  expect(buildabilityMark("crayon", "scrolly")).not.toBeNull();
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
        reasonCode: "",
        help: [],
      },
    ],
  });
  // Scoped to the candidates whose winning mark IS the readiness one: this test pins the
  // empty-reason repair, never which mark wins. A candidate carrying a buildability mark is
  // scoped out BY THAT MARK rather than by naming a format — `missing` outranks this `disabled`,
  // so its (also non-empty) sentence is the one that surfaces, and which mark wins there is the
  // subject of "a scrolly track the host does not host is MARKED…" above.
  //
  // Named by the mark, not by the format, because naming formats made this test drift twice:
  // scrolly was excluded by hand, then chart-native/video/dot-strip earned a `missing` mark of
  // its own (skills/chart-native/src/video-reach.ts — the reveal ends before the clip does) and
  // the hand-written exclusion did not cover it. The filter now asks the same question the
  // production code answers, so a new render limit cannot make it red again.
  const marked = ok.filter(
    (c) =>
      c.engine === "chart-native" &&
      buildabilityMark(c.engine, c.format, c.key) == null &&
      c.readiness,
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
    key: sheet.id,
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

// ── The debt imageWalkMark's header named, paid ────────────────────────────────────────────────
// The mark used to be UNCONDITIONAL, and the header spelled out the cost: `missing` is the worst
// of four severities, rank.ts sorts on it, offer.ts caps the offer at three rows — so a newsroom
// that HAD declared its photographs still could not be offered the only format image-native
// builds. Marked meant unreachable, for everyone, always. What made it unconditional was that
// eligible() could not see the run's inputs; `declaredPhotographs` is that fact, in the same sense
// `requestedFormat` already is — counted from what was handed over, never inferred from prose.
describe("image-scrolly is reachable for a run that has photographs", () => {
  const imageFacts = () =>
    deriveFacts({
      columns: ["step", "note", "alt"],
      numericColumns: ["step", "note", "alt"],
      rowCount: 4,
    });

  test("with photographs declared, the form is offered CLEAN — no photographs mark", () => {
    const { eligible: ok } = eligible({
      facts: imageFacts(),
      channel: "article-web",
      declaredPhotographs: 4,
    });
    const scrolly = ok.find((c) => c.id === "image-scrolly");
    expect(scrolly).toBeDefined();
    // The whole point: not merely a softer mark — no photographs mark at all, so it ranks with the
    // ready forms instead of below every one of them.
    expect(scrolly!.readiness?.reason ?? "").not.toMatch(/photograph/i);
  });

  test("with none declared, the mark is exactly what it always was", () => {
    const { eligible: ok } = eligible({
      facts: imageFacts(),
      channel: "article-web",
      declaredPhotographs: 0,
    });
    const scrolly = ok.find((c) => c.id === "image-scrolly");
    expect(scrolly!.readiness?.status).toBe("missing");
    expect(scrolly!.readiness!.reason).toMatch(/photograph/i);
  });

  // Absent must behave as 0, not as "some": a caller that has not been wired yet must keep the old
  // safe behaviour rather than start offering a form that would strand the run.
  test("absent behaves as none — an unwired caller cannot accidentally unlock the form", () => {
    const { eligible: ok } = eligible({
      facts: imageFacts(),
      channel: "article-web",
    });
    const scrolly = ok.find((c) => c.id === "image-scrolly");
    expect(scrolly!.readiness?.status).toBe("missing");
  });
});

// ── the flyover is asked for, never suggested ────────────────────────────────────────────────
describe("cesium-flyover is never proposed from a data profile", () => {
  it("should exclude the flyover, saying it has to be asked for", () => {
    const { eligible: ok, excluded } = eligible({ ...BASE });
    expect(ok.some((c) => c.id === "flyover")).toBe(false);
    expect(excluded.find((e) => e.id === "flyover")?.reason ?? "").toContain(
      "asks for one",
    );
  });

  it("should offer it once the run declares the journalist asked", () => {
    const { eligible: ok } = eligible({ ...BASE, requestedFlyover: true });
    expect(ok.some((c) => c.id === "flyover")).toBe(true);
  });
});
