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
  nextActionsForElement,
  gateStateOf,
  parseManifest,
  RunManifestSchema,
  type RunManifest,
  type RunElement,
} from "./manifest";
import { migrate } from "./migrate";

function base(): RunManifest {
  return {
    runId: "r1",
    schemaVersion: 5,
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
      // A FICTIONAL engine, constructed here on purpose rather than borrowed. This fixture
      // used to point at whichever real engine was not wired yet — map-native, then map-dw —
      // and had to be re-pointed each time one became buildable (tasks 7 and 13). Every engine
      // the brain can offer is now assembled, so there is no real dead end left to borrow: an
      // engine nothing can build is now something a test has to declare for itself.
      {
        id: "unbuildable-form",
        nativeType: "choropleth",
        engine: "crayon",
        why: "w",
      },
      { id: "slope", nativeType: "slope", engine: "chart-native", why: "w" },
    ],
    excluded: [],
    chosenId: "unbuildable-form",
  };
  expect(nextActions(m)).toEqual(["choose-form"]);
  m.elements[0].proposal.chosenId = "slope";
  expect(nextActions(m)).toEqual(["produce"]);
});

// This used to pin a dead end: chart-native is in LOOP_BUILDABLE_ENGINES, but a "scrolly"
// format on it is actually built by skills/scrolly (producerForFormat) — before Task 9 wired
// an assembler for that effective producer, nextActionsForElement checking chosen.engine alone
// would have looked buildable here while produce() refused it every time. Task 9 (scrolly
// composes its host engine's track) closed that dead end: the same option now starts the
// narrative flow instead of bouncing back to the offer. Switching the choice to a plain form
// still resolves to "produce", unchanged.
test("nextActions moves a chosen chart-track scrolly into the narrative flow, not back to the offer", () => {
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
  expect(nextActions(m)).toEqual(["draft-beats"]);
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
  const bad = { runId: "r", schemaVersion: 5, input: {}, events: [] };
  expect(() => parseManifest(bad)).toThrow();
});

