import { describe, it, expect } from "bun:test";
import { validateAccepted } from "../src/validate-gate";
import type { AcceptedProposal } from "../src/producer-spec";
import { NATIVE_TYPES } from "../../chart-native/src/native-types";

// ---------------------------------------------------------------------------
// ★ combo IS REACHABLE END TO END — the half a render proof cannot show.
//
// Three static/interactive/video renders prove the ENGINE can draw a combo. They say nothing
// about whether a journalist can ever ASK for one: until this branch, `combo` was declared
// `deferred: "family-B: per-series encoding choice"`, and the gate refused any proposal naming
// it BY NAME before the producer was ever reached. A built, guarded, unreachable capability —
// the exact state completeness.test.ts calls out.
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
    // The control is READ FROM THE REGISTRY, never named by hand. This test first pinned
    // `pictogram`, which stopped being deferred hours later on a sibling branch — so the
    // control went red for a fact about the world rather than about the guard, which is the
    // one failure a non-vacuity check must not have. Deriving it means the check keeps meaning
    // something as types graduate, and the day the LAST one graduates it says so out loud
    // rather than passing on a stale name.
    const stillDeferred = NATIVE_TYPES.find((t) => t.deferred);
    expect(
      stillDeferred,
      "every native type is now reachable — this control has nothing left to prove, and the guard above needs a new one",
    ).toBeDefined();
    const out = validateAccepted(
      comboProposal({ nativeType: stillDeferred!.id }),
    ) as { ok: false; errors: string[] };
    expect(out.ok).toBe(false);
    expect(out.errors.join(" ")).toContain(stillDeferred!.id);
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
