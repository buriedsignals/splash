import { describe, it, expect } from "bun:test";
import {
  produceAll,
  type Dispatch,
  type ProposalValidator,
} from "../src/produce-all";
import type { AcceptedProposal } from "../src/producer-spec";
import { validateAccepted } from "../src/validate-gate";
import type { BrandProfile } from "../src/brand-profile";

const p = (
  id: string,
  extra: Partial<AcceptedProposal> = {},
): AcceptedProposal => ({
  id,
  producer: "chart-native",
  format: "static",
  spec: {},
  confirmedTakeaway: "The confirmed takeaway for this fixture",
  ...extra,
});

// Loop-mechanics tests use dummy specs, so they inject a pass-through validator — they
// exercise the LOOP (drop-proof, gates, outDir routing), not the validation gate.
const PASS: ProposalValidator = () => ({ ok: true, warnings: [] });

// Loop-mechanics/validation tests inject an always-ready preflight so they stay hermetic
// (the real default consults the machine's env/node_modules — that path has its own
// dedicated tests in tests/preflight.test.ts and the C2 gate describe below).
const READY = () => [];

describe("produceAll — loop mechanics", () => {
  it("reports EVERY accepted proposal even when the middle one throws (drop-proof)", async () => {
    const dispatch: Dispatch = async (prop) => {
      if (prop.id === "p2") throw new Error("boom");
      return { status: "produced", outputs: [`out/${prop.id}.png`] };
    };
    const { results } = await produceAll(
      [p("p1"), p("p2"), p("p3")],
      "out",
      dispatch,
      PASS,
    );
    expect(results.map((r) => r.id)).toEqual(["p1", "p2", "p3"]);
    expect(results.map((r) => r.status)).toEqual([
      "produced",
      "failed",
      "produced",
    ]);
    expect(results[1].error).toContain("boom");
  });

  it("refuses a prose proposal without confirmation (needs-confirmation, not produced)", async () => {
    const dispatch: Dispatch = async () => ({ status: "produced" });
    const { results } = await produceAll(
      [p("p1", { provenance: "prose" })],
      "out",
      dispatch,
      PASS,
    );
    expect(results[0].status).toBe("needs-confirmation");
  });

  it("produces a prose proposal once confirmedTable is true", async () => {
    const dispatch: Dispatch = async () => ({ status: "produced" });
    const { results } = await produceAll(
      [p("p1", { provenance: "prose", confirmedTable: true })],
      "out",
      dispatch,
      PASS,
    );
    expect(results[0].status).toBe("produced");
  });

  it("passes the per-proposal outDir <outDir>/<id> to dispatch", async () => {
    let seen = "";
    const dispatch: Dispatch = async (_p, dir) => {
      seen = dir;
      return { status: "produced" };
    };
    await produceAll([p("p1")], "root", dispatch, PASS);
    expect(seen).toBe("root/p1");
  });

  it("carries dispatch's needs-fallback through unchanged", async () => {
    const dispatch: Dispatch = async () => ({
      status: "needs-fallback",
      reason: "UnsupportedNativeType: sankey",
    });
    const { results } = await produceAll([p("p1")], "out", dispatch, PASS);
    expect(results[0].status).toBe("needs-fallback");
    expect(results[0].reason).toContain("sankey");
  });

  it("stamps generatedAt AFTER all dispatches (the produce-generation anchor for gate-render provenance)", async () => {
    const before = Date.now();
    const dispatch: Dispatch = async () => ({ status: "produced" });
    const report = await produceAll([p("p1")], "out", dispatch, PASS);
    expect(report.generatedAt).toBeString();
    const stamped = Date.parse(report.generatedAt ?? "");
    expect(stamped).toBeGreaterThanOrEqual(before);
    expect(stamped).toBeLessThanOrEqual(Date.now());
  });
});

