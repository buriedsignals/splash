import { test, expect, describe, it } from "bun:test";
import {
  provenanceHash,
  stalenessOf,
  nextActions,
  gateStateOf,
  parseManifest,
  type RunManifest,
} from "./manifest";

function base(): RunManifest {
  return {
    runId: "r1",
    schemaVersion: 4,
    route: "embed",
    channel: "article-web",
    input: { data: { path: "input/data-abc.csv", sha256: "a".repeat(64) } },
    orient: {
      profile: {
        columns: ["c", "2015", "2024"],
        numericColumns: ["2015", "2024"],
        rowCount: 1,
      },
      supportsPoint: true,
    },
    elements: [
      {
        id: "e1",
        angle: {
          confirmedTakeaway: "t",
          emphasis: "e",
          altInsight: "a",
          unit: "u",
        },
        proposal: {
          options: [{ id: "slope", nativeType: "slope", why: "w" }],
          excluded: [],
          chosenId: "slope",
        },
      },
    ],
    events: [],
  };
}

test("provenanceHash is stable and 32-hex", () => {
  const m = base();
  expect(provenanceHash(m, m.elements[0])).toMatch(/^[0-9a-f]{32}$/);
});

test("provenanceHash changes when the angle changes", () => {
  const m = base();
  const h1 = provenanceHash(m, m.elements[0]);
  const el2 = {
    ...m.elements[0],
    angle: { ...m.elements[0].angle!, emphasis: "other" },
  };
  expect(provenanceHash(m, el2)).not.toBe(h1);
});

test("stalenessOf is true when artifact provenance no longer matches", () => {
  const m = base();
  m.elements[0].artifact = {
    path: "/x.png",
    sha256: "b".repeat(64),
    provenanceHash: "stale",
    producedAt: "2026-01-01T00:00:00.000Z",
  };
  expect(stalenessOf(m, m.elements[0])).toBe(true);
});

test("nextActions is produce when element has a chosen form and no fresh artifact", () => {
  expect(nextActions(base())).toEqual(["produce"]);
});

test("nextActions is show when the artifact is fresh", () => {
  const m = base();
  m.elements[0].artifact = {
    path: "/x.png",
    sha256: "b".repeat(64),
    provenanceHash: provenanceHash(m, m.elements[0]),
    producedAt: "2026-01-01T00:00:00.000Z",
  };
  expect(nextActions(m)).toEqual(["show"]);
});

test("nextActions off-ramps ([]) when no legal form exists (zero proposal options)", () => {
  const m = base();
  m.elements[0].proposal = { options: [], excluded: [] };
  expect(nextActions(m)).toEqual([]);
});

test("nextActions off-ramps ([]) when data supports no visual", () => {
  const m = base();
  m.orient = {
    profile: { columns: ["x"], numericColumns: [], rowCount: 0 },
    supportsPoint: false,
  };
  expect(nextActions(m)).toEqual([]);
});

test("parseManifest rejects a manifest missing elements", () => {
  const bad = { runId: "r", schemaVersion: 4, input: {}, events: [] };
  expect(() => parseManifest(bad)).toThrow();
});

test("a stored proposal from before the capability axis still parses", () => {
  const raw = {
    runId: "r",
    schemaVersion: 4,
    input: { data: { path: "input/data-abc.csv", sha256: "a".repeat(64) } },
    elements: [
      {
        id: "e1",
        proposal: {
          options: [{ id: "slope", nativeType: "slope", why: "because" }],
        },
      },
    ],
    events: [],
  };
  expect(() => parseManifest(raw)).not.toThrow();
});

