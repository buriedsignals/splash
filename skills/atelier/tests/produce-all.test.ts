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