// Gate 3 reset (the re-produce invalidation invariant): a fresh produce is ALWAYS an
// unreviewed, unapproved artifact — even if a re-produce follows a proposal that was
// already reviewed/approved before a correction (e.g. a source fix). produceAll never
// reads a prior report, so this already holds structurally; these tests additionally
// prove the explicit reset survives a dispatch that (adversarially, mimicking a future
// bug) tries to smuggle a stale reviewed/renderApproved/approvedHash through its return.
describe("produceAll — Gate 3 reset on (re-)produce", () => {
  it("never sets reviewed/renderApproved from a normal dispatch result (starts distrusted)", async () => {
    const dispatch: Dispatch = async () => ({
      status: "produced",
      outputs: ["out/p1.png"],
    });
    const { results } = await produceAll([p("p1")], "out", dispatch, PASS);
    expect(results[0].reviewed).toBeUndefined();
    expect(results[0].renderApproved).toBe(false);
    expect(results[0].approvedHash).toBeUndefined();
  });

  it("strips a stale reviewed/renderApproved/approvedHash even if dispatch smuggles it through", async () => {
    // Simulates a re-produce whose dispatch (a future refactor, a careless cast) leaks
    // fields from a PRIOR report — the loop must still ship a distrusted fresh result.
    const dispatch: Dispatch = async () =>
      ({
        status: "produced",
        outputs: ["out/p1.png"],
        reviewed: true,
        renderApproved: true,
        approvedHash: "stale-hash-from-a-prior-approved-render",
      }) as unknown as Awaited<ReturnType<Dispatch>>;
    const { results } = await produceAll([p("p1")], "out", dispatch, PASS);
    expect(results[0].status).toBe("produced");
    expect(results[0].reviewed).toBeUndefined();
    expect(results[0].renderApproved).toBe(false);
    expect(results[0].approvedHash).toBeUndefined();
  });
});

// The hard rule: not-embed ⇒ never interactive/scrolly. A shipped format must belong to
// its channel's allowed set (skills/splash/src/channel.ts). A violation is a fail-hard
// recorded result — never a thrown exception, never a silent ship.
describe("produceAll — channel/format gate", () => {
  it("blocks an interactive proposal on a social-feed channel (fail-hard, not silently shipped)", async () => {
    let dispatched = false;
    const dispatch: Dispatch = async () => {
      dispatched = true;
      return { status: "produced" };
    };
    const { results } = await produceAll(
      [p("p1", { channel: "social-feed", format: "interactive" })],
      "out",
      dispatch,
      PASS,
    );
    expect(dispatched).toBe(false); // dispatch NEVER ran — never shipped
    expect(results[0].status).toBe("failed");
    expect(results[0].error).toContain("interactive");
    expect(results[0].error).toContain("social-feed");
  });

  it("allows an interactive proposal on the article-web channel", async () => {
    let dispatched = false;
    const dispatch: Dispatch = async () => {
      dispatched = true;
      return { status: "produced" };
    };
    const { results } = await produceAll(
      [p("p1", { channel: "article-web", format: "interactive" })],
      "out",
      dispatch,
      PASS,
    );
    expect(dispatched).toBe(true);
    expect(results[0].status).toBe("produced");
  });

  it("allows a video proposal on the social-vertical channel", async () => {
    const dispatch: Dispatch = async () => ({ status: "produced" });
    const { results } = await produceAll(
      [p("p1", { channel: "social-vertical", format: "video" })],
      "out",
      dispatch,
      PASS,
    );
    expect(results[0].status).toBe("produced");
  });

  it("defaults to article-web when channel is absent (legacy proposals unaffected)", async () => {
    const dispatch: Dispatch = async () => ({ status: "produced" });
    const { results } = await produceAll(
      [p("p1", { format: "interactive" })],
      "out",
      dispatch,
      PASS,
    );
    expect(results[0].status).toBe("produced");
  });

  it("fails-hard a GARBLED channel string instead of widening it to article-web (fail-closed)", async () => {
    // accepted.json is untyped JSON.parse at the CLI seam, so a typo'd channel can
    // reach the loop despite the Channel type. It used to default to article-web —
    // the MOST PERMISSIVE channel — silently allowing interactive/scrolly.
    let dispatched = false;
    const dispatch: Dispatch = async () => {
      dispatched = true;
      return { status: "produced" };
    };
    const { results } = await produceAll(
      [
        p("p1", {
          channel: "social-vertica" as never, // the typo
          format: "interactive",
        }),
      ],
      "out",
      dispatch,
      PASS,
    );
    expect(dispatched).toBe(false); // never shipped
    expect(results[0].status).toBe("failed");
    expect(results[0].error).toContain('unknown channel "social-vertica"');
    expect(results[0].error).toContain("social-feed"); // lists the valid channels
  });

  it("keeps the loop drop-proof when one proposal carries a garbled channel", async () => {
    const dispatch: Dispatch = async () => ({ status: "produced" });
    const { results } = await produceAll(
      [
        p("p1", { channel: "article-web", format: "static" }),
        p("p2", { channel: "newsleter" as never, format: "static" }),
        p("p3", { channel: "social-feed", format: "video" }),
      ],
      "out",
      dispatch,
      PASS,
    );
    expect(results.map((r) => r.status)).toEqual([
      "produced",
      "failed",
      "produced",
    ]);
  });

  // Normalize ONCE at the gate, thread the CANONICAL value to dispatch. The regression
  // this locks: the gate resolved an alias/case-variant channel ("feed" → social-feed)
  // and accepted the proposal, but dispatch still received the RAW p.channel — adapters'
  // channelEnvFor put the raw string into SPLASH_CHANNEL and chart-native's env parsing
  // silently defaulted it to article-web, shipping a landscape 1200x675 render for a
  // square social-feed proposal with status "produced" (a silent wrong-aspect ship).
  it('threads the NORMALIZED canonical channel to dispatch — alias "feed" arrives as "social-feed"', async () => {
    let seen: string | undefined;
    const dispatch: Dispatch = async (prop) => {
      seen = prop.channel;
      return { status: "produced" };
    };
    const { results } = await produceAll(
      [p("p1", { channel: "feed" as never, format: "static" })],
      "out",
      dispatch,
      PASS,
    );
    expect(results[0].status).toBe("produced");
    expect(seen).toBe("social-feed");
  });

  it('threads the canonical channel for a case-variant too — "Social-Feed" arrives as "social-feed"', async () => {
    let seen: string | undefined;
    const dispatch: Dispatch = async (prop) => {
      seen = prop.channel;
      return { status: "produced" };
    };
    await produceAll(
      [p("p1", { channel: "Social-Feed" as never, format: "static" })],
      "out",
      dispatch,
      PASS,
    );
    expect(seen).toBe("social-feed");
  });

  it("threads the resolved article-web default to dispatch when the proposal has no channel", async () => {
    let seen: string | undefined;
    const dispatch: Dispatch = async (prop) => {
      seen = prop.channel;
      return { status: "produced" };
    };
    await produceAll([p("p1", { format: "static" })], "out", dispatch, PASS);
    expect(seen).toBe("article-web");
  });
});

