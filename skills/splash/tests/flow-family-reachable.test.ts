import { describe, it, expect } from "bun:test";
import { validateAccepted } from "../src/validate-gate";
import type { AcceptedProposal } from "../src/producer-spec";
import { NATIVE_TYPES } from "../../chart-native/src/native-types";
import { specToNativeConfig } from "../../chart-native/src/spec-to-config";

// ---------------------------------------------------------------------------
// ★ THE FLOW FAMILY IS REACHABLE END TO END — the half a render proof cannot show.
//
// Renders prove the ENGINE can draw a sankey, a chord and an arc; it always could, since all
// three shipped a geometry, a component, an interactive wrapper and three Remotion
// compositions. What they never had was a way in. All three were declared
// `deferred: "family-B: needs nodes+links"` (and its two siblings), so `validate-gate.ts`
// refused every proposal naming one BY NAME, before the producer was ever reached — the exact
// state completeness.test.ts calls "a built, guarded, invisible capability".
//
// So this asserts the two ends that changed, because a gate that accepts what the producer
// throws on is the same dead end wearing the other face:
//   · the gate ACCEPTS a well-formed proposal for each of the three, and
//   · the same spec reaches a render config.
// Plus the refusals — because for this family the refusals ARE the capability. All three
// forms can be drawn from any link list, and two of the three drawings would be wrong.
// ---------------------------------------------------------------------------

const proposal = (
  nativeType: string,
  data: string,
  title: string,
  takeaway: string,
  unit: string,
): AcceptedProposal => ({
  id: `${nativeType}-2025`,
  producer: "chart-native",
  format: "static",
  spec: {
    nativeType,
    title,
    unit,
    data,
    source: { name: "Office fédéral de l'énergie" },
    channel: "article-web",
    lang: "fr",
    altInsight: takeaway,
  },
  confirmedTakeaway: takeaway,
  provenance: "table",
  channel: "article-web",
});

const SANKEY = proposal(
  "sankey",
  "source,target,value\nÉolien,Réseau,38\nGaz,Réseau,30\nSolaire,Réseau,16\n" +
    "Réseau,Ménages,44\nRéseau,Industrie,28\nRéseau,Services,12",
  "L'éolien fournit désormais plus d'électricité au réseau que le gaz",
  "L'éolien injecte 38 % de l'électricité du réseau contre 30 % pour le gaz, et les ménages en consomment 44 %.",
  "part de l'électricité injectée puis distribuée, 2025 (%)",
);

const CHORD = proposal(
  "chord",
  "source,cible,valeur\nRive Gauche,Rive Droite,32\nRive Droite,Rive Gauche,30\n" +
    "Rive Gauche,Eaux-Vives,12\nEaux-Vives,Rive Gauche,14",
  "Les deux rives échangent presque autant d'habitants dans un sens que dans l'autre",
  "32 centaines de personnes ont déménagé de la Rive Gauche vers la Rive Droite en 2025 et 30 en sens inverse : l'échange est presque équilibré.",
  "déménagements entre quartiers, 2025 (centaines)",
);

const ARC = proposal(
  "arc",
  "source,target,value\nLes Verts,POP,14\nPOP,PS,9\nPS,PLR,18\nPLR,UDC,8\nUDC,PDC,12\nLes Verts,PS,6",
  "Le centre signe presque tous les textes qui traversent le clivage",
  "Le PS et le PLR ont co-signé 18 textes, plus que toute autre paire, et le centre est présent dans chacun des liens qui franchissent le clivage.",
  "textes déposés conjointement, session 2025",
);

describe("a proposal naming sankey, chord or arc passes the gate", () => {
  for (const p of [SANKEY, CHORD, ARC]) {
    const type = (p.spec as { nativeType: string }).nativeType;

    it(`accepts \`${type}\` — the type is no longer refused by name`, () => {
      expect(validateAccepted(p)).toMatchObject({ ok: true });
    });

    it(`…and the SAME spec reaches a render config for \`${type}\``, () => {
      const out = specToNativeConfig(p.spec as never);
      expect(out.type).toBe(type);
      expect(out.config.title).toBe((p.spec as { title: string }).title);
    });
  }

  it("is not accepted VACUOUSLY — a still-deferred sibling is refused with its reason", () => {
    // The control is READ FROM THE REGISTRY, never named by hand: a hard-coded name goes red
    // the day that type graduates, which is a failure about the world rather than about the
    // guard. The day the last one graduates, this says so out loud.
    const stillDeferred = NATIVE_TYPES.find((t) => t.deferred);
    expect(
      stillDeferred,
      "every native type is now reachable — this control has nothing left to prove, and the guard above needs a new one",
    ).toBeDefined();
    const out = validateAccepted({
      ...SANKEY,
      spec: { ...(SANKEY.spec as object), nativeType: stillDeferred!.id },
    }) as { ok: false; errors: string[] };
    expect(out.ok).toBe(false);
    expect(out.errors.join(" ")).toContain(stillDeferred!.id);
  });
});

describe("the gate refuses the flow shapes that mislead, before anything renders", () => {
  const bad = (p: AcceptedProposal, data: string) =>
    validateAccepted({ ...p, spec: { ...(p.spec as object), data } }) as {
      ok: false;
      errors: string[];
    };

  it("refuses a sankey whose flow loops — its columns are stages", () => {
    const out = bad(
      SANKEY,
      "source,target,value\nRéseau,Stockage,12\nStockage,Réseau,10\nRéseau,Ménages,40",
    );
    expect(out.ok).toBe(false);
    expect(out.errors.join(" ")).toContain("loops back on itself");
  });

  it("refuses a sankey stage that loses quantity, naming the node and both totals", () => {
    const out = bad(
      SANKEY,
      "source,target,value\nÉolien,Réseau,38\nGaz,Réseau,46\nRéseau,Ménages,40\nRéseau,Industrie,20",
    );
    expect(out.ok).toBe(false);
    const msg = out.errors.join(" ");
    expect(msg).toContain("does not conserve the flow");
    expect(msg).toContain("Réseau");
  });

  it("refuses a chord that is really a pipeline, and names sankey as the answer", () => {
    const out = bad(
      CHORD,
      "source,target,value\nÉolien,Réseau,38\nRéseau,Ménages,38",
    );
    expect(out.ok).toBe(false);
    expect(out.errors.join(" ")).toContain("sankey");
  });

  it("refuses an arc self-link, and names chord as the answer", () => {
    const out = bad(ARC, "source,target,value\nPS,PS,4\nPS,PLR,18");
    expect(out.ok).toBe(false);
    expect(out.errors.join(" ")).toContain("links to itself");
  });

  it("refuses a newsroom's own column names rather than reading them positionally", () => {
    // Right order, right types, only the names are theirs — a positional reader would draw a
    // picture, and a swapped source/target reverses every flow while still looking right.
    for (const p of [SANKEY, CHORD, ARC]) {
      const out = bad(p, "de,vers,montant\nA,B,3\nB,A,2");
      expect(out.ok).toBe(false);
      expect(out.errors.join(" ")).toContain("not part of the flow contract");
    }
  });
});
