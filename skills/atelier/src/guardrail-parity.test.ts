import { describe, expect, it } from "bun:test";
import {
  aspectTypeViolation,
  nativeFurnitureViolations,
  nativeSubjectFitViolation,
  resolveGuardChannel,
  guardrailParityViolations,
} from "./guardrail-parity";
import type { AcceptedProposal } from "./producer-spec";

// ENFORCEMENT SLICE 2 — the deterministic guardrails suggest-chart's eval (scoreSpec)
// applies but that were, until now, NOT re-applied at the produce boundary, so a
// HAND-AUTHORED spec that bypassed suggest-chart could slip them. These pure functions
// are the teeth; validateAccepted throws them at the spine (see validate-gate.test.ts).

describe("aspectTypeViolation — row-driven horizontal type vs portrait/square channel", () => {
  it("flags a row-driven d3-bars on a portrait (social-vertical) channel", () => {
    expect(
      aspectTypeViolation("social-vertical", { type: "d3-bars" }),
    ).not.toBeNull();
  });

  it("flags a row-driven d3-dot-plot on a square (social-feed) channel", () => {
    expect(
      aspectTypeViolation("social-feed", { type: "d3-dot-plot" }),
    ).not.toBeNull();
  });

  it("does NOT flag a fixed-aspect column-chart on the same portrait channel", () => {
    expect(
      aspectTypeViolation("social-vertical", { type: "column-chart" }),
    ).toBeNull();
  });

  it("does NOT flag a row-driven type on the landscape (article-web) channel", () => {
    expect(aspectTypeViolation("article-web", { type: "d3-bars" })).toBeNull();
  });

  it("does NOT flag a map spec — its `type` is not a row-driven chart type", () => {
    expect(
      aspectTypeViolation("social-vertical", { type: "symbol" }),
    ).toBeNull();
  });

  it("does NOT flag a native spec — it carries `nativeType`, not a row-driven DW `type` (native renders to a fixed canvas, no DW row-crop)", () => {
    expect(
      aspectTypeViolation("social-vertical", { nativeType: "bar" }),
    ).toBeNull();
  });
});

describe("nativeFurnitureViolations — title + source name presence (parity with scoreSpec's native branch)", () => {
  it("reports a missing insight title", () => {
    expect(
      nativeFurnitureViolations({ source: { name: "Eurostat" } }).some((v) =>
        /title/.test(v),
      ),
    ).toBe(true);
  });

  it("reports a missing source name", () => {
    expect(
      nativeFurnitureViolations({ title: "A real insight" }).some((v) =>
        /source/.test(v),
      ),
    ).toBe(true);
  });

  it("reports a blank (whitespace-only) title", () => {
    expect(
      nativeFurnitureViolations({ title: "   ", source: { name: "X" } }).length,
    ).toBeGreaterThan(0);
  });

  it("passes a spec that carries both title and source name", () => {
    expect(
      nativeFurnitureViolations({
        title: "A real insight",
        source: { name: "Eurostat" },
      }),
    ).toEqual([]);
  });
});

describe("nativeSubjectFitViolation — blue-family baseColor on a non-water subject", () => {
  it("flags the sky-blue #56B4E9 on a cross-border-commuting subject (the live defect)", () => {
    expect(
      nativeSubjectFitViolation({
        subject: "cross-border commuting",
        baseColor: "#56B4E9",
      }),
    ).not.toBeNull();
  });

  it("flags the default blue #0072B2 on a housing subject", () => {
    expect(
      nativeSubjectFitViolation({
        subject: "housing rents",
        baseColor: "#0072B2",
      }),
    ).not.toBeNull();
  });

  it("does NOT flag blue on a genuinely water/cold subject", () => {
    expect(
      nativeSubjectFitViolation({
        subject: "river flooding",
        baseColor: "#0072B2",
      }),
    ).toBeNull();
  });

  it("does NOT flag a subject-fit amber hue", () => {
    expect(
      nativeSubjectFitViolation({
        subject: "housing rents",
        baseColor: "#E69F00",
      }),
    ).toBeNull();
  });

  it("does NOT flag when baseColor is ABSENT (multi-series/native palette path — produce conformance owns that)", () => {
    expect(nativeSubjectFitViolation({ subject: "housing rents" })).toBeNull();
  });

  it("does NOT flag when no subject is declared", () => {
    expect(nativeSubjectFitViolation({ baseColor: "#0072B2" })).toBeNull();
  });
});

describe("resolveGuardChannel — effective channel for the aspect gate", () => {
  it("uses the AcceptedProposal.channel when present", () => {
    expect(resolveGuardChannel({ channel: "social-vertical", spec: {} })).toBe(
      "social-vertical",
    );
  });

  it("falls back to the spec's own free-text channel when the proposal channel is absent", () => {
    expect(resolveGuardChannel({ spec: { channel: "stories" } })).toBe(
      "social-vertical",
    );
  });

  it("defaults to article-web when neither carries a channel", () => {
    expect(resolveGuardChannel({ spec: {} })).toBe("article-web");
  });
});

describe("guardrailParityViolations — the composed produce-boundary gate", () => {
  const proposal = (extra: Partial<AcceptedProposal>): AcceptedProposal => ({
    id: "x",
    producer: "dw-chart",
    format: "static",
    spec: {},
    ...extra,
  });

  it("flags a hand-authored d3-bars proposal on a portrait channel", () => {
    const r = guardrailParityViolations(
      proposal({
        channel: "social-vertical",
        spec: { type: "d3-bars", title: "t", data: "a,b\n1,2" },
      }),
    );
    expect(r.some((v) => /row-driven/.test(v))).toBe(true);
  });

  it("catches the portrait channel carried ONLY on the dw spec (not on the proposal)", () => {
    const r = guardrailParityViolations(
      proposal({ spec: { type: "d3-bars", channel: "stories" } }),
    );
    expect(r.some((v) => /row-driven/.test(v))).toBe(true);
  });

  it("flags a chart-native proposal missing furniture", () => {
    const r = guardrailParityViolations(
      proposal({
        producer: "chart-native",
        spec: { nativeType: "bar", data: "a,b\n1,2" },
      }),
    );
    expect(r.length).toBeGreaterThan(0);
  });

  it("flags a chart-native proposal on a blue-family hue for a non-water subject", () => {
    const r = guardrailParityViolations(
      proposal({
        producer: "chart-native",
        spec: {
          nativeType: "bar",
          title: "Rents keep climbing",
          source: { name: "OFS" },
          subject: "housing rents",
          baseColor: "#56B4E9",
        },
      }),
    );
    expect(r.some((v) => /blue/.test(v))).toBe(true);
  });

  it("passes a clean dw-chart proposal on the article-web channel", () => {
    expect(
      guardrailParityViolations(
        proposal({
          channel: "article-web",
          spec: { type: "d3-bars", title: "t", data: "a,b\n1,2" },
        }),
      ),
    ).toEqual([]);
  });

  it("passes a clean chart-native proposal", () => {
    expect(
      guardrailParityViolations(
        proposal({
          producer: "chart-native",
          spec: {
            nativeType: "bar",
            title: "Rents keep climbing",
            source: { name: "OFS" },
            subject: "housing rents",
            baseColor: "#E69F00",
          },
        }),
      ),
    ).toEqual([]);
  });
});