// GUARD 1 — producer-match. The producer that ACTUALLY ran (reported by the dispatch as
// `actualProducer`) must equal the accepted proposal's declared producer. A real QA
// finding: a dw-chart proposal was silently produced with chart-native. This is the
// mechanical teeth — a flip is a fail-hard recorded result, never a silent ship. The ONE
// sanctioned switch is native→dw (the FALLBACK_TO_DW re-emit).
describe("produceAll — producer-match gate (GUARD 1)", () => {
  it("REFUSES a dw→native flip: dw-chart accepted but dispatch ran chart-native", async () => {
    const dispatch: Dispatch = async () => ({
      status: "produced",
      outputs: ["out/p1.png"],
      actualProducer: "chart-native", // the silent flip
    });
    const { results } = await produceAll(
      [p("p1", { producer: "dw-chart", format: "static" })],
      "out",
      dispatch,
      PASS,
      null,
      READY,
    );
    expect(results[0].status).toBe("failed");
    expect(results[0].error).toContain("dw-chart");
    expect(results[0].error).toContain("chart-native");
    // the report records the truth of what ran, not just the declaration
    expect(results[0].actualProducer).toBe("chart-native");
  });

  it("ALLOWS the sanctioned native→dw fallback (chart-native accepted, dw-chart ran)", async () => {
    const dispatch: Dispatch = async () => ({
      status: "produced",
      outputs: ["out/p1.png"],
      actualProducer: "dw-chart",
    });
    const { results } = await produceAll(
      [p("p1", { producer: "chart-native", format: "static" })],
      "out",
      dispatch,
      PASS,
    );
    expect(results[0].status).toBe("produced");
    expect(results[0].actualProducer).toBe("dw-chart");
  });

  it("records actualProducer = declared when the dispatch reports no switch", async () => {
    const dispatch: Dispatch = async () => ({
      status: "produced",
      outputs: ["out/p1.png"],
      actualProducer: "chart-native",
    });
    const { results } = await produceAll(
      [p("p1", { producer: "chart-native" })],
      "out",
      dispatch,
      PASS,
    );
    expect(results[0].status).toBe("produced");
    expect(results[0].actualProducer).toBe("chart-native");
  });

  it("defaults actualProducer to the declared producer when the dispatch omits it (back-compat)", async () => {
    const dispatch: Dispatch = async () => ({
      status: "produced",
      outputs: ["out/p1.png"],
    });
    const { results } = await produceAll(
      [p("p1", { producer: "map-native" })],
      "out",
      dispatch,
      PASS,
      null,
      READY,
    );
    expect(results[0].status).toBe("produced");
    expect(results[0].actualProducer).toBe("map-native");
  });

  it("does NOT judge a non-produced result (needs-fallback) on producer-match", async () => {
    const dispatch: Dispatch = async () => ({
      status: "needs-fallback",
      reason: "UnsupportedNativeType: sankey",
    });
    const { results } = await produceAll(
      [p("p1", { producer: "chart-native" })],
      "out",
      dispatch,
      PASS,
    );
    expect(results[0].status).toBe("needs-fallback");
  });
});