test("a stored proposal from before the capability axis still parses", () => {
  const raw = {
    runId: "r",
    schemaVersion: 5,
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
    schemaVersion: 5,
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

  // Produced AND approved. The approval is the new precondition of delivery (the verification
  // chain, above): these tests are about the delivered/deliver complementarity, so they declare
  // an artifact a journalist has signed off on and keep asking their own question — which is
  // now also an assertion that an approved element routes straight to `deliver`.
  const produced = (): RunManifest => {
    const m = base();
    const el = m.elements[0]!;
    const provenance = provenanceHash(m, el);
    return {
      ...m,
      elements: [
        {
          ...el,
          artifact: {
            path: "elements/e1/static.png",
            sha256: "d",
            provenanceHash: provenance,
            producedAt: "1980-01-01T00:00:00.000Z",
          },
          approved: {
            signoffPath: "signoffs/e1.json",
            approvedProvenanceHash: provenance,
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
    schemaVersion: 5,
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
    schemaVersion: 5,
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
      schemaVersion: 5,
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
      deliverable: {
        destination: "social" as const,
        aspect: "square" as const,
      },
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
      // Added by the article-beats seam, for the same reason as `sources`: the journalist's own
      // beat sentences are rendered INTO the page, so rewriting one must invalidate it. Listed
      // here on the same terms — null for an element that carries no plan, which is what keeps
      // this test's own invariant (the deliverable keys re-value nothing) legible.
      narrative: m.elements[0]!.narrative ?? null,
      // Added by geography-anywhere (D9), for the same reason as `sources`/`narrative`: the
      // declared geography's credit/edition and the join decisions are rendered INTO the
      // artifact. Listed here on the same terms — null for a run that declares neither.
      geography: m.input.geography ?? null,
      geoJoin: m.orient?.geoJoin ?? null,
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
      deliverable: {
        destination: "social" as const,
        aspect: "portrait" as const,
      },
    };
    const square = {
      ...m.elements[0]!,
      deliverable: {
        destination: "social" as const,
        aspect: "square" as const,
      },
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
      deliverable: {
        destination: "social" as const,
        aspect: "portrait" as const,
      },
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
      deliverable: {
        destination: "social" as const,
        aspect: "portrait" as const,
      },
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
    const run = {
      ...m,
      elements: [produced(m, m.elements[0]!), m.elements[1]!],
    };
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
          dropped: {
            reason: "the desk cut the social post",
            at: "1980-01-01T00:00:00.000Z",
          },
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
      assertInvariants(
        withChosen({ destination: "article-web" }, "interactive"),
      ),
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

// ---------------------------------------------------------------------------------------
// The verification chain, wired into the state machine (verify-in-journey slice).
//
// lib/verify built capture, review, the preview gate and approveElement — and nothing in the
// loop routed to any of them: a produced artifact went straight to `deliver`. These tests hold
// the cascade that closes that, and the one property the closure must NOT break: an element
// nobody asked to publish still answers "show".
// ---------------------------------------------------------------------------------------
describe("the verification chain in nextActions", () => {
  const ARTIFACT_SHA = "c".repeat(64);

  function produced(): RunManifest {
    const m = base();
    const el = m.elements[0]!;
    const withArtifact: RunElement = {
      ...el,
      artifact: {
        path: "elements/e1/static.png",
        sha256: ARTIFACT_SHA,
        provenanceHash: provenanceHash(m, el),
        producedAt: "2026-07-27T09:00:00.000Z",
      },
    };
    return { ...m, elements: [withArtifact] };
  }

  function requesting(el: Partial<RunElement> = {}): RunManifest {
    const m = produced();
    return {
      ...m,
      elements: [
        {
          ...m.elements[0]!,
          delivery: { requested: ["zip"], delivered: [] },
          ...el,
        },
      ],
    };
  }

  function hashOf(m: RunManifest): string {
    return provenanceHash(m, m.elements[0]!);
  }

  const captureSlot = (m: RunManifest) => ({
    images: [],
    checks: [],
    capturedProvenanceHash: hashOf(m),
  });
  const reviewSlot = (m: RunManifest) => ({
    findings: [],
    reviewedProvenanceHash: hashOf(m),
  });
  const previewSlot = {
    deliverablePath: "elements/e1/static.png",
    deliverableSha256: ARTIFACT_SHA,
    presentedAs: "path-printed" as const,
    presentedAt: "2026-07-27T09:05:00.000Z",
    fallbackReason: "no viewer on this machine",
  };

  it("a produced element nobody asked to publish still answers show", () => {
    // The contract lib/source/wiring-proof.test.ts asserts, and the reason the chain lives
    // inside the delivery branch rather than above it.
    expect(nextActions(produced())).toEqual(["show"]);
  });

  it("routes to capture once a delivery is pending and nothing has been captured", () => {
    expect(nextActions(requesting())).toEqual(["capture"]);
  });

  it("routes to review once the capture covers this artifact", () => {
    const m = requesting();
    m.elements[0]!.capture = captureSlot(m);
    expect(nextActions(m)).toEqual(["review"]);
  });

  it("routes to preview once the review covers this artifact", () => {
    const m = requesting();
    m.elements[0]!.capture = captureSlot(m);
    m.elements[0]!.review = reviewSlot(m);
    expect(nextActions(m)).toEqual(["preview"]);
  });

  it("routes to approve once the preview covers the deliverable's bytes", () => {
    const m = requesting();
    m.elements[0]!.capture = captureSlot(m);
    m.elements[0]!.review = { ...reviewSlot(m), preview: previewSlot };
    expect(nextActions(m)).toEqual(["approve"]);
  });

  it("a preview of OTHER bytes does not clear the gate", () => {
    const m = requesting();
    m.elements[0]!.capture = captureSlot(m);
    m.elements[0]!.review = {
      ...reviewSlot(m),
      preview: { ...previewSlot, deliverableSha256: "d".repeat(64) },
    };
    // Not "approve": the preview covered an artifact this run is no longer looking at.
    expect(nextActions(m)).toEqual(["preview"]);
  });

  it("routes to deliver only once the approval covers this provenance", () => {
    const m = requesting();
    m.elements[0]!.approved = {
      signoffPath: "signoffs/e1.json",
      approvedProvenanceHash: hashOf(m),
    };
    expect(nextActions(m)).toEqual(["deliver"]);
  });

  it("an approval of an EARLIER provenance sends the run back through the chain", () => {
    const m = requesting();
    m.elements[0]!.approved = {
      signoffPath: "signoffs/e1.json",
      approvedProvenanceHash: "stale-hash",
    };
    expect(nextActions(m)).toEqual(["capture"]);
  });

  it("re-confirming the angle unseats an approved artifact entirely", () => {
    const m = requesting();
    m.elements[0]!.approved = {
      signoffPath: "signoffs/e1.json",
      approvedProvenanceHash: hashOf(m),
    };
    const moved: RunManifest = {
      ...m,
      elements: [
        {
          ...m.elements[0]!,
          angle: { ...m.elements[0]!.angle!, confirmedTakeaway: "another" },
        },
      ],
    };
    expect(nextActions(moved)).toEqual(["produce"]);
  });
});

describe("the capture slot", () => {
  it("parses a well-formed capture record", () => {
    const m = base();
    const el = m.elements[0]!;
    const parsed = parseManifest({
      ...m,
      elements: [
        {
          ...el,
          artifact: {
            path: "elements/e1/static.png",
            sha256: "c".repeat(64),
            provenanceHash: provenanceHash(m, el),
            producedAt: "2026-07-27T09:00:00.000Z",
          },
          capture: {
            images: [],
            checks: [
              {
                id: "capture:fits-viewport",
                breakpoint: "primary",
                outcome: "pass",
                detail: "fits",
              },
            ],
            capturedProvenanceHash: provenanceHash(m, el),
          },
        },
      ],
    });
    expect(parsed.elements[0]!.capture!.checks).toHaveLength(1);
  });

  it("refuses a capture slot whose images are not a list", () => {
    const m = base();
    expect(() =>
      parseManifest({
        ...m,
        elements: [
          {
            ...m.elements[0]!,
            capture: {
              images: "nope",
              checks: [],
              capturedProvenanceHash: "h",
            },
          },
        ],
      }),
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// The narrative slot (article beats) — see docs/superpowers/specs/
// 2026-07-27-article-beats-design.md
// ---------------------------------------------------------------------------

/** A run whose live element chose a chart-native SCROLLY — the one format whose deliverable is
 *  a narrative page rather than an embeddable element. */
function scrollyRun(): RunManifest {
  const m = base();
  return {
    ...m,
    elements: [
      {
        ...m.elements[0]!,
        proposal: {
          options: [
            {
              id: "line-scrolly",
              nativeType: "line",
              engine: "chart-native",
              format: "scrolly",
              why: "the series has a shape a reader can be walked through",
            },
          ],
          excluded: [],
          chosenId: "line-scrolly",
        },
      },
    ],
  };
}

const DRAFTED_BEAT = {
  id: "beat-1",
  anchor: { kind: "x" as const, value: "1979" },
  role: "establish" as const,
  text: "",
  draftText: "1979 — 7",
  beatSource: { facts: { x: "1979", value: "7" }, shared: { points: "7" } },
};
const AUTHORED_BEAT = {
  ...DRAFTED_BEAT,
  text: "En 1979 la banquise tenait encore.",
};

describe("the narrative slot", () => {
  it("round-trips through the schema", () => {
    const m = scrollyRun();
    const parsed = parseManifest({
      ...m,
      elements: [{ ...m.elements[0]!, narrative: { beats: [AUTHORED_BEAT] } }],
    });
    expect(parsed.elements[0]!.narrative!.beats[0]!.anchor.value).toBe("1979");
    expect(parsed.elements[0]!.narrative!.beats[0]!.draftText).toBe("1979 — 7");
  });

  it("refuses a role that is not a claim-arc stage", () => {
    const m = scrollyRun();
    expect(() =>
      parseManifest({
        ...m,
        elements: [
          {
            ...m.elements[0]!,
            narrative: { beats: [{ ...AUTHORED_BEAT, role: "climax" }] },
          },
        ],
      }),
    ).toThrow();
  });

  it("is part of the provenance — rewriting a beat stales the page", () => {
    const m = scrollyRun();
    const drafted: RunManifest = {
      ...m,
      elements: [{ ...m.elements[0]!, narrative: { beats: [AUTHORED_BEAT] } }],
    };
    const h1 = provenanceHash(drafted, drafted.elements[0]!);
    const rewritten: RunManifest = {
      ...drafted,
      elements: [
        {
          ...drafted.elements[0]!,
          narrative: {
            beats: [
              { ...AUTHORED_BEAT, text: "Une autre phrase entièrement." },
            ],
          },
        },
      ],
    };
    expect(provenanceHash(rewritten, rewritten.elements[0]!)).not.toBe(h1);
    // …and it is STABLE when nothing moves.
    expect(provenanceHash(drafted, drafted.elements[0]!)).toBe(h1);
  });

  it("stales an artifact produced before the beat was rewritten", () => {
    const m = scrollyRun();
    const el = { ...m.elements[0]!, narrative: { beats: [AUTHORED_BEAT] } };
    const produced: RunManifest = { ...m, elements: [el] };
    const withArtifact: RunElement = {
      ...el,
      artifact: {
        path: "elements/e1/scrolly.html",
        sha256: "b".repeat(64),
        provenanceHash: provenanceHash(produced, el),
        producedAt: new Date().toISOString(),
      },
    };
    expect(
      stalenessOf({ ...produced, elements: [withArtifact] }, withArtifact),
    ).toBe(false);
    const rewritten: RunElement = {
      ...withArtifact,
      narrative: { beats: [{ ...AUTHORED_BEAT, text: "Réécrit." }] },
    };
    expect(stalenessOf({ ...produced, elements: [rewritten] }, rewritten)).toBe(
      true,
    );
  });

  it("refuses on disk an artifact standing on a beat nobody authored", () => {
    const m = scrollyRun();
    const el: RunElement = {
      ...m.elements[0]!,
      narrative: { beats: [DRAFTED_BEAT] },
      artifact: {
        path: "elements/e1/scrolly.html",
        sha256: "b".repeat(64),
        provenanceHash: "h",
        producedAt: new Date().toISOString(),
      },
    };
    expect(() => assertInvariants({ ...m, elements: [el] })).toThrow(/beat-1/);
  });

  it("ACCEPTS a drafted plan with no artifact — that is the draft state", () => {
    const m = scrollyRun();
    expect(() =>
      assertInvariants({
        ...m,
        elements: [{ ...m.elements[0]!, narrative: { beats: [DRAFTED_BEAT] } }],
      }),
    ).not.toThrow();
  });
});

describe("routing a narrative page through its beats", () => {
  // THE HONEST STATE OF THE ROUTE. `draft-beats` sits BELOW the buildability gate, because
  // drafting beats for a form nothing can build would be work thrown away and would swallow the
  // stranded-run escape (driver.test.ts's "clearing the request is the way out"). scrolly is now
  // in LOOP_BUILDABLE_ENGINES (lib/loop/assemble/scrolly.ts composes the chosen host engine's
  // track), so a chosen chart-track scrolly with no plan yet routes to "draft-beats", not back
  // to "choose-form".
  it("routes a chosen chart-track scrolly with no plan yet to draft-beats", () => {
    expect(nextActions(scrollyRun())).toEqual(["draft-beats"]);
  });

  it("asks the journalist to author, whenever a plan carries an unwritten beat", () => {
    const m = base();
    expect(
      nextActions({
        ...m,
        elements: [{ ...m.elements[0]!, narrative: { beats: [DRAFTED_BEAT] } }],
      }),
    ).toEqual(["author-beats"]);
  });

  it("produces once every beat is authored", () => {
    const m = base();
    expect(
      nextActions({
        ...m,
        elements: [
          { ...m.elements[0]!, narrative: { beats: [AUTHORED_BEAT] } },
        ],
      }),
    ).toEqual(["produce"]);
  });

  it("leaves an element with no plan untouched — no beats are ever asked of it", () => {
    // base() chose a static slope: the narrative slot must not appear anywhere in its routing.
    expect(nextActions(base())).toEqual(["produce"]);
  });
});

describe("routing a below-ADM1 map through its geo-join (D6)", () => {
  // Mirrors unauthoredBeats's own coverage shape exactly: pending blocks, resolved doesn't, and
  // absent doesn't — the false-block risk this gate carries is a run with no geography at all,
  // or one already fully resolved, being wrongly told to go resolve something.
  it("returns 'resolve-geo-join' when a geo-join value is unresolved", () => {
    const m = base();
    const withPending: RunManifest = {
      ...m,
      orient: {
        ...m.orient!,
        geoJoin: {
          column: "region",
          geographySha256: "abc",
          decisions: [],
          pending: ["Buenos Aires"],
        },
      },
    };
    const el = withPending.elements[0]!;
    expect(nextActionsForElement(withPending, el)).toEqual([
      "resolve-geo-join",
    ]);
  });

  it("routes straight to produce once the pending value has a decision", () => {
    const m = base();
    const resolved: RunManifest = {
      ...m,
      orient: {
        ...m.orient!,
        geoJoin: {
          column: "region",
          geographySha256: "abc",
          decisions: [
            {
              value: "Buenos Aires",
              featureId: "ARG-CABA",
              basis: "journalist",
            },
          ],
          pending: [],
        },
      },
    };
    const el = resolved.elements[0]!;
    expect(nextActionsForElement(resolved, el)).toEqual(["produce"]);
  });

  it("leaves a run with no geo-join ledger at all untouched — no false block", () => {
    // base() carries no orient.geoJoin at all: this gate must be silent for every run that
    // never had geography, which is most runs.
    const el = base().elements[0]!;
    expect(nextActionsForElement(base(), el)).toEqual(["produce"]);
  });
});

describe("RunManifestSchema.lang — the run's own recorded language", () => {
  it("accepts a manifest that carries a lang", () => {
    const parsed = RunManifestSchema.safeParse({ ...base(), lang: "it" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.lang).toBe("it");
  });

  // Every manifest already on disk was written with no such field — optional is what keeps
  // them readable rather than forcing a migration for a field that did not exist yet.
  it("still accepts a manifest with no lang at all (nothing on disk migrates)", () => {
    const parsed = RunManifestSchema.safeParse(base());
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.lang).toBeUndefined();
  });
});

function baseManifestV5(overrides: Record<string, unknown> = {}) {
  return {
    runId: "r1",
    schemaVersion: 5,
    route: "embed",
    channel: "article-web",
    input: { data: { path: "input/data-abc.csv", sha256: "abc" } },
    elements: [],
    events: [],
    ...overrides,
  };
}

describe("RunManifestSchema v5 — geography", () => {
  it("parses a manifest declaring input.geography with every required editorial fact", () => {
    const m = baseManifestV5({
      input: {
        data: { path: "input/data-abc.csv", sha256: "abc" },
        geography: {
          path: "input/geography-def.geojson",
          sha256: "def",
          encoding: "geojson",
          crs: "EPSG:4326",
          level: "communes de Haute-Savoie",
          licence: "Licence Ouverte 2.0",
          edition: "2024",
          credit: { name: "IGN — Admin Express" },
        },
      },
    });
    expect(RunManifestSchema.safeParse(m).success).toBe(true);
  });

  it("refuses input.geography missing edition — same discipline as GeographyInputSchema", () => {
    const m = baseManifestV5({
      input: {
        geography: {
          path: "input/geography-def.geojson",
          sha256: "def",
          encoding: "geojson",
          crs: "EPSG:4326",
          level: "communes",
          licence: "Licence Ouverte 2.0",
          credit: { name: "IGN" },
        },
      },
    });
    expect(RunManifestSchema.safeParse(m).success).toBe(false);
  });

  it("orient.geo carries a GeographyRef, not a bare basemap string", () => {
    const m = baseManifestV5({
      orient: {
        profile: { columns: ["canton"], numericColumns: [], rowCount: 2 },
        supportsPoint: false,
        geo: {
          column: "canton",
          geography: {
            origin: "shipped",
            set: "natural-earth-admin-1",
            scope: "CHE",
            level: "canton",
            joinKey: "name",
            joinKeyFamily: "name",
          },
          matched: 2,
          total: 2,
          unmatched: [],
        },
      },
    });
    expect(RunManifestSchema.safeParse(m).success).toBe(true);
  });

  it("orient.geoJoin carries a GeoJoinLedger — the fixture: one unresolved 'Buenos Aires'", () => {
    const m = baseManifestV5({
      orient: {
        profile: { columns: ["region"], numericColumns: [], rowCount: 1 },
        supportsPoint: false,
        geoJoin: {
          column: "region",
          geographySha256: "def",
          decisions: [],
          pending: ["Buenos Aires"],
        },
      },
    });
    expect(RunManifestSchema.safeParse(m).success).toBe(true);
  });
});

describe("provenanceHash — geography (D9)", () => {
  function withGeographyCredit(creditName: string): RunManifest {
    const m = base();
    m.input.geography = {
      path: "input/geography-def.geojson",
      sha256: "d".repeat(64),
      encoding: "geojson",
      crs: "EPSG:4326",
      level: "communes de Haute-Savoie",
      licence: "Licence Ouverte 2.0",
      edition: "2024",
      credit: { name: creditName },
    };
    return m;
  }

  it("changes when input.geography's credit changes, even though the frozen file's sha256 does not", () => {
    const runWithoutCredit = withGeographyCredit("IGN");
    const runWithFixedCredit = {
      ...runWithoutCredit,
      input: {
        ...runWithoutCredit.input,
        geography: {
          ...runWithoutCredit.input.geography!,
          credit: { name: "IGN — corrected" },
        },
      },
    };
    const el = runWithoutCredit.elements[0];
    expect(provenanceHash(runWithoutCredit, el)).not.toBe(
      provenanceHash(runWithFixedCredit, el),
    );
  });

  // The credit test above cannot, by itself, tell "the whole GeographyRecord is hashed" apart
  // from "only credit is hashed" — both would pass it, since it only ever varies credit. This
  // test isolates a SECOND field (licence) while holding credit fixed, the same way the source
  // ledger test above proves the CLASS moves the hash, not just the label (line ~108). Without
  // this, `geography: run.input.geography?.credit ?? null` would silently satisfy every other
  // test in this file while under-hashing licence/edition — exactly the defect D9 exists to
  // close for a corrected licence, not just a corrected credit.
  it("changes when input.geography's licence changes, even though credit does not — the whole record is hashed, not just credit", () => {
    const run = withGeographyCredit("IGN");
    const relicensed = {
      ...run,
      input: {
        ...run.input,
        geography: {
          ...run.input.geography!,
          licence: "Licence Ouverte 3.0",
        },
      },
    };
    const el = run.elements[0];
    expect(provenanceHash(run, el)).not.toBe(provenanceHash(relicensed, el));
  });

  it("is null-stable (unchanged) for a run declaring no geography at all — the migration-neutral property D9 requires", () => {
    const run = base();
    const el = run.elements[0];
    // Calling twice must be stable, and must not throw on the absent fields.
    expect(provenanceHash(run, el)).toBe(provenanceHash(run, el));
  });

  // NOTE: this flips the whole `geoJoin` object absent → present, not just its `decisions`
  // field — it cannot alone distinguish "the whole ledger is hashed" from "only decisions is
  // hashed" (see the field-isolation test just below, which starts from an already-non-null
  // `geoJoin` in both runs specifically to make that distinction).
  it("changes when orient.geoJoin's decisions change", () => {
    const run = base();
    const withDecision: RunManifest = {
      ...run,
      orient: {
        ...run.orient!,
        geoJoin: {
          column: "region",
          geographySha256: "abc",
          decisions: [
            {
              value: "Buenos Aires",
              featureId: "ARG-caba",
              basis: "journalist",
            },
          ],
          pending: [],
        },
      },
    };
    const el = run.elements[0];
    expect(provenanceHash(run, el)).not.toBe(provenanceHash(withDecision, el));
  });

  // Unlike the test above, both runs here already carry a non-null `geoJoin` with the SAME
  // `decisions` — only `pending` differs. This isolates a second field the same way the
  // licence test isolates `geography`'s: without it, `geoJoin: run.orient?.geoJoin?.decisions
  // ?? null` would silently satisfy every other test in this file while under-hashing
  // `pending`/`geographySha256` — a value still marked pending elsewhere in the ledger would
  // not invalidate a stale artifact.
  it("changes when orient.geoJoin's pending list changes, even though decisions does not — the whole ledger is hashed, not just decisions", () => {
    const run: RunManifest = {
      ...base(),
      orient: {
        ...base().orient!,
        geoJoin: {
          column: "region",
          geographySha256: "abc",
          decisions: [
            {
              value: "Buenos Aires",
              featureId: "ARG-caba",
              basis: "journalist",
            },
          ],
          pending: ["Córdoba"],
        },
      },
    };
    const morePending: RunManifest = {
      ...run,
      orient: {
        ...run.orient!,
        geoJoin: {
          ...run.orient!.geoJoin!,
          pending: ["Córdoba", "Rosario"],
        },
      },
    };
    const el = run.elements[0];
    expect(provenanceHash(run, el)).not.toBe(provenanceHash(morePending, el));
  });

  it("hashes identically before and after a JSON round-trip for a migrated v4 manifest", () => {
    const v4 = {
      runId: "r1",
      schemaVersion: 4,
      route: "embed",
      channel: "article-web",
      input: { data: { path: "input/data-abc.csv", sha256: "a".repeat(64) } },
      orient: {
        profile: { columns: ["country"], numericColumns: [], rowCount: 1 },
        supportsPoint: false,
        geo: {
          column: "country",
          basemap: "world",
          matched: 1,
          total: 1,
          unmatched: [],
        },
      },
      elements: [
        {
          id: "e1",
          angle: { confirmedTakeaway: "t", altInsight: "a", unit: "u" },
          proposal: {
            options: [{ id: "slope", nativeType: "slope", why: "w" }],
            excluded: [],
            chosenId: "slope",
          },
        },
      ],
      events: [],
    };
    const migrated = migrate(
      v4,
      "/tmp/geography-provenance-hash-does-not-matter",
    );
    const el = migrated.elements[0]!;
    const h1 = provenanceHash(migrated, el);
    const roundTripped = JSON.parse(JSON.stringify(migrated)) as RunManifest;
    const h2 = provenanceHash(roundTripped, roundTripped.elements[0]!);
    expect(h1).toBe(h2);
  });
});
