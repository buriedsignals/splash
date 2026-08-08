import { describe, it, expect } from "bun:test";
import { validateAccepted } from "../src/validate-gate";
import type { AcceptedProposal } from "../src/producer-spec";
import { NATIVE_TYPES } from "../../chart-native/src/native-types";
import { specToNativeConfig } from "../../chart-native/src/spec-to-config";

// ---------------------------------------------------------------------------
// ★ gantt IS REACHABLE END TO END — the half a render proof cannot show.
//
// Three renders prove the ENGINE can draw a timeline. They say nothing about whether a
// journalist can ever ASK for one: until this branch `gantt` was declared `deferred:
// "family-B: needs start/end intervals"`, and the gate refused any proposal naming it BY NAME
// before the producer was ever reached — a built, guarded, unreachable capability.
//
// Asserted in both directions: a well-formed gantt proposal is ACCEPTED, and a still-deferred
// sibling read FROM THE REGISTRY is still refused with its reason, so a change that guts the
// deferred guard cannot make this file pass vacuously.
// ---------------------------------------------------------------------------
const CSV = `phase,début,fin,chantier
Étude de faisabilité,2023-01,2023-06,Planification
Conception détaillée,2023-05,2023-12,Planification
Acquisition foncière,2024-01,2024-08,Planification
Chantier rive est,2024-06,2026-06,Travaux
Aménagement et remise,2027-06,2028-03,Livraison`;

const TAKEAWAY =
  "Les travaux de la rive est ne démarrent qu'en juin 2024, plus d'un an après la fin de l'étude de faisabilité, et la remise des ouvrages n'intervient qu'en mars 2028.";

const ganttProposal = (
  spec: Record<string, unknown> = {},
): AcceptedProposal => ({
  id: "digues-riverton",
  producer: "chart-native",
  format: "static",
  spec: {
    nativeType: "gantt",
    title: "Les digues de Riverton ne seront pas terminées avant 2028",
    unit: "calendrier du programme de protection contre les crues",
    data: CSV,
    source: { name: "Bureau du programme anti-crues de Riverton" },
    channel: "article-web",
    lang: "fr",
    altInsight: TAKEAWAY,
    ...spec,
  },
  confirmedTakeaway: TAKEAWAY,
  provenance: "table",
  channel: "article-web",
});

describe("an accepted proposal naming `gantt` passes the gate", () => {
  it("the registry no longer declares it deferred", () => {
    const entry = NATIVE_TYPES.find((t) => t.id === "gantt");
    expect(entry).toBeDefined();
    expect(entry!.deferred).toBeUndefined();
  });

  it("is accepted — the type is no longer refused by name", () => {
    const out = validateAccepted(ganttProposal()) as
      { ok: true; warnings: string[] } | { ok: false; errors: string[] };
    const said = out.ok ? out.warnings.join(" ") : out.errors.join(" ");
    expect(out.ok).toBe(true);
    expect(said).not.toContain("is not an offerable");
  });

  it("is not accepted VACUOUSLY — a still-deferred sibling is refused with its reason", () => {
    // The control is READ FROM THE REGISTRY, never named by hand: a hand-named sibling goes
    // red the day it graduates, which is a fact about the world rather than about the guard.
    const stillDeferred = NATIVE_TYPES.find((t) => t.deferred);
    expect(
      stillDeferred,
      "every native type is now reachable — this control has nothing left to prove, and the guard above needs a new one",
    ).toBeDefined();
    const out = validateAccepted(
      ganttProposal({ nativeType: stillDeferred!.id }),
    ) as { ok: false; errors: string[] };
    expect(out.ok).toBe(false);
    expect(out.errors.join(" ")).toContain(stillDeferred!.id);
  });

  it("and the producer reaches a render config instead of throwing", () => {
    const { type, config } = specToNativeConfig(
      ganttProposal().spec as Parameters<typeof specToNativeConfig>[0],
    );
    expect(type).toBe("gantt");
    // The facts the CSV never carried, DERIVED: which columns are the interval (found
    // structurally, under French headers) and the workstreams in first-appearance order.
    expect((config.items as { start: string; end: string }[])[0]).toMatchObject(
      {
        start: "2023-01",
        end: "2023-06",
      },
    );
    expect(config.categories).toEqual([
      "Planification",
      "Travaux",
      "Livraison",
    ]);
  });
});

describe("the gate refuses the gantt shapes that mislead, before anything renders", () => {
  const errorsOf = (spec: Record<string, unknown>) => {
    const out = validateAccepted(ganttProposal(spec)) as {
      ok: false;
      errors: string[];
    };
    expect(out.ok).toBe(false);
    return out.errors.join(" ");
  };

  it("names the row whose interval runs backwards", () => {
    const said = errorsOf({
      data: `phase,début,fin\nAcquisition foncière,2024-08,2024-01\nConception,2023-05,2023-12`,
    });
    expect(said).toContain("Acquisition foncière");
    expect(said).toContain("ends before it starts");
  });

  it("refuses a numeric day/month date instead of picking one of its two readings", () => {
    const said = errorsOf({
      data: `phase,début,fin\nA,03/04/2024,12/09/2024\nB,04/04/2024,13/09/2024`,
    });
    expect(said).toMatch(/START and an END date column|YYYY-MM-DD/);
  });

  it("refuses a CSV with no interval, naming what a gantt needs", () => {
    const said = errorsOf({ data: `phase,budget\nPlanning,120\nTravaux,4200` });
    expect(said).toContain("START and an END");
  });
});