// The validation gate uses the REAL default validator (no injected pass-through).
const validDwSpec = {
  type: "d3-bars",
  title: "Estonia recycles the most packaging waste in Europe",
  data: "country,rate\nEstonia,63\nMalta,31",
  source: { name: "Eurostat", url: "https://ec.europa.eu/eurostat" },
  altInsight: "Estonia recycles the most packaging waste in Europe.",
};

describe("produceAll — validation gate (real validator)", () => {
  const spy = () => {
    const produced: string[] = [];
    const dispatch: Dispatch = async (prop) => {
      produced.push(prop.id);
      return { status: "produced", outputs: [`out/${prop.id}.png`] };
    };
    return { dispatch, produced };
  };

  it("BLOCKS an invalid spec before dispatch (fails loud, never produces it)", async () => {
    const { dispatch, produced } = spy();
    const { results } = await produceAll(
      [
        {
          id: "bad",
          producer: "dw-chart",
          format: "static",
          spec: { type: "d3-bars" },
          confirmedTakeaway: "The confirmed takeaway for this fixture",
        },
      ],
      "out",
      dispatch,
      validateAccepted,
      null,
      READY,
    );
    expect(produced).toEqual([]); // dispatch NEVER ran for the invalid spec
    expect(results[0].status).toBe("failed");
    expect(results[0].error).toContain("validation");
  });

  it("produces a valid spec (dispatch runs)", async () => {
    const { dispatch, produced } = spy();
    const { results } = await produceAll(
      [
        {
          id: "ok",
          producer: "dw-chart",
          format: "static",
          spec: validDwSpec,
          confirmedTakeaway: "The confirmed takeaway for this fixture",
        },
      ],
      "out",
      dispatch,
      validateAccepted,
      null,
      READY,
    );
    expect(produced).toEqual(["ok"]);
    expect(results[0].status).toBe("produced");
  });

  it("never drops: an invalid and a valid proposal both appear in results", async () => {
    const { dispatch } = spy();
    const { results } = await produceAll(
      [
        {
          id: "a",
          producer: "dw-chart",
          format: "static",
          spec: validDwSpec,
          confirmedTakeaway: "The confirmed takeaway for element a",
        },
        {
          id: "b",
          producer: "dw-chart",
          format: "static",
          spec: { type: "d3-bars" },
          confirmedTakeaway: "The confirmed takeaway for element b",
        },
      ],
      "out",
      dispatch,
      validateAccepted,
      null,
      READY,
    );
    expect(results.map((r) => r.id).sort()).toEqual(["a", "b"]);
    expect(results.find((r) => r.id === "b")?.status).toBe("failed");
  });

  it("BLOCKS two proposals stamped with the byte-identical confirmedTakeaway (GUARD 3b)", async () => {
    // The Wave-9 shipped miss: one combined takeaway copied onto every accepted
    // element. Both carriers fail validation; the distinctly-confirmed one produces.
    const { dispatch, produced } = spy();
    const stamped = "Both at once: the price cooldown AND the plateau";
    const { results } = await produceAll(
      [
        {
          id: "a",
          producer: "dw-chart",
          format: "static",
          spec: validDwSpec,
          confirmedTakeaway: stamped,
        },
        {
          id: "b",
          producer: "dw-chart",
          format: "static",
          spec: validDwSpec,
          confirmedTakeaway: stamped,
        },
        {
          id: "c",
          producer: "dw-chart",
          format: "static",
          spec: validDwSpec,
          confirmedTakeaway: "Element c's own confirmed claim",
        },
      ],
      "out",
      dispatch,
      validateAccepted,
      null,
      READY,
    );
    expect(results.map((r) => r.status)).toEqual([
      "failed",
      "failed",
      "produced",
    ]);
    expect(results[0].error).toContain("confirmedTakeaway");
    expect(produced).toEqual(["c"]);
  });

  it("fails-hard a hand-authored row-driven bar on a portrait channel (guardrail parity, dispatch never runs)", async () => {
    // ENFORCEMENT SLICE 2 — a spec the orchestrator hand-authored (bypassing suggest-chart)
    // must still clear suggest-chart's deterministic aspect↔type guard. The bar is a valid
    // ChartSpec, so the producer validator passes; the guardrail-parity gate is what catches
    // the portrait/row-driven mismatch. Never dispatched, recorded failed (drop-proof).
    const { dispatch, produced } = spy();
    const { results } = await produceAll(
      [
        {
          id: "bypass",
          producer: "dw-chart",
          format: "static",
          channel: "social-vertical",
          spec: validDwSpec,
          confirmedTakeaway: "The confirmed takeaway for this fixture",
        },
      ],
      "out",
      dispatch,
      validateAccepted,
      null,
      READY,
    );
    expect(produced).toEqual([]); // the producer never ran
    expect(results[0].status).toBe("failed");
    expect(results[0].error).toContain("row-driven");
  });

  it("does not crash on a producer outside the union — records it failed, keeps drop-proof", async () => {
    const { dispatch, produced } = spy();
    const { results } = await produceAll(
      [
        {
          id: "a",
          producer: "dw-chart",
          format: "static",
          spec: validDwSpec,
          confirmedTakeaway: "The confirmed takeaway for element a",
        },
        {
          id: "x",
          producer: "sankey-native" as never,
          format: "static",
          spec: {},
          confirmedTakeaway: "The confirmed takeaway for element x",
        },
        {
          id: "c",
          producer: "dw-chart",
          format: "static",
          spec: validDwSpec,
          confirmedTakeaway: "The confirmed takeaway for element c",
        },
      ],
      "out",
      dispatch,
      validateAccepted,
      null,
      READY,
    );
    expect(results.map((r) => r.id).sort()).toEqual(["a", "c", "x"]);
    expect(results.find((r) => r.id === "x")?.status).toBe("failed");
    expect(produced.sort()).toEqual(["a", "c"]); // the good ones still produced
  });
});

