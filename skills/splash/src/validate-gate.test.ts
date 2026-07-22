import { describe, expect, it } from "bun:test";
import { validateAccepted } from "./validate-gate";
import type { AcceptedProposal } from "./producer-spec";

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

  it("passes a chart-native spec whose type is UNMAPPED (FALLBACK_TO_DW, not a validation failure)", () => {
    const r = validateAccepted(
      accept("chart-native", {
        nativeType: "sankey",
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

  // Guard the deferral — route/cartogram (and the other non-workhorse map types) do not
  // support an arcBeats override yet, so a config with no arcBeats must NOT be flagged
  // with the salience-fallback warning (there is no override to confirm instead).
  it("does NOT warn on a MAP route scrolly with no arcBeats (route doesn't support an override yet)", () => {
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
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.warnings.join(" ")).not.toMatch(/auto-picked|salience/i);
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
