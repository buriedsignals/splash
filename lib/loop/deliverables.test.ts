import { test, expect, describe, it } from "bun:test";
import {
  deliverableRequestFrom,
  planDeliverables,
  confirmAspect,
  deliverablePlan,
  type DeliverableChoice,
} from "./deliverables";
import {
  channelForElement,
  assertInvariants,
  nextActionsForElement,
  type RunManifest,
} from "./manifest";

function base(): RunManifest {
  return {
    runId: "r1",
    schemaVersion: 4,
    route: "embed",
    channel: "article-web",
    input: { data: { path: "input/data.csv", sha256: "a".repeat(64) } },
    orient: {
      profile: {
        columns: ["c", "2015", "2024"],
        numericColumns: ["2015", "2024"],
        rowCount: 3,
      },
      supportsPoint: true,
    },
    elements: [
      {
        id: "e1",
        angle: {
          confirmedTakeaway: "Geneva rents rose fastest",
          altInsight: "alt",
          unit: "CHF",
        },
      },
    ],
    events: [],
  };
}

function plan(...choices: DeliverableChoice[]): RunManifest {
  const r = planDeliverables(base(), choices);
  if (!r.ok) throw new Error(`plan refused: ${r.message}`);
  return r.value;
}

describe("stage 1 — the four CADRAGE choices become typed requests", () => {
  it("maps each choice onto a destination, and only pins a format where the choice IS one", () => {
    expect(deliverableRequestFrom("web")).toEqual({
      destination: "article-web",
    });
    expect(deliverableRequestFrom("video")).toEqual({
      destination: "article-web",
      requestedFormat: "video",
    });
    // Social's aspect is absent on purpose — it is stage 3's question, not stage 1's.
    expect(deliverableRequestFrom("social")).toEqual({ destination: "social" });
    expect(deliverableRequestFrom("print")).toEqual({
      destination: "print",
      requestedFormat: "static",
    });
  });
});

describe("stage 2 — the production plan, for every combination the issue names", () => {
  it("web only — one deliverable, on the element that was already there", () => {
    const run = plan("web");
    expect(run.elements).toHaveLength(1);
    expect(run.elements[0]!.id).toBe("e1");
    expect(run.elements[0]!.deliverable).toEqual({
      destination: "article-web",
    });
    expect(run.elements[0]!.requestedFormat).toBeUndefined();
  });

  it("video only — nothing web is produced, because no web deliverable exists", () => {
    const run = plan("video");
    expect(run.elements).toHaveLength(1);
    expect(run.elements[0]!.requestedFormat).toBe("video");
    expect(run.elements.some((el) => el.requestedFormat !== "video")).toBe(
      false,
    );
  });

  it("web + video — both, with the web version first as the editorial master", () => {
    const run = plan("video", "web"); // asked in the other order on purpose
    expect(run.elements.map((el) => el.requestedFormat)).toEqual([
      undefined,
      "video",
    ]);
    expect(run.elements[1]!.deliverableOf).toBe("e1");
  });

  it("social + web — two deliverables, and the social one still owes its aspect", () => {
    const run = plan("social", "web");
    expect(run.elements).toHaveLength(2);
    const [web, social] = run.elements;
    expect(web!.deliverable!.destination).toBe("article-web");
    expect(social!.deliverable).toEqual({ destination: "social" });
    expect(channelForElement(run, web!)).toBe("article-web");
  });

  it("print + web — print is a first-class deliverable, pinned static", () => {
    const run = plan("web", "print");
    const print = run.elements.find(
      (el) => el.deliverable?.destination === "print",
    )!;
    expect(print).toBeDefined();
    expect(print.requestedFormat).toBe("static");
    expect(channelForElement(run, print)).toBe("print-page");
  });

  it("all four at once — four deliverables, none merged, none lost", () => {
    const run = plan("web", "video", "social", "print");
    expect(run.elements).toHaveLength(4);
    expect(new Set(run.elements.map((el) => el.id)).size).toBe(4);
  });
});

describe("what a plan refuses to do", () => {
  it("refuses an empty plan instead of quietly producing nothing", () => {
    const r = planDeliverables(base(), []);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/at least one deliverable/i);
  });

  it("asking for the same output twice yields one deliverable, not two", () => {
    const run = plan("social", "social", "web", "web");
    expect(run.elements).toHaveLength(2);
  });

  it("refuses a run with no element to hang the plan on", () => {
    const r = planDeliverables({ ...base(), elements: [] }, ["web"]);
    expect(r.ok).toBe(false);
  });

  it("refuses a source element that is not in the run", () => {
    const r = planDeliverables(base(), ["web"], { sourceElementId: "nope" });
    expect(r.ok).toBe(false);
  });
});