describe("produceAll — newsroom profile defaults", () => {
  const profile = {
    palette: ["#0A5C36"],
    source: { name: "Heidi.news" },
    lang: "fr",
  };

  it("merges profile source/lang/colour onto a spec that omits them, before dispatch", async () => {
    let seen: Record<string, unknown> = {};
    const dispatch: Dispatch = async (prop) => {
      seen = prop.spec as Record<string, unknown>;
      return { status: "produced" };
    };
    await produceAll([p("p1")], "out", dispatch, PASS, profile);
    expect(seen.source).toEqual({ name: "Heidi.news" });
    expect(seen.lang).toBe("fr");
    expect(seen.baseColor).toBe("#0A5C36"); // chart-native consumes colour
    expect(seen.brandExplicit).toBe(true);
  });

  it("keeps the per-element spec value over the profile default", async () => {
    let seen: Record<string, unknown> = {};
    const dispatch: Dispatch = async (prop) => {
      seen = prop.spec as Record<string, unknown>;
      return { status: "produced" };
    };
    await produceAll(
      [p("p1", { spec: { source: { name: "AP" }, lang: "en" } })],
      "out",
      dispatch,
      PASS,
      profile,
    );
    expect(seen.source).toEqual({ name: "AP" });
    expect(seen.lang).toBe("en");
  });

  it("does NOT seed brand colour onto a map-native spec (source/lang still merge)", async () => {
    let seen: Record<string, unknown> = {};
    const dispatch: Dispatch = async (prop) => {
      seen = prop.spec as Record<string, unknown>;
      return { status: "produced" };
    };
    await produceAll(
      [p("m1", { producer: "map-native", format: "static" })],
      "out",
      dispatch,
      PASS,
      profile,
      READY,
    );
    expect(seen.baseColor).toBeUndefined();
    expect(seen.source).toEqual({ name: "Heidi.news" });
    expect(seen.lang).toBe("fr");
  });

  it("leaves specs untouched when no profile is passed (unchanged behaviour)", async () => {
    let seen: Record<string, unknown> = {};
    const dispatch: Dispatch = async (prop) => {
      seen = prop.spec as Record<string, unknown>;
      return { status: "produced" };
    };
    await produceAll([p("p1")], "out", dispatch, PASS);
    expect(seen).toEqual({});
  });
});

