import { test, expect, describe, it } from "bun:test";
import { canonicalHash } from "./canonical-hash";
import {
  provenanceHash,
  channelForElement,
  liveElementFor,
  assertInvariants,
  resolvedChannelForElement,
  stalenessOf,
  nextActions,
  gateStateOf,
  parseManifest,
  RunManifestSchema,
  type RunManifest,
  type RunElement,
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

// This branch made two more things artifact-determining: `run.channel` (produce renders AT the
// channel — its aspect and size) and the chosen option's `format` (produce builds THAT format,
// not a hard-coded static). Neither was hashed, so a 1200x675 landscape artifact stayed "fresh"
// after the run moved to social-vertical: nextActions said "show" and the run shipped a
// landscape image for a 9:16 channel.
test("provenanceHash covers the channel — an artifact does not survive a channel change", () => {
  const m = base();
  const h1 = provenanceHash(m, m.elements[0]);
  expect(
    provenanceHash({ ...m, channel: "social-vertical" }, m.elements[0]),
  ).not.toBe(h1);
});

test("provenanceHash covers the CHOSEN option's format, not just its id", () => {
  const m = base();
  m.elements[0].proposal!.options[0].format = "static";
  const h1 = provenanceHash(m, m.elements[0]);
  m.elements[0].proposal!.options[0].format = "interactive";
  expect(provenanceHash(m, m.elements[0])).not.toBe(h1);
});

// The credit is RENDERED INTO the artifact (pixels of a PNG, DOM of an HTML) since
// lib/loop/produce.ts reads the declared source instead of a placeholder. So the source ledger
// is artifact-determining exactly the way the channel and the format are: without it, correcting
// a source label leaves a STALE CREDIT on an artifact that reports itself fresh — stalenessOf
// answers false, nextActions says "show", and the newsroom publishes an attribution it already
// fixed. Required by the source-policy design spec's own R1, in the same commit as the consumer.
test("provenanceHash covers the source ledger — a corrected credit does not stay fresh", () => {
  const m = base();
  m.sources = { mode: "real", data: { kind: "local", label: "Relevés 2024" } };
  const h1 = provenanceHash(m, m.elements[0]);
  const relabelled = {
    ...m,
    sources: {
      mode: "real" as const,
      data: { kind: "local" as const, label: "Relevés communaux 2024" },
    },
  };
  expect(provenanceHash(relabelled, m.elements[0])).not.toBe(h1);
  // The CLASS moves it too: it changes what the visual is allowed to assert, not just its wording.
  expect(
    provenanceHash(
      {
        ...m,
        sources: {
          mode: "real" as const,
          data: { kind: "prose" as const, label: "Relevés 2024" },
        },
      },
      m.elements[0],
    ),
  ).not.toBe(h1);
  // And a run that declares nothing keeps a stable value rather than a moving one.
  const bare = base();
  expect(provenanceHash(bare, bare.elements[0])).toBe(
    provenanceHash(bare, bare.elements[0]),
  );
});

test("a produced artifact goes stale when its source label is corrected", () => {
  const m = base();
  m.sources = { mode: "real", data: { kind: "local", label: "Relevés 2024" } };
  m.elements[0].artifact = {
    path: "elements/e1/static.png",
    sha256: "b".repeat(64),
    provenanceHash: provenanceHash(m, m.elements[0]),
    producedAt: "2026-01-01T00:00:00.000Z",
  };
  expect(stalenessOf(m, m.elements[0])).toBe(false);
  m.sources.data!.label = "Relevés communaux 2024";
  expect(stalenessOf(m, m.elements[0])).toBe(true);
  expect(nextActions(m)).toEqual(["produce"]);
});

test("a produced artifact goes stale when the run changes channel", () => {
  const m = base();
  m.elements[0].artifact = {
    path: "elements/e1/static.png",
    sha256: "b".repeat(64),
    provenanceHash: provenanceHash(m, m.elements[0]),
    producedAt: "2026-01-01T00:00:00.000Z",
  };
  expect(nextActions(m)).toEqual(["show"]);
  const moved = { ...m, channel: "social-vertical" as const };
  expect(stalenessOf(moved, moved.elements[0])).toBe(true);
  expect(nextActions(moved)).toEqual(["produce"]);
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

// The offer MARKS a form production cannot build (lib/brain/eligibility.ts) rather than
// hiding it, so a journalist can still choose one. When they do, the run must lead somewhere:
// answering "produce" forever means produce refuses, the driver records a failure event, and
// nextActions says "produce" again — a permanent dead end with no way back to the offer.
test("nextActions routes BACK to the choice when the chosen form's engine cannot be built", () => {
  const m = base();
  m.elements[0].proposal = {
    options: [
      {
        id: "choropleth",
        nativeType: "choropleth",
        engine: "map-native",
        why: "w",
      },
      { id: "slope", nativeType: "slope", engine: "chart-native", why: "w" },
    ],
    excluded: [],
    chosenId: "choropleth",
  };
  expect(nextActions(m)).toEqual(["choose-form"]);
  m.elements[0].proposal.chosenId = "slope";
  expect(nextActions(m)).toEqual(["produce"]);
});

// The same dead-end applies when the chosen option's ENGINE is buildable but its FORMAT is
// not one that engine's manifest declares — chart-native is in LOOP_BUILDABLE_ENGINES, but a
// "scrolly" format on it is actually built by skills/scrolly (producerForFormat), which is
// not. Before this fix nextActionsForElement only checked isLoopBuildable(chosen.engine)
// directly, so this exact option (buildable engine, unbuildable effective producer) looked
// buildable here while produce() refused it every time — routing "produce" forever, with no
// way back to the choice.
test("nextActions routes BACK to the choice when the chosen option's engine is buildable but its format's effective producer is not", () => {
  const m = base();
  m.elements[0].proposal = {
    options: [
      {
        id: "line-scrolly",
        nativeType: "line",
        engine: "chart-native",
        format: "scrolly",
        why: "w",
      },
      { id: "slope", nativeType: "slope", engine: "chart-native", why: "w" },
    ],
    excluded: [],
    chosenId: "line-scrolly",
  };
  expect(nextActions(m)).toEqual(["choose-form"]);
  m.elements[0].proposal.chosenId = "slope";
  expect(nextActions(m)).toEqual(["produce"]);
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

  // These two prove the SCHEMA's own acceptance, not just gateStateOf's in-memory reads above —
  // the manifest read back from disk goes through RunManifestSchema.safeParse, not a hand-built
  // object, so that boundary is what actually needs testing.
  function manifestWithDelivered(record: {
    publisherId: string;
    kind: "hosted" | "package";
    [key: string]: unknown;
  }): RunManifest {
    const m = produced();
    const el = m.elements[0]!;
    return {
      ...m,
      elements: [
        {
          ...el,
          delivery: { requested: [record.publisherId], delivered: [record] },
        },
      ],
    } as unknown as RunManifest;
  }

  it("should accept a delivered record with no embed code", () => {
    const parsed = RunManifestSchema.safeParse(
      manifestWithDelivered({
        publisherId: "zip",
        kind: "package",
        artifact: { path: "elements/e1/primes.zip", sha256: "a".repeat(64) },
        publishedAt: "1980-01-01T12:00:00.000Z",
        deliveredProvenanceHash: "b".repeat(64),
      }),
    );
    expect(parsed.success).toBe(true);
  });

  // No migration is expected: an existing manifest carries `snippet`, and a field that becomes
  // optional still validates. This is the other half of that claim — proving the OLD shape
  // (with the field) still parses, not only the new one without it.
  it("should still accept a delivered record that carries an embed code (no migration needed)", () => {
    const parsed = RunManifestSchema.safeParse(
      manifestWithDelivered({
        publisherId: "embed-cloudflare",
        kind: "hosted",
        url: "https://example.invalid/e1",
        snippet: '<iframe src="https://example.invalid/e1"></iframe>',
        publishedAt: "1980-01-01T12:00:00.000Z",
        deliveredProvenanceHash: "b".repeat(64),
      }),
    );
    expect(parsed.success).toBe(true);
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

test("an element may carry an explicitly requested format, and a manifest without one still loads", () => {
  const raw = base();
  const withFormat = parseManifest({
    ...raw,
    elements: [{ ...raw.elements[0], requestedFormat: "video" }],
  });
  expect(withFormat.elements[0]!.requestedFormat).toBe("video");
  const without = parseManifest(raw);
  expect(without.elements[0]!.requestedFormat).toBeUndefined();
});

test("a requested format outside the vocabulary is refused at parse time", () => {
  const raw = base();
  expect(() =>
    parseManifest({
      ...raw,
      elements: [{ ...raw.elements[0], requestedFormat: "gif" }],
    }),
  ).toThrow();
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

// ---------------------------------------------------------------------------------------
// Issue #1 — several deliverables in one run: destination × format × aspect, de-welded.
// ---------------------------------------------------------------------------------------

describe("a deliverable's own channel", () => {
  it("resolves from the element's destination and aspect, not from the run's channel", () => {
    const m = base();
    const el = {
      ...m.elements[0]!,
      deliverable: { destination: "social" as const, aspect: "square" as const },
    };
    expect(m.channel).toBe("article-web");
    expect(channelForElement(m, el)).toBe("social-feed");
  });

  it("falls back to the run's channel for an element that declares no deliverable", () => {
    const m = { ...base(), channel: "social-vertical" as const };
    expect(channelForElement(m, m.elements[0]!)).toBe("social-vertical");
  });

  it("answers undefined while a social deliverable still owes its aspect", () => {
    const m = base();
    const el = {
      ...m.elements[0]!,
      deliverable: { destination: "social" as const },
    };
    expect(resolvedChannelForElement(m, el)).toBeUndefined();
    // ...but the total resolver never throws — provenance has to stay computable.
    expect(channelForElement(m, el)).toBe("article-web");
  });

  it("takes the destination's only aspect when there is nothing to ask", () => {
    const m = base();
    const web = {
      ...m.elements[0]!,
      deliverable: { destination: "article-web" as const },
    };
    const print = {
      ...m.elements[0]!,
      deliverable: { destination: "print" as const },
    };
    expect(resolvedChannelForElement(m, web)).toBe("article-web");
    expect(resolvedChannelForElement(m, print)).toBe("print-page");
  });
});

describe("provenance covers the deliverable", () => {
  it("leaves a legacy element's hash byte-identical (no deliverable ⇒ no new hash inputs)", () => {
    const m = base();
    // The value this test pins is the hash of the SAME inputs the pre-issue-#1 hash covered.
    // Recomputed, never a literal: what matters is that adding the two optional keys did not
    // re-value an element that carries neither.
    const expected = canonicalHash({
      inputData: m.input.data!.sha256,
      inputArticle: null,
      cadrage: null,
      angle: m.elements[0]!.angle,
      chosenId: "slope",
      channel: "article-web",
      format: null,
      // Added by the source-policy wiring, not by issue #1: the rendered credit is an artifact
      // input, so correcting a source label must invalidate the artifact carrying the old one.
      // Listed here so this test keeps proving ITS invariant — that the two optional deliverable
      // keys re-value nothing — instead of failing whenever another slice legitimately widens
      // the hash.
      sources: m.sources ?? null,
    });
    expect(provenanceHash(m, m.elements[0]!)).toBe(expected);
  });

  it("moves when the destination moves — an artifact cannot look fresh at a new destination", () => {
    const m = base();
    const web = {
      ...m.elements[0]!,
      deliverable: { destination: "article-web" as const },
    };
    const print = {
      ...m.elements[0]!,
      deliverable: { destination: "print" as const },
    };
    expect(provenanceHash(m, print)).not.toBe(provenanceHash(m, web));
  });

  it("moves when only the aspect moves — a 9:16 still is not a 1:1 still", () => {
    const m = base();
    const portrait = {
      ...m.elements[0]!,
      deliverable: { destination: "social" as const, aspect: "portrait" as const },
    };
    const square = {
      ...m.elements[0]!,
      deliverable: { destination: "social" as const, aspect: "square" as const },
    };
    expect(provenanceHash(m, portrait)).not.toBe(provenanceHash(m, square));
  });

  it("gives two siblings of one takeaway two different hashes", () => {
    const m = base();
    const a = {
      ...m.elements[0]!,
      deliverable: { destination: "article-web" as const },
    };
    const b = {
      ...m.elements[0]!,
      id: "e2",
      deliverableOf: "e1",
      deliverable: { destination: "social" as const, aspect: "portrait" as const },
    };
    expect(provenanceHash(m, a)).not.toBe(provenanceHash(m, b));
  });

  it("still moves with the run's channel for a legacy element", () => {
    const m = base();
    const h = provenanceHash(m, m.elements[0]!);
    expect(
      provenanceHash({ ...m, channel: "social-feed" }, m.elements[0]!),
    ).not.toBe(h);
  });
});

describe("confirm-aspect — the aspect question, at the moment it is actually needed", () => {
  const social = (extra: Partial<RunElement> = {}): RunManifest => {
    const m = base();
    return {
      ...m,
      elements: [
        {
          ...m.elements[0]!,
          deliverable: { destination: "social" },
          ...extra,
        },
      ],
    };
  };

  it("asks for the aspect once a form is chosen and before anything is produced", () => {
    expect(nextActions(social())).toEqual(["confirm-aspect"]);
  });

  it("never asks before the editorial format is chosen", () => {
    const m = social({
      proposal: {
        options: [{ id: "slope", nativeType: "slope", why: "w" }],
        excluded: [],
      },
    });
    expect(nextActions(m)).toEqual(["choose-form"]);
  });

  it("never asks before the angle is confirmed either", () => {
    const m = social({ angle: undefined, proposal: undefined });
    expect(nextActions(m)).toEqual(["confirm-angle"]);
  });

  it("moves on to produce once the aspect is answered", () => {
    const m = social();
    const el = {
      ...m.elements[0]!,
      deliverable: { destination: "social" as const, aspect: "portrait" as const },
    };
    expect(nextActions({ ...m, elements: [el] })).toEqual(["produce"]);
  });

  it("never asks on a branch that has one shape — web and print go straight to produce", () => {
    const m = base();
    for (const destination of ["article-web", "print"] as const) {
      const el = { ...m.elements[0]!, deliverable: { destination } };
      expect(nextActions({ ...m, elements: [el] })).toEqual(["produce"]);
    }
  });

  it("never asks on a legacy element that has no deliverable at all", () => {
    expect(nextActions(base())).toEqual(["produce"]);
  });
});

describe("nextActions across several deliverables", () => {
  const produced = (m: RunManifest, el: RunElement): RunElement => ({
    ...el,
    artifact: {
      path: `elements/${el.id}/static.png`,
      sha256: "d".repeat(64),
      provenanceHash: provenanceHash(m, el),
      producedAt: "1980-01-01T00:00:00.000Z",
    },
  });

  const twoDeliverables = (): RunManifest => {
    const m = base();
    const web = {
      ...m.elements[0]!,
      deliverable: { destination: "article-web" as const },
    };
    const social = {
      ...m.elements[0]!,
      id: "e2",
      deliverableOf: "e1",
      deliverable: {
        destination: "social" as const,
        aspect: "portrait" as const,
      },
    };
    return { ...m, elements: [web, social] };
  };

  it("does not read as done while a requested deliverable is still unproduced", () => {
    const m = twoDeliverables();
    const run = { ...m, elements: [produced(m, m.elements[0]!), m.elements[1]!] };
    // Before issue #1 this answered ["show"] — elements[0] was the whole run — so a two-output
    // request shipped with one output and called itself finished.
    expect(nextActions(run)).toEqual(["produce"]);
    expect(liveElementFor(run)?.id).toBe("e2");
  });

  it("says show only when every deliverable is there", () => {
    const m = twoDeliverables();
    const run = {
      ...m,
      elements: m.elements.map((el) => produced(m, el)),
    };
    expect(nextActions(run)).toEqual(["show"]);
    expect(liveElementFor(run)?.id).toBe("e1");
  });

  it("surfaces the human turn a later deliverable owes", () => {
    const m = twoDeliverables();
    const run = {
      ...m,
      elements: [
        produced(m, m.elements[0]!),
        { ...m.elements[1]!, deliverable: { destination: "social" as const } },
      ],
    };
    expect(nextActions(run)).toEqual(["confirm-aspect"]);
    expect(liveElementFor(run)?.id).toBe("e2");
  });

  it("leaves a single-element run answering exactly what it answered before", () => {
    const m = base();
    expect(nextActions(m)).toEqual(["produce"]);
    expect(nextActions({ ...m, elements: [] })).toEqual(["confirm-angle"]);
    expect(nextActions({ ...m, orient: undefined })).toEqual(["orient"]);
    expect(
      nextActions({ ...m, orient: { ...m.orient!, supportsPoint: false } }),
    ).toEqual([]);
    expect(liveElementFor(m)?.id).toBe("e1");
  });

  it("skips a deliverable that was dropped rather than stalling the whole run", () => {
    const m = twoDeliverables();
    const run = {
      ...m,
      elements: [
        produced(m, m.elements[0]!),
        {
          ...m.elements[1]!,
          dropped: { reason: "the desk cut the social post", at: "1980-01-01T00:00:00.000Z" },
        },
      ],
    };
    expect(nextActions(run)).toEqual(["show"]);
  });
});

describe("a deliverable cannot be written with a format its own destination refuses", () => {
  const withChosen = (
    deliverable: RunManifest["elements"][number]["deliverable"],
    format: "static" | "interactive" | "video" | "scrolly",
  ): RunManifest => {
    const m = base();
    return {
      ...m,
      elements: [
        {
          ...m.elements[0]!,
          deliverable,
          proposal: {
            options: [
              {
                id: "slope",
                nativeType: "slope",
                engine: "chart-native",
                format,
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

  it("refuses an interactive pinned on a print deliverable", () => {
    expect(() =>
      assertInvariants(withChosen({ destination: "print" }, "interactive")),
    ).toThrow(/print-page/);
  });

  it("refuses a scrolly pinned on a social deliverable", () => {
    expect(() =>
      assertInvariants(
        withChosen({ destination: "social", aspect: "portrait" }, "scrolly"),
      ),
    ).toThrow(/social-vertical/);
  });

  it("accepts what the destination does carry", () => {
    expect(() =>
      assertInvariants(withChosen({ destination: "print" }, "static")),
    ).not.toThrow();
    expect(() =>
      assertInvariants(withChosen({ destination: "article-web" }, "interactive")),
    ).not.toThrow();
  });

  it("says nothing about an element that declares no deliverable", () => {
    // A legacy element is judged by the run's channel exactly as before — this check is only
    // about rows that name their own destination.
    const m = base();
    const legacy: RunManifest = {
      ...m,
      channel: "social-feed",
      elements: [
        {
          ...m.elements[0]!,
          proposal: {
            options: [
              {
                id: "slope",
                nativeType: "slope",
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
    expect(() => assertInvariants(legacy)).not.toThrow();
  });

  it("refuses a sibling pointing at an element the run does not have", () => {
    const m = base();
    const orphan: RunManifest = {
      ...m,
      elements: [{ ...m.elements[0]!, id: "e2", deliverableOf: "ghost" }],
    };
    expect(() => assertInvariants(orphan)).toThrow(/ghost/);
  });

  it("refuses an element that says it is a deliverable of itself", () => {
    const m = base();
    expect(() =>
      assertInvariants({
        ...m,
        elements: [{ ...m.elements[0]!, deliverableOf: "e1" }],
      }),
    ).toThrow(/itself/);
  });
});

it("refuses a format no shape of the destination could carry, even before the aspect is answered", () => {
  const m = base();
  const el = {
    ...m.elements[0]!,
    // Social, aspect still owed — so there is no single channel to judge against yet. Neither
    // of its shapes carries a scrolly, so the answer is knowable anyway, and waiting for the
    // aspect would let a manifest sit on disk asserting a scrolly Instagram Story.
    deliverable: { destination: "social" as const },
    proposal: {
      options: [
        {
          id: "slope",
          nativeType: "slope",
          engine: "chart-native",
          format: "scrolly" as const,
          why: "w",
        },
      ],
      excluded: [],
      chosenId: "slope",
    },
  };
  expect(() => assertInvariants({ ...m, elements: [el] })).toThrow(/social/);
});

it("allows a format one of the destination's shapes carries while the aspect is still owed", () => {
  const m = base();
  const el = {
    ...m.elements[0]!,
    deliverable: { destination: "social" as const },
    proposal: {
      options: [
        {
          id: "slope",
          nativeType: "slope",
          engine: "chart-native",
          format: "video" as const,
          why: "w",
        },
      ],
      excluded: [],
      chosenId: "slope",
    },
  };
  expect(() => assertInvariants({ ...m, elements: [el] })).not.toThrow();
});

// --- the invariant the writer was missing (residual sweep, 2026-07-27) ---

describe("assertInvariants: a delivery record needs the artifact it delivered", () => {
  // Same class as the `review`/`approved` guards right beside it: a published record on an
  // element that produced nothing is incoherent, and until now nothing refused it.
  function delivered(el: Partial<RunElement>): RunManifest {
    const m = base();
    return {
      ...m,
      elements: [
        {
          ...m.elements[0]!,
          delivery: {
            requested: ["zip"],
            delivered: [
              {
                publisherId: "zip",
                kind: "package" as const,
                publishedAt: "2026-07-27T10:00:00.000Z",
                deliveredProvenanceHash: "h",
              },
            ],
          },
          ...el,
        },
      ],
    };
  }

  it("refuses a delivered record on an element with no artifact", () => {
    expect(() => assertInvariants(delivered({}))).toThrow(/delivered/i);
  });

  it("accepts the same record once the artifact is there", () => {
    expect(() =>
      assertInvariants(
        delivered({
          artifact: {
            path: "elements/e1/static.png",
            sha256: "b".repeat(64),
            provenanceHash: "h",
            producedAt: "2026-07-27T09:00:00.000Z",
          },
        }),
      ),
    ).not.toThrow();
  });

  it("says nothing about a REQUESTED destination that has not been delivered yet", () => {
    // The decision is recorded before the artifact exists in perfectly ordinary runs — it is
    // the DELIVERED record, not the request, that claims something was published.
    const m = base();
    const requestedOnly: RunManifest = {
      ...m,
      elements: [
        {
          ...m.elements[0]!,
          delivery: { requested: ["zip"], delivered: [] },
        },
      ],
    };
    expect(() => assertInvariants(requestedOnly)).not.toThrow();
  });
});
