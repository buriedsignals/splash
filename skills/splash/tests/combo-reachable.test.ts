import { describe, it, expect } from "bun:test";
import { validateAccepted } from "../src/validate-gate";
import type { AcceptedProposal } from "../src/producer-spec";

// ---------------------------------------------------------------------------
// ★ combo IS REACHABLE END TO END — the half a render proof cannot show.
//
// Three static/interactive/video renders prove the ENGINE can draw a combo. They say nothing
// about whether a journalist can ever ASK for one: until this branch, `combo` was declared
// `deferred: "family-B: per-series encoding choice"`, and the gate refused any proposal naming
// it BY NAME before the producer was ever reached. A built, guarded, unreachable capability —
// the exact state completeness.test.ts calls out, and the state `pictogram` is still in.
//
// So this asserts the gate's answer, which is the thing that changed, and asserts it in both
// directions: a well-formed combo proposal is ACCEPTED, and a still-deferred sibling is still
// refused with its reason — so a future change that guts the deferred guard cannot make this
// file pass vacuously.
// ---------------------------------------------------------------------------
const comboProposal = (
  spec: Record<string, unknown> = {},
): AcceptedProposal => ({
  id: "marges-2024",
  producer: "chart-native",
  format: "static",
  spec: {
    nativeType: "combo",
    title: "Les ventes ont grimpé toute l'année, mais la marge a fondu",
    unit: "unités vendues par mois et marge brute",
    data: "mois,unites,marge\nJan,1850,31.4\nJun,2910,26.8\nDec,4310,19.7",
    comboLine: "marge",
    comboColumnUnit: "unités",
    comboLineUnit: "%",
    source: { name: "Comptes de gestion Northwind" },
    channel: "article-web",
    lang: "fr",
    altInsight:
      "Les unités vendues passent de 1 850 en janvier à 4 310 en décembre tandis que la marge brute recule de 31,4 % à 19,7 % : l'entreprise vend plus et garde moins sur chaque vente.",
    ...spec,
  },
  confirmedTakeaway:
    "Les unités vendues passent de 1 850 en janvier à 4 310 en décembre tandis que la marge brute recule de 31,4 % à 19,7 % : l'entreprise vend plus et garde moins sur chaque vente.",
  provenance: "table",
  channel: "article-web",
});

describe("an accepted proposal naming `combo` passes the gate", () => {
  it("is accepted — the type is no longer refused by name", () => {
    const out = validateAccepted(comboProposal());
    expect(out).toMatchObject({ ok: true });
  });

  it("is not accepted VACUOUSLY — a still-deferred sibling is refused with its reason", () => {
    // `pictogram` is deliberately still deferred (docs/splash/defect-2026-08-07-…md). If this
    // stopped being refused, the guard above would have stopped meaning anything.
    const out = validateAccepted(
      comboProposal({ nativeType: "pictogram" }),
    ) as { ok: false; errors: string[] };
    expect(out.ok).toBe(false);
    expect(out.errors.join(" ")).toContain("pictogram");
  });
});

describe("the gate refuses the combo shapes that mislead, before anything renders", () => {
  it("refuses a combo that does not say which series is the line", () => {
    const { comboLine: _drop, ...rest } = comboProposal().spec as Record<
      string,
      unknown
    >;
    const out = validateAccepted({
      ...comboProposal(),
      spec: rest,
    }) as { ok: false; errors: string[] };
    expect(out.ok).toBe(false);
    // …and the refusal ASKS: it names the field and both candidate columns.
    const msg = out.errors.join(" ");
    expect(msg).toContain("comboLine");
    expect(msg).toContain("unites");
    expect(msg).toContain("marge");
  });

  it("refuses two series measured in the same unit (the dual-axis abuse)", () => {
    const out = validateAccepted(
      comboProposal({ comboColumnUnit: "%", comboLineUnit: "%" }),
    ) as { ok: false; errors: string[] };
    expect(out.ok).toBe(false);
    expect(out.errors.join(" ")).toContain("same unit");
  });

  it("refuses more than two numeric series rather than silently dropping one", () => {
    const out = validateAccepted(
      comboProposal({
        data: "mois,unites,marge,effectif\nJan,1850,31.4,12\nDec,4310,19.7,15",
      }),
    ) as { ok: false; errors: string[] };
    expect(out.ok).toBe(false);
    expect(out.errors.join(" ")).toContain("exactly two");
  });
});
