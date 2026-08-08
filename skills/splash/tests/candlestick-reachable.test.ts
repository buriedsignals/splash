import { describe, it, expect } from "bun:test";
import { validateAccepted } from "../src/validate-gate";
import type { AcceptedProposal } from "../src/producer-spec";
import { NATIVE_TYPES } from "../../chart-native/src/native-types";
import { specToNativeConfig } from "../../chart-native/src/spec-to-config";

// ---------------------------------------------------------------------------
// ★ candlestick IS REACHABLE END TO END. Until this branch it was declared `deferred:
// "family-B: needs OHLC"` and the gate refused every proposal naming it, by name — a built,
// guarded, unreachable capability. Asserted in both directions, with the non-vacuity control
// read FROM THE REGISTRY so it keeps meaning something as types graduate.
// ---------------------------------------------------------------------------
const CSV = `Monat,Eröffnung,Hoch,Tief,Schluss
2024-01,5000,5120,4950,5080
2024-02,5080,5150,4980,5010
2024-03,5010,5040,4760,4800
2024-04,4800,4860,4690,4720
2024-11,5200,5260,5120,5170
2024-12,5170,5340,5160,5320`;

const TAKEAWAY =
  "Der Riverton-Composite verlor im März und April fast 300 Punkte und schloss das Jahr mit 5 320 dennoch über seinem Januarstand von 5 000.";

const proposal = (spec: Record<string, unknown> = {}): AcceptedProposal => ({
  id: "riverton-index",
  producer: "chart-native",
  format: "static",
  spec: {
    nativeType: "candlestick",
    title:
      "Der Riverton-Composite holte seine Frühjahrsverluste bis Dezember auf",
    unit: "Riverton Composite, monatlich",
    priceLabel: "Indexstand",
    data: CSV,
    source: { name: "Riverton Composite Index" },
    channel: "article-web",
    lang: "de",
    altInsight: TAKEAWAY,
    ...spec,
  },
  confirmedTakeaway: TAKEAWAY,
  provenance: "table",
  channel: "article-web",
});

describe("an accepted proposal naming `candlestick` passes the gate", () => {
  it("the registry no longer declares it deferred", () => {
    const entry = NATIVE_TYPES.find((t) => t.id === "candlestick");
    expect(entry).toBeDefined();
    expect(entry!.deferred).toBeUndefined();
  });

  it("is accepted — the type is no longer refused by name", () => {
    const out = validateAccepted(proposal()) as
      { ok: true; warnings: string[] } | { ok: false; errors: string[] };
    const said = out.ok ? out.warnings.join(" ") : out.errors.join(" ");
    expect(out.ok).toBe(true);
    expect(said).not.toContain("is not an offerable");
  });

  it("is not accepted VACUOUSLY — a still-deferred sibling is refused with its reason", () => {
    const stillDeferred = NATIVE_TYPES.find((t) => t.deferred);
    expect(
      stillDeferred,
      "every native type is now reachable — this control has nothing left to prove, and the guard above needs a new one",
    ).toBeDefined();
    const out = validateAccepted(
      proposal({ nativeType: stillDeferred!.id }),
    ) as { ok: false; errors: string[] };
    expect(out.ok).toBe(false);
    expect(out.errors.join(" ")).toContain(stillDeferred!.id);
  });

  it("and the producer reaches a render config instead of throwing", () => {
    const { type, config } = specToNativeConfig(
      proposal().spec as Parameters<typeof specToNativeConfig>[0],
    );
    expect(type).toBe("candlestick");
    // Read by the acronym's own order under GERMAN headers — no header word list is involved,
    // which is the whole point — and the reading is then checked against the OHLC invariant.
    expect((config.periods as Record<string, number>[])[0]).toMatchObject({
      open: 5000,
      high: 5120,
      low: 4950,
      close: 5080,
    });
    expect(config.priceLabel).toBe("Indexstand");
  });
});

describe("the gate refuses the candlestick shapes that mislead, before anything renders", () => {
  const errorsOf = (spec: Record<string, unknown>) => {
    const out = validateAccepted(proposal(spec)) as {
      ok: false;
      errors: string[];
    };
    expect(out.ok).toBe(false);
    return out.errors.join(" ");
  };

  it("refuses data that is not OHLC, and says what it is instead", () => {
    const said = errorsOf({
      data: `Monat,Schluss\n2024-01,5000\n2024-02,5080\n2024-03,5010`,
    });
    expect(said).toMatch(/FOUR numeric columns|open, high, low, close/);
  });

  it("names the period whose four numbers cannot be an OHLC bar", () => {
    const said = errorsOf({
      data: `Monat,Eröffnung,Tief,Hoch,Schluss\n2024-01,5000,4950,5120,5080\n2024-03,5010,4760,5040,4800`,
    });
    expect(said).toContain("2024-01");
    expect(said).toContain("not valid OHLC");
  });

  it("refuses an unlabelled price axis — the scale does not start at zero", () => {
    const said = errorsOf({ priceLabel: "" });
    expect(said).toContain("priceLabel");
  });
});
