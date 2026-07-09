import { describe, it, expect } from "bun:test";
import {
  produceAll,
  type Dispatch,
  type ProposalValidator,
} from "../src/produce-all";
import type { AcceptedProposal } from "../src/producer-spec";

const p = (
  id: string,
  extra: Partial<AcceptedProposal> = {},
): AcceptedProposal => ({
  id,
  producer: "chart-native",
  format: "static",
  spec: {},
  ...extra,
});

// Loop-mechanics tests use dummy specs, so they inject a pass-through validator — they
// exercise the LOOP (drop-proof, gates, outDir routing), not the validation gate.
const PASS: ProposalValidator = () => ({ ok: true, warnings: [] });

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
// its channel's allowed set (skills/atelier/src/channel.ts). A violation is a fail-hard
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
        },
      ],
      "out",
      dispatch,
    );
    expect(produced).toEqual([]); // dispatch NEVER ran for the invalid spec
    expect(results[0].status).toBe("failed");
    expect(results[0].error).toContain("validation");
  });

  it("produces a valid spec (dispatch runs)", async () => {
    const { dispatch, produced } = spy();
    const { results } = await produceAll(
      [{ id: "ok", producer: "dw-chart", format: "static", spec: validDwSpec }],
      "out",
      dispatch,
    );
    expect(produced).toEqual(["ok"]);
    expect(results[0].status).toBe("produced");
  });

  it("never drops: an invalid and a valid proposal both appear in results", async () => {
    const { dispatch } = spy();
    const { results } = await produceAll(
      [
        { id: "a", producer: "dw-chart", format: "static", spec: validDwSpec },
        {
          id: "b",
          producer: "dw-chart",
          format: "static",
          spec: { type: "d3-bars" },
        },
      ],
      "out",
      dispatch,
    );
    expect(results.map((r) => r.id).sort()).toEqual(["a", "b"]);
    expect(results.find((r) => r.id === "b")?.status).toBe("failed");
  });

  it("does not crash on a producer outside the union — records it failed, keeps drop-proof", async () => {
    const { dispatch, produced } = spy();
    const { results } = await produceAll(
      [
        { id: "a", producer: "dw-chart", format: "static", spec: validDwSpec },
        {
          id: "x",
          producer: "sankey-native" as never,
          format: "static",
          spec: {},
        },
        { id: "c", producer: "dw-chart", format: "static", spec: validDwSpec },
      ],
      "out",
      dispatch,
    );
    expect(results.map((r) => r.id).sort()).toEqual(["a", "c", "x"]);
    expect(results.find((r) => r.id === "x")?.status).toBe("failed");
    expect(produced.sort()).toEqual(["a", "c"]); // the good ones still produced
  });
});