describe("produceAll — newsroom profile with the REAL validator (regression: false duplicate)", () => {
  const profile: BrandProfile = {
    palette: ["#0A5C36"],
    source: { name: "Heidi.news" },
    lang: "fr",
  };

  it("still PRODUCES a single valid proposal when a profile is present (no false duplicate-takeaway)", async () => {
    const produced: string[] = [];
    const dispatch: Dispatch = async (prop) => {
      produced.push(prop.id);
      return { status: "produced", outputs: [`out/${prop.id}.png`] };
    };
    const { results } = await produceAll(
      [
        {
          id: "ok",
          producer: "dw-chart",
          format: "static",
          spec: validDwSpec,
          confirmedTakeaway:
            "Estonia recycles the most packaging waste in Europe",
        },
      ],
      "out",
      dispatch,
      validateAccepted, // the REAL validator — this is where the merge-clone identity bug bit
      profile,
      READY,
    );
    expect(results[0].status).toBe("produced");
    expect(produced).toEqual(["ok"]);
  });

  it("produces two sibling proposals with distinct takeaways under a profile", async () => {
    const produced: string[] = [];
    const dispatch: Dispatch = async (prop) => {
      produced.push(prop.id);
      return { status: "produced", outputs: [`out/${prop.id}.png`] };
    };
    const { results } = await produceAll(
      [
        {
          id: "a",
          producer: "dw-chart",
          format: "static",
          spec: { ...validDwSpec, title: "Estonia leads packaging recycling" },
          confirmedTakeaway: "Estonia leads packaging recycling in Europe",
        },
        {
          id: "b",
          producer: "dw-chart",
          format: "static",
          spec: { ...validDwSpec, title: "Malta lags on packaging recycling" },
          confirmedTakeaway: "Malta lags far behind on packaging recycling",
        },
      ],
      "out",
      dispatch,
      validateAccepted,
      profile,
      READY,
    );
    expect(results.map((r) => r.status)).toEqual(["produced", "produced"]);
    expect(produced.sort()).toEqual(["a", "b"]);
  });

  it("stays drop-proof: a null spec + profile fails gracefully, the sibling still produces", async () => {
    const produced: string[] = [];
    const dispatch: Dispatch = async (prop) => {
      produced.push(prop.id);
      return { status: "produced", outputs: [`out/${prop.id}.png`] };
    };
    const { results } = await produceAll(
      [
        {
          id: "bad",
          producer: "dw-chart",
          format: "static",
          spec: null as unknown,
          confirmedTakeaway: "A takeaway for the malformed element",
        },
        {
          id: "good",
          producer: "dw-chart",
          format: "static",
          spec: validDwSpec,
          confirmedTakeaway:
            "Estonia recycles the most packaging waste in Europe",
        },
      ],
      "out",
      dispatch,
      validateAccepted,
      profile,
      READY,
    );
    expect(results.map((r) => r.id)).toEqual(["bad", "good"]); // both reported (no crash)
    expect(results.find((r) => r.id === "bad")?.status).toBe("failed");
    expect(results.find((r) => r.id === "good")?.status).toBe("produced");
  });
});