describe("what siblings share, and what they must not", () => {
  it("every deliverable carries the SAME confirmed takeaway", () => {
    const run = plan("web", "social", "print");
    const takeaways = new Set(
      run.elements.map((el) => el.angle?.confirmedTakeaway),
    );
    expect(takeaways).toEqual(new Set(["Geneva rents rose fastest"]));
  });

  it("no sibling inherits an offer, a chosen form or an artifact from the master", () => {
    const seeded = base();
    seeded.elements[0] = {
      ...seeded.elements[0]!,
      proposal: {
        options: [
          {
            id: "slope",
            nativeType: "slope",
            engine: "chart-native",
            format: "interactive",
            why: "w",
          },
        ],
        excluded: [],
        chosenId: "slope",
      },
      artifact: {
        path: "elements/e1/interactive.html",
        sha256: "b".repeat(64),
        provenanceHash: "c".repeat(32),
        producedAt: "1980-01-01T00:00:00.000Z",
      },
    };
    const r = planDeliverables(seeded, ["web", "print"]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const print = r.value.elements.find(
      (el) => el.deliverable?.destination === "print",
    )!;
    // An interactive cannot be printed. Inheriting the master's pinned form is exactly the
    // "one output cannot inherit an incompatible format from another" failure.
    expect(print.proposal).toBeUndefined();
    expect(print.artifact).toBeUndefined();
    // ...and the master keeps everything it had.
    expect(r.value.elements[0]!.proposal?.chosenId).toBe("slope");
  });
});

describe("stage 3 — confirming the aspect", () => {
  it("records a legal aspect for the destination", () => {
    const run = plan("social");
    const r = confirmAspect(run.elements[0]!, "square");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.deliverable!.aspect).toBe("square");
  });

  it("refuses an aspect the destination does not carry, naming the ones it does", () => {
    const run = plan("social");
    const r = confirmAspect(run.elements[0]!, "page");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/portrait, square/);
  });

  it("refuses on an element that declares no deliverable at all", () => {
    const r = confirmAspect(base().elements[0]!, "portrait");
    expect(r.ok).toBe(false);
  });
});

describe("the final report — every requested deliverable, named", () => {
  it("lists one row per deliverable with its destination, channel and gate", () => {
    const run = plan("web", "social");
    const rows = deliverablePlan(run);
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.destination)).toEqual(["article-web", "social"]);
    expect(rows[0]!.channel).toBe("article-web");
    // Social still owes its aspect, so it has no channel yet — reported, not guessed.
    expect(rows[1]!.channel).toBeUndefined();
    // The sibling already has the master's angle, so its own next act is its own offer — built
    // at its own channel, never inherited.
    expect(rows[1]!.nextActions).toEqual(["propose"]);
    expect(rows.every((r) => r.gateState === "angled")).toBe(true);
  });

  it("reports a legacy run's single element against the run's own channel", () => {
    const rows = deliverablePlan({ ...base(), channel: "social-vertical" });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.destination).toBe("social");
    expect(rows[0]!.aspect).toBe("portrait");
    expect(rows[0]!.declared).toBe(false);
  });

  it("flags a sibling whose takeaway has drifted from its master", () => {
    const run = plan("web", "social");
    const drifted = {
      ...run,
      elements: [
        run.elements[0]!,
        {
          ...run.elements[1]!,
          angle: {
            ...run.elements[1]!.angle!,
            confirmedTakeaway: "something else",
          },
        },
      ],
    };
    const rows = deliverablePlan(drifted);
    expect(rows[0]!.takeawayDrift).toBe(false);
    expect(rows[1]!.takeawayDrift).toBe(true);
  });
});

test("a planned run stays writable — its invariants hold", () => {
  const run = plan("web", "video", "social", "print");
  expect(() => JSON.parse(JSON.stringify(run))).not.toThrow();
  for (const el of run.elements) expect(el.id).toMatch(/^[A-Za-z0-9_-]+$/);
});

describe("re-planning an element that had already been somewhere", () => {
  const alreadyWeb = (): RunManifest => {
    const m = base();
    return {
      ...m,
      elements: [
        {
          ...m.elements[0]!,
          deliverable: { destination: "article-web" },
          requestedFormat: "video",
          proposal: {
            options: [
              {
                id: "slope",
                nativeType: "slope",
                engine: "chart-native",
                format: "interactive",
                why: "w",
              },
            ],
            excluded: [],
            chosenId: "slope",
          },
        },
      ],
    };
  };

  it("does not leave an older format request standing when the new plan names none", () => {
    const r = planDeliverables(alreadyWeb(), ["web"]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.elements[0]!.requestedFormat).toBeUndefined();
  });

  it("drops an offer its new destination cannot carry, instead of writing a manifest that throws", () => {
    const r = planDeliverables(alreadyWeb(), ["print"]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const master = r.value.elements[0]!;
    expect(master.deliverable!.destination).toBe("print");
    // The interactive it had chosen cannot be printed — so the offer goes, and the run routes
    // back to `propose` on its own, the way revise.ts already invalidates a stale request.
    expect(master.proposal).toBeUndefined();
    expect(() => assertInvariants(r.value)).not.toThrow();
    expect(nextActionsForElement(r.value, master)).toEqual(["propose"]);
  });

  // ANNOUNCED, not merely constated. The drop is deliberate and mechanically guarded, and it is
  // still the destruction of work the journalist finished: an offer that had been proposed,
  // phrased and chosen. Writing it into the run's own ledger is what makes it readable by the
  // next person to open the run, rather than by whoever happens to diff the manifest.
  it("writes down that re-planning cost the element its offer", () => {
    const r = planDeliverables(alreadyWeb(), ["print"]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.events).toHaveLength(1);
    const [ev] = r.value.events;
    expect(ev).toMatchObject({
      kind: "transition",
      elementId: "e1",
      action: "plan-deliverables",
    });
    // The sentence has to say what was lost and why, or it is a marker rather than an account.
    expect(ev!.message).toContain("print");
    expect(ev!.message).toContain("interactive");
  });

  it("stays silent when the plan costs nothing", () => {
    const r = planDeliverables(alreadyWeb(), ["web"]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.events).toEqual([]);
  });

  it("keeps an offer the new destination still carries", () => {
    const m = alreadyWeb();
    const stillLegal = {
      ...m,
      elements: [
        {
          ...m.elements[0]!,
          proposal: {
            ...m.elements[0]!.proposal!,
            options: [
              {
                ...m.elements[0]!.proposal!.options[0]!,
                format: "static" as const,
              },
            ],
          },
        },
      ],
    };
    const r = planDeliverables(stillLegal, ["print"]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.elements[0]!.proposal?.chosenId).toBe("slope");
  });
});
