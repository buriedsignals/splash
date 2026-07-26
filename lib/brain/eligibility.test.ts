// lib/brain/eligibility.test.ts
import { test, expect } from "bun:test";
import { deriveFacts } from "./facts";
import { eligible } from "./eligibility";
import type { TypeSheet } from "./typology";
import type { VisualFormat } from "../core/vocabulary";
// renderableSheets() only sees a type once its engine has self-registered into
// lib/core/registry — the same side-effect import lib/brain/typology-drift.test.ts uses.
// eligibility.ts itself stays engine-agnostic; the composition root (or, here, the test) is
// what makes the registry non-empty.
import "../loop/engines";
import { isLoopBuildable } from "../loop/buildable";

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
  // image-scrolly: formats=[scrolly] (killed by social-vertical, which allows neither
  // scrolly nor interactive) AND limits minPoints:3 (also killed by TWO_POINTS' points:2).
  // Channel-format is checked first — the journalist reads the channel-agnostic reason,
  // not the data-specific one that happened to also apply.
  const { excluded } = eligible({
    facts: TWO_POINTS,
    channel: "social-vertical",
  });
  const why = excluded.find((e) => e.id === "image-scrolly");
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
    expect(c.readiness!.reason).toContain(c.engine); // names what cannot be built
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
  const marked = ok.filter((c) => c.engine === "chart-native" && c.readiness);
  expect(marked.length).toBeGreaterThan(0); // the fixture actually exercised the path
  for (const c of marked) {
    expect(c.readiness!.reason.length).toBeGreaterThan(0);
    expect(c.readiness!.reason).toMatch(/Charts built in-house/);
  }
  // …and no mark anywhere is wordless.
  for (const c of ok) if (c.readiness) expect(c.readiness.reason).not.toBe("");
});