describe("the delivery slot", () => {
  const base = (): RunManifest => ({
    runId: "r1",
    schemaVersion: 4,
    route: "embed",
    channel: "article-web",
    input: { data: { path: "input/data.csv", sha256: "abc" } },
    orient: {
      profile: { columns: ["a"], numericColumns: ["a"], rowCount: 2 },
      supportsPoint: true,
    },
    elements: [
      {
        id: "e1",
        angle: { confirmedTakeaway: "T", altInsight: "A", unit: "u" },
        proposal: {
          options: [{ id: "o1", nativeType: "line", why: "w" }],
          excluded: [],
          chosenId: "o1",
        },
      },
    ],
    events: [],
  });

  const produced = (): RunManifest => {
    const m = base();
    const el = m.elements[0]!;
    return {
      ...m,
      elements: [
        {
          ...el,
          artifact: {
            path: "elements/e1/static.png",
            sha256: "d",
            provenanceHash: provenanceHash(m, el),
            producedAt: "1980-01-01T00:00:00.000Z",
          },
        },
      ],
    };
  };

  it("should stay on show while the journalist has requested no destination", () => {
    expect(nextActions(produced())).toEqual(["show"]);
  });

  it("should ask for deliver once a destination has been requested", () => {
    const m = produced();
    const el = {
      ...m.elements[0]!,
      delivery: { requested: ["zip"], delivered: [] },
    };
    expect(nextActions({ ...m, elements: [el] })).toEqual(["deliver"]);
  });

  it("should report delivered when a record carries the current provenance", () => {
    const m = produced();
    const el = m.elements[0]!;
    const delivered = {
      ...el,
      delivery: {
        requested: ["zip"],
        delivered: [
          {
            publisherId: "zip",
            kind: "package" as const,
            artifact: { path: "out/e1.zip", sha256: "z" },
            snippet: "<iframe></iframe>",
            publishedAt: "1980-01-01T00:00:00.000Z",
            deliveredProvenanceHash: el.artifact!.provenanceHash,
          },
        ],
      },
    };
    const run = { ...m, elements: [delivered] };
    expect(gateStateOf(run, delivered)).toBe("delivered");
  });

  it("should fall back out of delivered when the angle changes after publication", () => {
    const m = produced();
    const el = m.elements[0]!;
    const delivered = {
      ...el,
      angle: { ...el.angle!, emphasis: "Genève" },
      delivery: {
        requested: ["zip"],
        delivered: [
          {
            publisherId: "zip",
            kind: "package" as const,
            snippet: "",
            publishedAt: "1980-01-01T00:00:00.000Z",
            deliveredProvenanceHash: el.artifact!.provenanceHash,
          },
        ],
      },
    };
    const run = { ...m, elements: [delivered] };
    expect(gateStateOf(run, delivered)).toBe("stale");
  });

  // Ruling on the question parked by Task 7: gateStateOf's "delivered" and
  // nextActions' "deliver" must never disagree — a status that reads "done" while the
  // next action says "there is still something to deliver" is the same class of desync
  // assertInvariants already polices for other fields (approved without an artifact,
  // chosenId not among options, …), just not asserted mechanically here.
  function deliveryRecord(publisherId: string, hash: string) {
    return {
      publisherId,
      kind: "package" as const,
      snippet: "",
      publishedAt: "1980-01-01T00:00:00.000Z",
      deliveredProvenanceHash: hash,
    };
  }

  it("should not report 'delivered' while some of several requested destinations are still pending", () => {
    const m = produced();
    const el = m.elements[0]!;
    const hash = el.artifact!.provenanceHash;
    const partial = {
      ...el,
      delivery: {
        requested: ["zip", "embed-cloudflare"],
        delivered: [deliveryRecord("zip", hash)], // embed-cloudflare still missing
      },
    };
    const run = { ...m, elements: [partial] };
    expect(gateStateOf(run, partial)).not.toBe("delivered");
    expect(nextActions(run)).toEqual(["deliver"]);
  });

  it("gateStateOf reports 'delivered' exactly when nextActions no longer says deliver — walked through zero, one, both destinations", () => {
    const m = produced();
    const el = m.elements[0]!;
    const hash = el.artifact!.provenanceHash;
    const requested = ["zip", "embed-cloudflare"];

    const withDelivered = (delivered: ReturnType<typeof deliveryRecord>[]) => {
      const withDelivery = {
        ...el,
        delivery: { requested, delivered },
      };
      return { run: { ...m, elements: [withDelivery] }, el: withDelivery };
    };

    // zero delivered
    let { run, el: withDelivery } = withDelivered([]);
    expect(gateStateOf(run, withDelivery)).not.toBe("delivered");
    expect(nextActions(run)).toEqual(["deliver"]);

    // one of two delivered
    ({ run, el: withDelivery } = withDelivered([deliveryRecord("zip", hash)]));
    expect(gateStateOf(run, withDelivery)).not.toBe("delivered");
    expect(nextActions(run)).toEqual(["deliver"]);

    // both delivered
    ({ run, el: withDelivery } = withDelivered([
      deliveryRecord("zip", hash),
      deliveryRecord("embed-cloudflare", hash),
    ]));
    expect(gateStateOf(run, withDelivery)).toBe("delivered");
    expect(nextActions(run)).toEqual(["show"]);
  });

  it("should never report 'delivered' for an empty requested list, even if stale delivered records remain (vacuous every() guard)", () => {
    const m = produced();
    const el = m.elements[0]!;
    const hash = el.artifact!.provenanceHash;
    const emptyRequest = {
      ...el,
      delivery: { requested: [], delivered: [deliveryRecord("zip", hash)] },
    };
    const run = { ...m, elements: [emptyRequest] };
    expect(gateStateOf(run, emptyRequest)).not.toBe("delivered");
  });
});

test("v4 carries the route and the channel at run level", () => {
  const m = parseManifest({
    runId: "r",
    schemaVersion: 4,
    route: "embed",
    channel: "article-web",
    input: {},
    elements: [],
    events: [],
  });
  expect(m.route).toBe("embed");
  expect(m.channel).toBe("article-web");
});

test("a proposal records what was discarded, with its reason", () => {
  const m = parseManifest({
    runId: "r",
    schemaVersion: 4,
    route: "embed",
    channel: "article-web",
    input: {},
    elements: [
      {
        id: "e1",
        proposal: {
          options: [
            {
              id: "slope",
              nativeType: "slope",
              engine: "chart-native",
              format: "static",
              intent: ["change-over-time"],
              why: "…",
              whySource: {
                sheet: "chart/types/slope.md",
                fragments: ["a before/after"],
                facts: { rows: "8" },
              },
            },
          ],
          excluded: [
            { id: "pie", reason: "8 categories — a pie takes at most 5" },
          ],
        },
      },
    ],
    events: [],
  });
  expect(m.elements[0].proposal!.excluded![0].id).toBe("pie");
});

test("an unknown channel is refused", () => {
  expect(() =>
    parseManifest({
      runId: "r",
      schemaVersion: 4,
      route: "embed",
      channel: "billboard",
      input: {},
      elements: [],
      events: [],
    }),
  ).toThrow();
});