// Observability, end-to-end: the dropped-hint advisory warning from validateAccepted must ride the
// success-path result onto ProposalResult.warnings (what the render gate surfaces). Uses the REAL
// validateAccepted (not the pass-through) so this proves the wiring through the whole spine.
describe("produceAll — dropped source-hint warning surfaces on the result", () => {
  const genericFallbackSpec = {
    producer: "chart-native",
    nativeType: "bar",
    title: "Un titre",
    data: "cat,val\nA,1\nB,2",
    source: { name: "Chiffres tels que rapportés dans cet article" },
    altInsight: "insight",
    lang: "fr",
  };
  const dispatch: Dispatch = async () => ({
    status: "produced",
    outputs: ["out/x.png"],
  });

  it("attaches the warning when a table-backed ship uses the generic fallback with no sourceHint", async () => {
    const { results } = await produceAll(
      [p("x", { provenance: "table", spec: genericFallbackSpec })],
      "out",
      dispatch,
      validateAccepted,
    );
    expect(results[0].status).toBe("produced");
    expect(results[0].warnings?.some((w) => w.includes("sourceHint"))).toBe(
      true,
    );
  });

  it("does NOT attach the warning for prose provenance (generic fallback is legitimate there)", async () => {
    const { results } = await produceAll(
      [
        p("x", {
          provenance: "prose",
          confirmedTable: true,
          spec: genericFallbackSpec,
        }),
      ],
      "out",
      dispatch,
      validateAccepted,
    );
    expect(results[0].status).toBe("produced");
    expect(
      (results[0].warnings ?? []).some((w) => w.includes("sourceHint")),
    ).toBe(false);
  });
});

