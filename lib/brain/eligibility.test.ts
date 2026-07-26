// lib/brain/eligibility.test.ts
import { test, expect } from "bun:test";
import { deriveFacts } from "./facts";
import { eligible, buildabilityMark } from "./eligibility";
import type { TypeSheet } from "./typology";
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

test("a form whose engine the loop cannot build through is MARKED, never offered clean", () => {
  const { eligible: ok } = eligible({ ...BASE });
  const unbuildable = ok.filter((c) => !isLoopBuildable(c.engine));
  expect(unbuildable.length).toBeGreaterThan(0); // the KB actually exercises the path
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
test("buildabilityMark resolves the EFFECTIVE producer, not the sheet's engine — a chart-native form in the scrolly format is a scrolly build", () => {
  const mark = buildabilityMark("chart-native", "scrolly");
  expect(mark).not.toBeNull();
  expect(mark!.status).toBe("missing");
  expect(mark!.reason).toContain("scrolly");
});

test("buildabilityMark is null when the loop can already build through the producer", () => {
  expect(buildabilityMark("chart-native", "video")).toBeNull();
});

test("buildabilityMark names the actual unbuildable engine when there is no format redirect", () => {
  const mark = buildabilityMark("map-native", "static");
  expect(mark).not.toBeNull();
  expect(mark!.reason).toContain("map-native");
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

// requestedFormat:"scrolly" on article-web is CHANNEL-legal (article-web allows scrolly), so
// the channel-legality refusal above never fires — but every scrolly candidate is unbuildable
// today (LOOP_BUILDABLE_ENGINES has no scrolly host), which used to leave the offer with rows
// but no refusal: nextActionsForElement would route back to choose-form forever with no verb
// to escape it. The rows stay OFFERED and MARKED (never removed) — this refusal is an
// ADDITIONAL sentence naming the dead end.
test("a requested format that is channel-legal but leaves zero buildable candidates is refused by name too", () => {
  const res = eligible({
    facts: TWO_POINTS,
    channel: "article-web",
    requestedFormat: "scrolly",
  });
  // The rows are NOT removed — every real KB scrolly candidate is still offered, marked.
  expect(res.eligible.length).toBeGreaterThan(0);
  expect(res.eligible.every((c) => c.format === "scrolly")).toBe(true);
  expect(res.refusal).toBeDefined();
  expect(res.refusal).toContain("scrolly");
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
