// A21 — the declared SOURCE CLASS reaches the conformance belt.
//
// lib/core/conformance-l0.ts has read an optional `sourceKind` since the source sub-project
// landed, and nothing under skills/ ever supplied one: every chart was checked on the flat
// historical rule (name required, url optional) whatever its data actually was. These tests pin
// the whole thread — NativeSpec → config → the type guard → checkGlobalConformance →
// conformanceL0 — and pin the opt-in too: a spec that declares no class must produce a config
// byte-identical to what it produced before the field existed.
//
// The class travels ON the `source` object ({ name, url, kind }) rather than as a sibling config
// field, which is why the 26 produce-conformance call sites below are untouched: they already
// pass `source: cfg.source` down.
import { describe, it, expect } from "bun:test";
import { specToNativeConfig, type NativeSpec } from "../src/spec-to-config";
import { checkGlobalConformance } from "../src/core/conformance";
import { runProduceConformance } from "../src/core/produce-conformance";

const TITLE = "Rents rose fastest in the three border communes";

const barSpec: NativeSpec = {
  nativeType: "bar",
  title: TITLE,
  altInsight:
    "Rents in the three border communes rose more than anywhere else in the canton between 2015 and 2024.",
  unit: "monthly rent (CHF)",
  source: { name: "OFS" },
  data: "commune,rent\nAnnemasse,1420\nGaillard,1310\nVétraz,1180",
};

describe("specToNativeConfig — sourceKind threading", () => {
  it("carries the declared class onto the produced config's source object", () => {
    const { config } = specToNativeConfig({ ...barSpec, sourceKind: "public" });
    expect(config.source).toMatchObject({ name: "OFS", kind: "public" });
  });

  it("leaves a spec that declares no class byte-identical — no `kind` key", () => {
    const { config } = specToNativeConfig(barSpec);
    expect("kind" in (config.source as Record<string, unknown>)).toBe(false);
  });
});

describe("checkGlobalConformance — the class decides the source rules", () => {
  const colors = { data: "#009E73", text: ["#1A1A1A"], bg: "#FFFFFF" };

  it("keeps the flat historical rule when no class is declared (url optional)", () => {
    const v = checkGlobalConformance({
      title: TITLE,
      source: { name: "OFS" },
      colors,
    });
    expect(v).toEqual([]);
  });

  it("requires the URL a `public` source owes, once the class is declared", () => {
    const v = checkGlobalConformance({
      title: TITLE,
      source: { name: "OFS", kind: "public" },
      colors,
    });
    expect(v.some((m) => m.includes("missing source URL"))).toBe(true);
  });

  it("refuses a named origin on a `none` source", () => {
    const v = checkGlobalConformance({
      title: TITLE,
      source: { name: "OFS", kind: "none" },
      colors,
    });
    expect(v.some((m) => m.includes('a "none" source names no origin'))).toBe(
      true,
    );
  });
});

describe("produce gate — the class survives the type guard it passes through", () => {
  it("fails a produced chart whose `public` source cites no URL", () => {
    const { type, config } = specToNativeConfig({
      ...barSpec,
      sourceKind: "public",
    });
    const r = runProduceConformance(type, config);
    expect(r.checked).toBe(true);
    expect(r.violations.some((m) => m.includes("missing source URL"))).toBe(
      true,
    );
  });

  it("passes the same chart once the URL is there", () => {
    const { type, config } = specToNativeConfig({
      ...barSpec,
      source: { name: "OFS", url: "https://www.bfs.admin.ch/asset/en/12345" },
      sourceKind: "public",
    });
    const r = runProduceConformance(type, config);
    expect(r.violations).toEqual([]);
  });
});