// C2 preflight gate — the engine's keys/deps are checked BEFORE validation/dispatch, in
// journalist language (which key, where to get it, where to put it), replacing the lazy
// deep failures (dw-chart's token() throw at the first API call mid-PRODUCTION).
describe("produceAll — engine preflight gate (C2)", () => {
  it("should fail a proposal loud, in journalist language, when the engine preflight is not ready", async () => {
    const dispatched: string[] = [];
    const dispatch: Dispatch = async (prop) => {
      dispatched.push(prop.id);
      return { status: "produced", outputs: [] };
    };
    const notReady = () => [
      {
        kind: "env" as const,
        message:
          "dw-chart needs DATAWRAPPER_API_TOKEN (create a token at https://app.datawrapper.de/account/api-tokens) — add it to /splash/.env",
      },
    ];
    const report = await produceAll(
      [
        p("el-1", {
          producer: "dw-chart",
          spec: { title: "t", data: "a,b\n1,2" },
        }),
      ],
      "out",
      dispatch,
      PASS,
      null,
      notReady,
    );
    expect(report.results[0].status).toBe("failed");
    expect(report.results[0].error).toContain("DATAWRAPPER_API_TOKEN");
    expect(report.results[0].error).toContain("/splash/.env");
    expect(dispatched).toEqual([]); // never dispatched — blocked BEFORE production
  });

  it("should produce a step-12 re-format entry into its own outDir, leaving the first delivery untouched", async () => {
    const outDirs: string[] = [];
    const fakeDispatch = async (_p: unknown, outDir: string) => {
      outDirs.push(outDir);
      return { status: "produced" as const, outputs: [] };
    };
    const alwaysValid = () => ({ ok: true as const, warnings: [] });
    const base = {
      producer: "dw-chart" as const,
      spec: { title: "t", data: "a,b\n1,2" },
      confirmedTakeaway: "the takeaway",
    };
    const report = await produceAll(
      [
        {
          ...base,
          id: "el-tariffs",
          format: "static" as const,
          channel: "article-web" as const,
        },
        {
          ...base,
          id: "el-tariffs-video",
          format: "video" as const,
          channel: "social-feed" as const,
        },
      ],
      "/tmp/step12-test-out",
      fakeDispatch,
      alwaysValid,
      undefined, // profile
      () => [], // preflight always-ready: this test pins outDir keying, not machine keys
    );
    expect(report.results.map((r) => r.status)).toEqual([
      "produced",
      "produced",
    ]);
    expect(outDirs).toEqual([
      "/tmp/step12-test-out/el-tariffs",
      "/tmp/step12-test-out/el-tariffs-video",
    ]);
  });

  // Step-12 copies confirmedTakeaway VERBATIM onto the <id>-<format> entry (same element,
  // another format) — GUARD 3b must sanction exactly that twin shape, and ONLY it: two
  // DIFFERENT elements sharing a takeaway stay refused (the Wave-9 miss, tested above).
  it("should let a step-12 <id>-<format> twin share the takeaway verbatim (GUARD 3b exemption), with the REAL validator", async () => {
    const dispatch: Dispatch = async () => ({
      status: "produced",
      outputs: ["out/x.png"],
    });
    const takeaway = "Estonia recycles the most packaging waste in Europe";
    const { results } = await produceAll(
      [
        {
          id: "el-recycling",
          producer: "dw-chart",
          format: "static",
          channel: "article-web",
          spec: validDwSpec,
          confirmedTakeaway: takeaway,
        },
        {
          id: "el-recycling-video",
          producer: "dw-chart",
          format: "video",
          channel: "article-web",
          spec: validDwSpec,
          confirmedTakeaway: takeaway, // copied VERBATIM, as step 12 prescribes
        },
      ],
      "out",
      dispatch,
      validateAccepted,
      null,
      READY,
    );
    expect(results.map((r) => r.status)).toEqual(["produced", "produced"]);
  });

  it("should refuse a twin whose id suffix contradicts its own pinned format (review F7)", async () => {
    const dispatch: Dispatch = async () => ({
      status: "produced",
      outputs: ["out/x.png"],
    });
    const takeaway = "Estonia recycles the most packaging waste in Europe";
    const { results } = await produceAll(
      [
        {
          id: "el-recycling",
          producer: "dw-chart",
          format: "static",
          channel: "article-web",
          spec: validDwSpec,
          confirmedTakeaway: takeaway,
        },
        {
          // id claims a video re-format but the pinned format is static — the shape can
          // only come from an id chosen to dodge GUARD 3b, never from step 12.
          id: "el-recycling-video",
          producer: "dw-chart",
          format: "static",
          channel: "article-web",
          spec: validDwSpec,
          confirmedTakeaway: takeaway,
        },
      ],
      "out",
      dispatch,
      validateAccepted,
      null,
      READY,
    );
    expect(results.map((r) => r.status)).toEqual(["failed", "failed"]);
    expect(results[0].error).toContain("duplicate confirmedTakeaway");
  });

  it("should refuse two distinct elements sharing a takeaway when the suffix is not a format (review negative pin)", async () => {
    const dispatch: Dispatch = async () => ({
      status: "produced",
      outputs: ["out/x.png"],
    });
    const takeaway = "Estonia recycles the most packaging waste in Europe";
    const { results } = await produceAll(
      [
        {
          id: "el-recycling",
          producer: "dw-chart",
          format: "static",
          channel: "article-web",
          spec: validDwSpec,
          confirmedTakeaway: takeaway,
        },
        {
          id: "el-recycling-map",
          producer: "dw-chart",
          format: "static",
          channel: "article-web",
          spec: validDwSpec,
          confirmedTakeaway: takeaway,
        },
      ],
      "out",
      dispatch,
      validateAccepted,
      null,
      READY,
    );
    expect(results.map((r) => r.status)).toEqual(["failed", "failed"]);
    expect(results[0].error).toContain("duplicate confirmedTakeaway");
  });

  it("should dispatch normally when the injected preflight reports ready", async () => {
    const dispatched: string[] = [];
    const dispatch: Dispatch = async (prop) => {
      dispatched.push(prop.id);
      return { status: "produced", outputs: [] };
    };
    const { results } = await produceAll(
      [p("el-1")],
      "out",
      dispatch,
      PASS,
      null,
      () => [],
    );
    expect(results[0].status).toBe("produced");
    expect(dispatched).toEqual(["el-1"]);
  });
});
