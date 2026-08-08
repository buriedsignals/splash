// END-TO-END: the refusal a real newsroom met is gone, and what replaced it PRODUCES.
//
// On 2026-08-07 a journalist (Heidi.news, JO Milan Cortina) named « pictogramme » on the
// DIRECT branch and the gate refused it by name — correctly, because the type was declared
// `deferred` and had no mapper. The refusal was never the defect; the missing capability was
// (docs/splash/defect-2026-08-07-pictogram-unreachable-from-spec-chain.md).
//
// This test is the pair of that one: the same shape of proposal must now pass the gate AND
// reach a concrete render config. It asserts on BOTH ends deliberately — a gate that accepts
// a type the producer then throws `UnsupportedNativeType` on is the SAME dead end wearing the
// opposite face (the run would exit FALLBACK_TO_DW onto an engine that has no pictogram
// either), and only one of the two ends is visible from each side.
import { describe, it, expect } from "bun:test";
import { validateAccepted } from "./validate-gate";
import {
  specToNativeConfig,
  type NativeSpec,
} from "../../chart-native/src/spec-to-config";
import { engineTypes } from "../../../lib/core/registry";
import "./register-producers";

const spec: NativeSpec = {
  nativeType: "pictogram",
  title: "Two districts took nearly all the new transit passes",
  source: { name: "Riverton transit authority", url: "https://data.riverton.gov/transit-pass" },
  unit: "residents who switched to the pass",
  altInsight:
    "Downtown drew 84,000 residents onto the pass, more than nine times the suburbs' 9,000.",
  data:
    "district,residents\nDowntown,84000\nRiverside,56000\nOld Town,38000\nHillcrest,22000\nSuburbs,9000",
};

describe("a proposal naming pictogram is offerable, and produces", () => {
  it("the registry no longer declares it deferred", () => {
    const entry = engineTypes("chart-native").find((t) => t.id === "pictogram");
    expect(entry).toBeDefined();
    expect(entry!.deferred).toBeUndefined();
  });

  it("the gate ACCEPTS it — the named refusal is gone", () => {
    const out = validateAccepted({
      id: "x",
      producer: "chart-native",
      format: "static",
      channel: "article-web",
      // Gate 1b's presence lever, carried by every real proposal
      confirmedTakeaway:
        "Downtown took nearly all the new passes; the suburbs barely moved",
      spec,
    } as Parameters<typeof validateAccepted>[0]);
    expect(out.ok).toBe(true);
    // and specifically: nothing left in the outcome still names the type or the old refusal
    const said = out.ok ? out.warnings.join(" ") : out.errors.join(" ");
    expect(said).not.toContain("pictogram");
    expect(said).not.toContain("is not an offerable");
  });

  it("and the producer reaches a render config instead of throwing", () => {
    const { type, config } = specToNativeConfig(spec);
    expect(type).toBe("pictogram");
    // the one fact the CSV never carried, now decided rather than missing
    expect(config.unitPerIcon).toBe(10_000);
    expect(config.iconNoun).toBe("residents");
  });
});
