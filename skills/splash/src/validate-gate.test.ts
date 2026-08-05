import { describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateAccepted } from "./validate-gate";
import type { AcceptedProposal } from "./producer-spec";
import { validateChartSpec } from "../../dw-chart/src/chart-spec";
import { nativeSpecErrors } from "../../chart-native/src/spec-to-config";
import { validateMapSpec } from "../../map-dw/src/map-spec";
// NOTE: no side-effect "./register-producers" import here on purpose — validate-gate.ts now
// imports it itself (self-sufficient guard, see its top-of-file comment), so this test exercises
// the same registry state a real caller gets from importing validateAccepted alone.

const base = {
  id: "x",
  format: "static" as const,
  // Gate 1b presence lever: the journalist-confirmed takeaway, required on EVERY
  // proposal — fixtures carry a plausible one so only the dedicated tests exercise
  // its absence.
  confirmedTakeaway: "The confirmed takeaway for this fixture",
};

function accept(
  producer: AcceptedProposal["producer"],
  spec: unknown,
): AcceptedProposal {
  return { ...base, producer, spec };
}

describe("validateAccepted — the spine validation gate", () => {
  it("rejects an invalid dw-chart spec (missing title + data) with errors", () => {
    const r = validateAccepted(accept("dw-chart", { type: "d3-bars" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.length).toBeGreaterThan(0);
  });

  it("accepts a valid dw-chart spec", () => {
    const r = validateAccepted(
      accept("dw-chart", {
        type: "d3-bars",
        title: "Estonia recycles the most packaging waste in Europe",
        intro: "Share of packaging waste recycled (%)",
        subject: "recycling",
        baseColor: "#009E73",
        sort: "desc",
        data: "country,rate\nEstonia,63\nMalta,31",
        source: { name: "Eurostat", url: "https://ec.europa.eu/eurostat" },
        altInsight: "Estonia recycles the most packaging waste in Europe.",
      }),
    );
    expect(r.ok).toBe(true);
  });

  // "sankey" moved out of this test (see "the journalist spine refuses a deferred type by
  // name" below): it is DECLARED in NATIVE_TYPES with a `deferred` reason (family-B, no
  // MAPPERS entry) — the exact case that guard now refuses BY NAME. This test keeps the
  // FALLBACK_TO_DW/UnsupportedNativeType pass-through for a type that is not declared AT
  // ALL (a typo, never in NATIVE_TYPES) — the deferred guard's `declared` check is false for
  // it, so it is untouched, someone else's business (Task 8).
  it("passes a chart-native spec whose type is UNDECLARED (FALLBACK_TO_DW, not a validation failure)", () => {
    const r = validateAccepted(
      accept("chart-native", {
        nativeType: "widget-xyz",
        title: "x",
        source: { name: "s" },
        unit: "u",
        data: "a,b\n1,2",
      }),
    );
    expect(r.ok).toBe(true);
  });

  it("rejects a chart-native spec whose SHAPE is malformed for its mapped type", () => {
    const r = validateAccepted(
      accept("chart-native", {
        nativeType: "bar",
        title: "x",
        source: { name: "s" },
        unit: "u",
        data: "category\nA", // no value column — bad shape for a bar
      }),
    );
    expect(r.ok).toBe(false);
  });

  it("validates a map-native choropleth config", () => {
    const r = validateAccepted(
      accept("map-native", {
        regionKey: "iso",
        valueField: "share",
        rows: [{ iso: "NOR", share: 99 }],
        basemap: "world",
        title: "Nordic countries lead on renewable electricity",
        description: "Share of renewables, 2023",
        source: { name: "Eurostat", url: "https://ec.europa.eu/eurostat" },
      }),
    );
    expect(r.ok).toBe(true);
  });

  it("validates a SYMBOL scrolly via the map-native path (not the choropleth validator)", () => {
    const r = validateAccepted(
      accept("scrolly", {
        type: "symbol",
        points: [{ lon: 2.35, lat: 48.85, value: 100, label: "Paris" }],
        basemap: "world",
        title: "Where the closures hit hardest across France",
        source: { name: "X", url: "https://x" },
      }),
    );
    expect(r.ok).toBe(true);
  });

  it("validates a CHART scrolly via the native path (not the DW ChartSpec validator)", () => {
    const r = validateAccepted(
      accept("scrolly", {
        nativeType: "line",
        title: "How emissions per capita diverged since 1990",
        source: { name: "X" },
        unit: "t CO2",
        data: "year,value\n1990,9\n2020,6",
      }),
    );
    expect(r.ok).toBe(true);
  });

  it("accepts a CHART scrolly whose explicit beats anchor on real data values", () => {
    const r = validateAccepted(
      accept("scrolly", {
        nativeType: "line",
        title: "How emissions per capita diverged since 1990",
        source: { name: "X" },
        unit: "t CO2",
        data: "year,value\n1990,9\n2005,8\n2020,6",
        beats: [
          { x: "1990", xEnd: "2005", text: "The plateau years" },
          { x: "2020", text: "The drop" },
        ],
      }),
    );
    expect(r.ok).toBe(true);
  });

  // S2 flagged fallback: a chart-track scrolly with NO confirmed `beats` gets its
  // narrative auto-picked by data salience — never a hard fail, but never silent either.
  it("WARNS that a CHART scrolly with no confirmed beats used the salience fallback", () => {
    const r = validateAccepted(
      accept("scrolly", {
        nativeType: "line",
        title: "How emissions per capita diverged since 1990",
        source: { name: "X" },
        unit: "t CO2",
        data: "year,value\n1990,9\n2005,8\n2020,6",
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.warnings.join(" ")).toMatch(/auto-picked|salience/i);
  });

  it("does NOT warn when the CHART scrolly beats are journalist-confirmed", () => {
    const r = validateAccepted(
      accept("scrolly", {
        nativeType: "line",
        title: "How emissions per capita diverged since 1990",
        source: { name: "X" },
        unit: "t CO2",
        data: "year,value\n1990,9\n2005,8\n2020,6",
        beats: [
          { x: "1990", xEnd: "2005", text: "The plateau years" },
          { x: "2020", text: "The drop" },
        ],
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.warnings.join(" ")).not.toMatch(/auto-picked|salience/i);
  });

  it("REJECTS a CHART scrolly whose explicit beat anchors a value absent from the data (typo tripwire)", () => {
    const r = validateAccepted(
      accept("scrolly", {
        nativeType: "line",
        title: "How emissions per capita diverged since 1990",
        source: { name: "X" },
        unit: "t CO2",
        data: "year,value\n1990,9\n2020,6",
        beats: [{ x: "2019", text: "no such point" }],
      }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(" ")).toContain("2019");
  });

  it("REJECTS explicit CHART beats on a MAP scrolly track (wrong field — arcBeats is the map override)", () => {
    const r = validateAccepted(
      accept("scrolly", {
        type: "symbol",
        points: [{ lon: 2.35, lat: 48.85, value: 100, label: "Paris" }],
        basemap: "world",
        title: "Where the closures hit hardest across France",
        source: { name: "X", url: "https://x" },
        beats: [{ category: "Paris" }],
      }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(" ")).toMatch(/arcBeats/);
  });

  // S2 — the map scrolly track un-rejected: a journalist-confirmed `arcBeats` claim-arc is
  // accepted and validated (Task 2 wired mapArcErrors INTO validateChoroplethConfig /
  // validateSymbolConfig; validateMapNative dispatches to those), and a map with none gets
  // the same non-blocking salience-fallback flag the chart track already carries.
  it("ACCEPTS a MAP choropleth scrolly with a valid arcBeats claim-arc (region anchored in the data)", () => {
    const r = validateAccepted(
      accept("scrolly", {
        regionKey: "iso",
        valueField: "share",
        rows: [
          { iso: "NOR", share: 99 },
          { iso: "SWE", share: 61 },
          { iso: "FIN", share: 45 },
        ],
        basemap: "world",
        title: "Nordic countries lead on renewable electricity",
        description: "Share of renewables, 2023",
        source: { name: "Eurostat", url: "https://ec.europa.eu/eurostat" },
        arcBeats: [
          { region: "NOR", role: "establish", text: "Norway leads by far" },
          { region: "SWE", role: "build", text: "Sweden is close behind" },
          {
            region: "FIN",
            role: "payoff",
            text: "Finland trails but is rising",
          },
        ],
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.warnings.join(" ")).not.toMatch(/auto-picked|salience/i);
  });

  it("REJECTS a MAP choropleth scrolly's arcBeats when a beat anchors on an unknown region (typo tripwire)", () => {
    const r = validateAccepted(
      accept("scrolly", {
        regionKey: "iso",
        valueField: "share",
        rows: [{ iso: "NOR", share: 99 }],
        basemap: "world",
        title: "Nordic countries lead on renewable electricity",
        description: "Share of renewables, 2023",
        source: { name: "Eurostat", url: "https://ec.europa.eu/eurostat" },
        arcBeats: [{ region: "ZZZ", text: "no such region" }],
      }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(" ")).toContain("ZZZ");
  });

  it("WARNS that a MAP choropleth scrolly with no confirmed arcBeats used the salience fallback", () => {
    const r = validateAccepted(
      accept("scrolly", {
        regionKey: "iso",
        valueField: "share",
        rows: [{ iso: "NOR", share: 99 }],
        basemap: "world",
        title: "Nordic countries lead on renewable electricity",
        description: "Share of renewables, 2023",
        source: { name: "Eurostat", url: "https://ec.europa.eu/eurostat" },
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.warnings.join(" ")).toMatch(/auto-picked|salience/i);
  });

  // route joined ARC_CAPABLE_MAP_TYPES at the GATE level (map-storyboard-and-video-geography's
  // claim-arc, mapArcErrors etc.), but never gained a scrolly host — MAP_SCROLLY_TYPES still has
  // six entries, not seven. A route scrolly used to fall through here as a benign "salience
  // fallback" (this test used to assert ok:true) — accepting a spec that every OTHER layer
  // already refuses (lib/loop/assemble/scrolly.ts by name, produce.mjs's own format refusal),
  // and, worse, silently accepting a CONFIRMED arcBeats plan that would then reach no
  // reader-facing output at all. Refused HERE now, loud, before production — final-review
  // finding "CRITICAL 2".
  // ★ INVERTED 2026-08-04. This test pinned the REFUSAL of a route scrolly, and it was right to:
  // no browser component hosted one, so accepting it meant a journalist's confirmed arcBeats
  // plan reaching no reader-facing output at all. ScrollyRouteMap.tsx hosts it now, so what has
  // to be pinned is the other direction — the gate must not keep refusing a form the engine
  // renders. The gate itself needed no edit: it reads MAP_SCROLLY_TYPES, so it followed the
  // capability the moment the set gained the type. That is the design working.
  it("ACCEPTS a MAP route scrolly — ScrollyRouteMap hosts it, arcBeats or not", () => {
    for (const arcBeats of [
      undefined,
      [
        { region: "FRA", role: "establish", text: "It leaves Paris." },
        { region: "BEL", role: "payoff", text: "It arrives in Brussels." },
      ],
    ]) {
      const r = validateAccepted(
        accept("scrolly", {
          type: "route",
          route: [
            [2.35, 48.85],
            [4.35, 50.85],
          ],
          basemap: "world",
          title: "The route the shipment took",
          description: "Path from Paris to Brussels",
          source: { name: "X", url: "https://x" },
          ...(arcBeats ? { arcBeats } : {}),
        }),
      );
      if (!r.ok)
        expect(r.errors.join(" ")).not.toMatch(/route.*scrolly|scrolly.*route/i);
    }
  });

  it("returns a FAILURE (never a crash) for a producer outside the union", () => {
    const r = validateAccepted({
      ...base,
      producer: "sankey-native" as never,
      spec: {},
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toContain("unknown producer");
  });

  // GUARD 2 — reject placeholder / reserved-domain source URLs (RFC 2606/6761). A
  // fabricated `…example.com` source must fail validation for EVERY producer, before the
  // producer ever runs — the spine is the single mechanical wire point.
  it("REJECTS a dw-chart spec whose source URL is a reserved placeholder domain", () => {
    const r = validateAccepted(
      accept("dw-chart", {
        type: "d3-bars",
        title: "Estonia recycles the most packaging waste in Europe",
        intro: "Share of packaging waste recycled (%)",
        subject: "recycling",
        baseColor: "#009E73",
        sort: "desc",
        data: "country,rate\nEstonia,63\nMalta,31",
        source: { name: "Made up", url: "https://example.com/data" },
        altInsight: "Estonia recycles the most packaging waste in Europe.",
      }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(" ")).toContain("example.com");
  });

  it("REJECTS a map-native config whose source URL uses a reserved TLD", () => {
    const r = validateAccepted(
      accept("map-native", {
        regionKey: "iso",
        valueField: "share",
        rows: [{ iso: "NOR", share: 99 }],
        basemap: "world",
        title: "Nordic countries lead on renewable electricity",
        description: "Share of renewables, 2023",
        source: { name: "Fabricated", url: "https://dataset.test/table" },
      }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(" ")).toContain("test");
  });

  it("REJECTS a chart-native spec whose source URL is localhost", () => {
    const r = validateAccepted(
      accept("chart-native", {
        nativeType: "bar",
        title: "x",
        source: { name: "s", url: "http://localhost:3000/x" },
        unit: "u",
        data: "country,rate\nA,63\nB,31",
      }),
    );
    expect(r.ok).toBe(false);
  });

  it("still ACCEPTS a real, specific source URL (guard does not over-reject)", () => {
    const r = validateAccepted(
      accept("dw-chart", {
        type: "d3-bars",
        title: "Estonia recycles the most packaging waste in Europe",
        intro: "Share of packaging waste recycled (%)",
        subject: "recycling",
        baseColor: "#009E73",
        sort: "desc",
        data: "country,rate\nEstonia,63\nMalta,31",
        source: {
          name: "Eurostat",
          url: "https://ec.europa.eu/eurostat/databrowser/view/env_waspac/default/table",
        },
        altInsight: "Estonia recycles the most packaging waste in Europe.",
      }),
    );
    expect(r.ok).toBe(true);
  });

  it("does NOT reject a name-only source with no URL (the legitimate prose fallback)", () => {
    // GUARD 2 only fires on a PRESENT placeholder URL; a missing URL is handled by the
    // producers' own leniency / Gate 2c, not here — so the honest prose fallback passes.
    const r = validateAccepted(
      accept("chart-native", {
        nativeType: "bar",
        title: "x",
        source: { name: "Figures as reported in this article" },
        unit: "u",
        data: "country,rate\nA,63\nB,31",
      }),
    );
    expect(r.ok).toBe(true);
  });

  // ENFORCEMENT SLICE 2 — the deterministic guardrails that used to live ONLY in
  // suggest-chart's eval (scoreSpec), now re-applied at the spine so a HAND-AUTHORED spec
  // that skipped suggest-chart must clear the same bar. There is no trust boundary
  // (orchestrator == suggest-chart, one LLM), so this is the tractable defense.
  const withChannel = (
    producer: AcceptedProposal["producer"],
    spec: unknown,
    channel: AcceptedProposal["channel"],
  ): AcceptedProposal => ({ ...base, producer, spec, channel });

  it("REJECTS a hand-authored row-driven d3-bars on a portrait (social-vertical) channel", () => {
    const r = validateAccepted(
      withChannel(
        "dw-chart",
        {
          type: "d3-bars",
          title: "Estonia recycles the most packaging waste in Europe",
          subject: "recycling",
          baseColor: "#009E73",
          data: "country,rate\nEstonia,63\nMalta,31",
          altInsight: "Estonia recycles the most packaging waste in Europe.",
        },
        "social-vertical",
      ),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(" ")).toContain("row-driven");
  });

  it("ACCEPTS the SAME otherwise-valid d3-bars on the article-web (landscape) channel", () => {
    const r = validateAccepted(
      withChannel(
        "dw-chart",
        {
          type: "d3-bars",
          title: "Estonia recycles the most packaging waste in Europe",
          subject: "recycling",
          baseColor: "#009E73",
          data: "country,rate\nEstonia,63\nMalta,31",
          altInsight: "Estonia recycles the most packaging waste in Europe.",
          source: { name: "Eurostat" },
        },
        "article-web",
      ),
    );
    expect(r.ok).toBe(true);
  });

  it("catches the portrait channel carried ONLY on the dw spec (not on the proposal)", () => {
    const r = validateAccepted(
      accept("dw-chart", {
        type: "d3-bars",
        title: "Estonia recycles the most packaging waste in Europe",
        subject: "recycling",
        baseColor: "#009E73",
        data: "country,rate\nEstonia,63\nMalta,31",
        altInsight: "Estonia recycles the most packaging waste in Europe.",
        channel: "stories", // free-text portrait channel on the spec itself
      }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(" ")).toContain("row-driven");
  });

  it("REJECTS a chart-native spec that is missing its source name (furniture parity)", () => {
    const r = validateAccepted(
      accept("chart-native", {
        nativeType: "bar",
        title: "Rents keep climbing across the canton",
        unit: "CHF",
        data: "commune,rent\nA,63\nB,31",
      }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(" ")).toContain("source name");
  });

  it("REJECTS a chart-native spec on a blue-family hue for a non-water subject", () => {
    const r = validateAccepted(
      accept("chart-native", {
        nativeType: "bar",
        title: "Cross-border commuting keeps rising",
        source: { name: "OFS" },
        subject: "cross-border commuting",
        baseColor: "#56B4E9", // sky-blue — the live defect
        unit: "commuters",
        data: "year,commuters\n2019,63\n2024,90",
      }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(" ")).toContain("blue");
  });

  it("ACCEPTS a clean chart-native spec (subject-fit hue, title + source present)", () => {
    const r = validateAccepted(
      accept("chart-native", {
        nativeType: "bar",
        title: "Cross-border commuting keeps rising",
        source: { name: "OFS" },
        subject: "cross-border commuting",
        baseColor: "#D55E00", // vermilion — a subject-fit flow hue
        unit: "commuters",
        data: "year,commuters\n2019,63\n2024,90",
      }),
    );
    expect(r.ok).toBe(true);
  });

  // GATE 1b PRESENCE LEVER — every accepted proposal must carry the takeaway the
  // journalist confirmed at CADRAGE Gate 1b, VERBATIM, as `confirmedTakeaway`. The
  // semantic match (does the title really carry it?) is the render-review's job, but the
  // PRESENCE of a confirmed takeaway is mechanical: a proposal without one cannot prove
  // Gate 1b ever fired — and Gate 1b is un-skippable on BOTH branches (guided AND direct),
  // so the field is required on ALL proposals.
  describe("confirmedTakeaway (Gate 1b presence lever)", () => {
    const validNativeSpec = {
      nativeType: "bar",
      title: "Cross-border commuting keeps rising",
      source: { name: "OFS" },
      subject: "cross-border commuting",
      baseColor: "#D55E00",
      unit: "commuters",
      data: "year,commuters\n2019,63\n2024,90",
    };

    it("REJECTS a proposal with NO confirmedTakeaway (Gate 1b never proven)", () => {
      const { confirmedTakeaway: _omitted, ...rest } = accept(
        "chart-native",
        validNativeSpec,
      );
      const r = validateAccepted(rest as AcceptedProposal);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.errors.join(" ")).toContain("confirmedTakeaway");
    });

    it("REJECTS a proposal whose confirmedTakeaway is whitespace-only", () => {
      const r = validateAccepted({
        ...accept("chart-native", validNativeSpec),
        confirmedTakeaway: "   ",
      });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.errors.join(" ")).toContain("confirmedTakeaway");
    });

    it("REJECTS a non-string confirmedTakeaway smuggled through untyped JSON", () => {
      const r = validateAccepted({
        ...accept("chart-native", validNativeSpec),
        confirmedTakeaway: true as unknown as string, // hand-authored accepted.json
      });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.errors.join(" ")).toContain("confirmedTakeaway");
    });

    it("ACCEPTS the same proposal once confirmedTakeaway carries the confirmed claim", () => {
      const r = validateAccepted({
        ...accept("chart-native", validNativeSpec),
        confirmedTakeaway:
          "Cross-border commuting keeps rising, and Geneva absorbs most of it",
      });
      expect(r.ok).toBe(true);
    });

    // GUARD 3b — duplicate tripwire. The Wave-9 shipped miss: one combined takeaway
    // string stamped byte-identically onto several accepted elements, diluting each
    // Gate-3a title check. Byte-identical `confirmedTakeaway` across two proposals of
    // a multi-element batch is a validation failure; a single element is unaffected.
    describe("duplicate confirmedTakeaway across a multi-element batch", () => {
      const el = (id: string, takeaway: string) => ({
        ...accept("chart-native", validNativeSpec),
        id,
        confirmedTakeaway: takeaway,
      });

      it("REJECTS two proposals carrying the byte-identical confirmedTakeaway", () => {
        const stamped =
          "Both at once: the price cooldown AND the commuting plateau";
        const batch = [el("a", stamped), el("b", stamped)];
        const r = validateAccepted(batch[0], batch);
        expect(r.ok).toBe(false);
        if (!r.ok) {
          expect(r.errors.join(" ")).toContain("confirmedTakeaway");
          expect(r.errors.join(" ")).toContain('"b"');
        }
      });

      it("ACCEPTS a multi-element batch whose takeaways are each element's OWN claim", () => {
        const batch = [
          el("a", "The price cooldown is real"),
          el("b", "Cross-border commuting has plateaued"),
        ];
        expect(validateAccepted(batch[0], batch).ok).toBe(true);
        expect(validateAccepted(batch[1], batch).ok).toBe(true);
      });

      it("leaves a single-element batch unaffected", () => {
        const batch = [el("only", "The price cooldown is real")];
        expect(validateAccepted(batch[0], batch).ok).toBe(true);
      });

      it("does not double-report when the takeaway is MISSING (GUARD 3 owns absence)", () => {
        const { confirmedTakeaway: _omitted, ...rest } = accept(
          "chart-native",
          validNativeSpec,
        );
        const one = rest as AcceptedProposal;
        const two = { ...one, id: "y" };
        const r = validateAccepted(one, [one, two]);
        expect(r.ok).toBe(false);
        if (!r.ok)
          expect(
            r.errors.filter((e) => e.includes("confirmedTakeaway")),
          ).toHaveLength(1);
      });
    });
  });
});

describe("the journalist spine refuses a deferred type by name", () => {
  // `multiple-lines` EXISTS in CHART_TYPES (chart-spec.ts) — the engine validator is right
  // to accept it. It is marked deferred in the manifest (dw-chart/src/manifest.ts) because no
  // KB sheet models it, and `deferred` was consulted by no validator. A journalist must never
  // receive a type the KB does not model.
  // `multiple-lines` is also a MULTI_SERIES_TYPES entry (chart-spec.ts), which requires >=3
  // data columns — a 2-column fixture would fail validateChartSpec on shape alone, which
  // would mask the guard under test; the fixture below carries 3 columns so the ONLY thing
  // that can fail it is the deferred-type guard.
  const multipleLinesSpec = {
    type: "multiple-lines",
    title: "T",
    data: "category,seriesA,seriesB\n2020,1,2\n2021,3,4",
    altInsight: "a",
    source: { name: "S" },
  };

  it("should refuse a dw-chart proposal for a deferred type", () => {
    const out = validateAccepted({
      ...accept("dw-chart", multipleLinesSpec),
      channel: "article-web",
    });
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.errors.join(" ")).toContain("multiple-lines");
      // the manifest's own prose reason, not a maintainer's paraphrase
      expect(out.errors.join(" ")).toContain("small-multiples");
    }
  });

  // Regression for the fail-open bug a reviewer proved by measurement: a FRESH process that
  // imports ONLY validate-gate.ts (never adapters.ts, never register-producers.ts directly)
  // must still refuse the deferred spec. Before validate-gate.ts imported "./register-producers"
  // itself, this exact scenario returned {"ok":true, ...} — the guard silently passed the very
  // spec it exists to refuse, because engineTypes("dw-chart") read an empty, never-populated
  // registry. A same-process unit test cannot catch this (module caching means once ANY earlier
  // test in the same bun process has imported the manifests, the registry looks populated no
  // matter what this file imports) — it requires a genuinely separate process, so this spawns
  // one.
  it("should refuse the deferred spec even from a process that imports validate-gate.ts alone", () => {
    const dir = mkdtempSync(join(tmpdir(), "validate-gate-fresh-process-"));
    const scriptPath = join(dir, "probe.mjs");
    const validateGatePath = join(import.meta.dir, "validate-gate.ts");
    const proposal = {
      id: "x",
      producer: "dw-chart",
      format: "static",
      confirmedTakeaway: "The confirmed takeaway for this fixture",
      channel: "article-web",
      spec: multipleLinesSpec,
    };
    const script =
      `import { validateAccepted } from ${JSON.stringify(validateGatePath)};\n` +
      `const out = validateAccepted(${JSON.stringify(proposal)});\n` +
      `console.log(JSON.stringify(out));\n`;
    writeFileSync(scriptPath, script);
    const stdout = execFileSync("bun", [scriptPath], { encoding: "utf8" });
    const out = JSON.parse(stdout) as
      { ok: true; warnings: string[] } | { ok: false; errors: string[] };
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.errors.join(" ")).toContain("multiple-lines");
  });

  it("should leave the ENGINE validator's maintainer door open", () => {
    // Same spec, straight to the engine: still accepted. That door is declared
    // (dw-chart/src/manifest.ts) and is deliberately kept.
    const r = validateChartSpec(multipleLinesSpec);
    expect(r.ok).toBe(true);
  });

  it("should pass a non-deferred type through unchanged", () => {
    const out = validateAccepted({
      ...accept("dw-chart", {
        type: "d3-lines",
        title: "T",
        data: "a,b\n1,2",
        altInsight: "a",
        source: { name: "S" },
      }),
      channel: "article-web",
    });
    expect(out.ok).toBe(true);
  });

  // The guard reads the shared registry (lib/core/registry.ts), not a dw-chart special case —
  // it refuses a declared-deferred type on every engine whose manifest DECLARES one, across
  // all three field names the codebase's spec shapes actually use (`nativeType`, `type`,
  // `mapType` — see deferredTypeError's own comment). chart-native's own family-B entries
  // (native-types.ts) are declared with a `deferred` reason and no MAPPERS implementation
  // ("sankey": "family-B: needs nodes+links") — the same shape of fact dw-chart's
  // NOT_KB_MODELED table states, on a different engine. `scrolly` is NOT a fourth engine to
  // cover here: its manifest declares no `types` of its own on purpose (registry.ts's own
  // "Absent/empty ⇒ the engine owns no type of its own") — a scrolly proposal's real type
  // lives on its HOST engine's spec, dispatched by producer, not read through `producer:
  // "scrolly"`.
  it("should refuse a chart-native proposal for a declared, deferred nativeType (family-B)", () => {
    const out = validateAccepted({
      ...accept("chart-native", {
        nativeType: "sankey",
        title: "x",
        source: { name: "s" },
        unit: "u",
        data: "a,b\n1,2",
      }),
      channel: "article-web",
    });
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.errors.join(" ")).toContain("sankey");
      expect(out.errors.join(" ")).toContain("family-B");
    }
  });

  it("should leave chart-native's own maintainer door open for the same type", () => {
    // nativeSpecErrors/specToNativeConfig are UNCHANGED by this task (the decision's whole
    // point) — a maintainer calling the engine directly still gets the FALLBACK_TO_DW pass,
    // not a validation error.
    const errors = nativeSpecErrors({
      nativeType: "sankey",
      title: "x",
      source: { name: "s" },
      unit: "u",
      data: "a,b\n1,2",
    });
    expect(errors).toEqual([]);
  });

  // map-dw keys its type on `mapType`, a THIRD field name distinct from `type`/`nativeType` —
  // this is the field the extraction must ALSO read for the guard to be genuinely
  // engine-agnostic rather than only covering the two engines its original test happened to
  // exercise. `"symbol"` is map-dw's one declared-deferred entry (manifest.ts), reason:
  // "not producible — DW symbol maps are hover-only; route to map-native".
  const symbolSpec = {
    mapType: "symbol",
    basemap: "world",
    latColumn: "lat",
    lonColumn: "lon",
    sizeColumn: "value",
    data: "lat,lon,value\n48.85,2.35,100\n51.5,-0.12,80",
    title: "T",
    altInsight: "a",
    source: { name: "S" },
  };

  it("should refuse a map-dw proposal for a deferred mapType (symbol), via the GUARD specifically", () => {
    const out = validateAccepted({
      ...accept("map-dw", symbolSpec),
      channel: "article-web",
    });
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.errors.join(" ")).toContain("symbol");
      // the manifest's own prose reason, naming the redirect
      expect(out.errors.join(" ")).toContain("map-native");
      // Distinguishes the GUARD's refusal from validateMapSpec's OWN unconditional symbol
      // rejection (map-spec.ts:433-435, "symbol maps are not producible by map-dw: ...") —
      // map-dw is the one engine here where the underlying validator ALSO always fails this
      // spec, so an assertion on `ok === false` alone would stay green even with the guard
      // deleted. `"is not an offerable"` is the guard's own wording (deferredTypeError), never
      // produced by validateMapSpec — this is what actually reddens under mutation.
      expect(out.errors.join(" ")).toContain("is not an offerable");
    }
  });

  it("has NO maintainer door for map-dw symbol — unlike dw-chart/chart-native, the engine's own validator ALSO rejects it unconditionally", () => {
    // Confirms map-dw's `symbol` is architecturally different from the other two engines'
    // deferred types: there is no direct-engine-call escape hatch to prove stays open, because
    // none exists. validateMapSpec's own symbol branch pushes this error for every symbol
    // spec, well-formed or not (map-spec.ts:433-435) — the guard above changes WHEN this spec
    // is refused (earlier, with a more useful message), never WHETHER a real capability is
    // lost.
    const r = validateMapSpec(symbolSpec);
    expect(r.ok).toBe(false);
    if (!r.ok)
      expect(r.errors.join(" ")).toContain("symbol maps are not producible");
  });

  it("should pass a non-deferred map-dw mapType through unchanged", () => {
    const out = validateAccepted({
      ...accept("map-dw", {
        mapType: "choropleth",
        basemap: "world-2019",
        mapKeyAttr: "DW_NAME",
        regionKey: "region",
        valueColumn: "value",
        data: "region,value\nNord,42\nSud,12\n",
        title: "Unemployment by region",
        altInsight: "Unemployment peaks at 42% in the north.",
        source: { name: "S" },
      }),
      channel: "article-web",
      confirmedTakeaway: "Unemployment peaks at 42% in the north",
    });
    expect(out.ok).toBe(true);
  });
});

describe("an unknown nativeType is not a silent pass (Task 8)", () => {
  // Fixture element carrying the failure: "bra" is a typo for "bar" — it is not in
  // NATIVE_TYPES at all (undeclared), so deferredTypeError's `declared` check is false and
  // this is entirely validateNative's business, never task 7's deferred-type refusal.
  it("should warn, naming the type and the fallback it takes", () => {
    const out = validateAccepted(
      accept("chart-native", {
        nativeType: "bra", // a typo for "bar"
        title: "T",
        data: "a,b\n1,2",
        altInsight: "a",
        source: { name: "S" },
      }),
    );
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.warnings.join(" ")).toContain("bra");
      expect(out.warnings.join(" ")).toContain("Datawrapper");
    }
  });

  // GREEN PATH — the mutation this guard must never cause: a normal, KNOWN nativeType (the
  // healthy path every real chart-native proposal takes) must produce NO warning at all. A
  // warning that fires on every run trains people to ignore it. `skillsInvoked` is set here
  // (unlike most fixtures in this file) to suppress the unrelated GUARD-5 observability
  // warning, so the empty-array assertion below is isolated to THIS guard, not a coincidence
  // of which other warnings happen not to fire.
  it("does NOT warn on a normal, known nativeType (the healthy path)", () => {
    const out = validateAccepted({
      ...accept("chart-native", {
        nativeType: "bar",
        title: "T",
        data: "category,value\nA,1\nB,2",
        altInsight: "a",
        source: { name: "S" },
      }),
      skillsInvoked: ["splash:cadrage-direct"],
    });
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.warnings).toEqual([]);
  });

  // The gap Task 7 left open, ADJUDICATED here with a measurement (not assumed): a scrolly
  // proposal carries its chart type on `spec.nativeType`, but `deferredTypeError` (Task 7)
  // keys its `declared` check on `engineTypes(p.producer)`, and `engineTypes("scrolly")` is
  // EMPTY by design (registry.ts — scrolly owns no type of its own) — so a scrolly whose
  // underlying chart type is DEFERRED (declared, family-B, no MAPPERS entry — "sankey" is
  // chart-native's own family-B example, same as the "should refuse a chart-native proposal
  // for a declared, deferred nativeType" test above) sails past task 7's guard untouched.
  // Measured on the unpatched base (probe script, see task-8-report.md): that scrolly
  // returned `{ok: true, warnings: [...only the unrelated skillsInvoked warning...]}` —
  // completely silent about "sankey". After this task's fix, validateScrolly's chart track
  // calls validateNative (same function as the top-level chart-native producer; scrolly does
  // NOT have its own copy), and specToNativeConfig throws UnsupportedNativeType for "sankey"
  // exactly as it does for a genuine typo (no MAPPERS entry either way) — so THIS guard now
  // fires and the silence is closed to a WARNING (verdict (a); it does not upgrade to task 7's
  // hard refusal — a scrolly-embedded deferred type is not currently pinnable to that harder
  // path without teaching deferredTypeError to look inside `producer: "scrolly"` specs, which
  // is explicitly out of scope per this task's brief and per the "scrolly is NOT a fourth
  // engine to cover" note above).
  it("ADJUDICATION: closes the scrolly gap — a scrolly with a deferred chart nativeType now WARNS instead of passing in total silence", () => {
    const out = validateAccepted(
      accept("scrolly", {
        nativeType: "sankey",
        title: "x",
        source: { name: "s" },
        unit: "u",
        data: "a,b\n1,2",
      }),
    );
    // Still NOT a hard refusal (task 7's guard does not see it — see comment above); the gap
    // is closed from "total silence" to "warned", not upgraded to an error.
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.warnings.join(" ")).toContain("sankey");
      // Scrolly does NOT have an automatic Datawrapper fallback, so the warning must NOT claim one
      expect(out.warnings.join(" ")).not.toContain(
        "routed to Datawrapper instead",
      );
      // The warning should instead describe the actual constraint
      expect(out.warnings.join(" ")).toContain("do not have an automatic");
    }
  });

  // Regression: the chart-native path still gets the Datawrapper fallback wording
  it("the chart-native path still promises an automatic Datawrapper fallback for an unknown type", () => {
    const out = validateAccepted(
      accept("chart-native", {
        nativeType: "bra", // a typo for "bar"
        title: "T",
        data: "a,b\n1,2",
        altInsight: "a",
        source: { name: "S" },
      }),
    );
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.warnings.join(" ")).toContain("bra");
      expect(out.warnings.join(" ")).toContain("routed to Datawrapper instead");
    }
  });
});
