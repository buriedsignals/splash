import { beforeEach, describe, expect, it } from "bun:test";
import { cpSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { Bases } from "../src/tools/fs.ts";
import {
  assertJournalistOwns,
  type Dialogue,
  storyboardTools,
} from "../src/tools/storyboard.ts";
import { parseStoryboard } from "../../skills/splash/scripts/gate-contract.mjs";

const CHECKOUT = resolve(import.meta.dirname, "../..");
const SOURCE = join(CHECKOUT, "stories/stress-p-transport-ridership/source");
const TAKEAWAY =
  "Lisboa alone carries 214 of the 394 million trips these six Portuguese city networks recorded in 2025 — more than twice Porto's 96 million.";
const call = (tool: { execute: Function }, params: object) =>
  tool.execute("t1", params, undefined, undefined, undefined);

let bases: Bases;
let dialogue: Dialogue;
const meta = () =>
  parseStoryboard(readFileSync(join(bases.storyDir, "STORYBOARD.md"), "utf8"))
    .meta as Record<string, any>;

beforeEach(async () => {
  const root = await mkdtemp(join(tmpdir(), "splash-storyboard-"));
  const storyDir = join(root, "stories", "demo");
  mkdirSync(storyDir, { recursive: true });
  cpSync(SOURCE, join(storyDir, "source"), { recursive: true });
  bases = { root, storyDir };
  dialogue = { lastJournalist: "", lastProposal: "" };
});

describe("journalist ownership", () => {
  it("should accept a value that is the journalist's own words", () => {
    expect(() =>
      assertJournalistOwns(
        "subject",
        "Lisboa, the network the article opens on",
        {
          lastJournalist:
            "The subject is Lisboa, the network the article opens on.",
          lastProposal: "",
        },
      ),
    ).not.toThrow();
  });

  it("should accept a proposal the journalist said yes to", () => {
    expect(() =>
      assertJournalistOwns("comparison", "Porto's 96 million trips", {
        lastJournalist: "Yes, that works.",
        lastProposal:
          "I propose comparing it to Porto's 96 million trips. Does that work?",
      }),
    ).not.toThrow();
  });

  it("should refuse a value the journalist never gave, naming what they actually said", () => {
    expect(() =>
      assertJournalistOwns("subject", "The transport networks of six cities", {
        lastJournalist: "Unattributed, as of 2026-08-21.",
        lastProposal: "",
      }),
    ).toThrow(/must be the journalist's own answer.*Unattributed/);
  });
});

describe("storyboard tools", () => {
  it("should record the takeaway with the grounding verdict computed from the data", async () => {
    dialogue.lastJournalist = TAKEAWAY;
    await call(storyboardTools(bases, dialogue).recordTakeaway, {
      sentence: TAKEAWAY,
    });
    expect(meta().takeaway).toBe(TAKEAWAY);
    expect(meta().grounding).toBe("supported");
  });

  it("should not write STORYBOARD.md when the takeaway is not the journalist's", async () => {
    dialogue.lastJournalist = "Landscape.";
    await expect(
      call(storyboardTools(bases, dialogue).recordTakeaway, {
        sentence: TAKEAWAY,
      }),
    ).rejects.toThrow(/journalist's own answer/);
    expect(existsSync(join(bases.storyDir, "STORYBOARD.md"))).toBe(false);
  });

  it("should record limits as 'none' without requiring the journalist's words", async () => {
    dialogue.lastJournalist = "I see no limit.";
    await call(storyboardTools(bases, dialogue).recordHand, {
      field: "limits",
      value: "none",
    });
    expect(meta().limits).toBe("none");
  });

  it("should create the slot and record whether its format is reachable", async () => {
    const tools = storyboardTools(bases, dialogue);
    dialogue.lastJournalist = "A chart.";
    await call(tools.recordSlot, {
      slot: "1",
      field: "medium",
      value: "chart",
    });
    dialogue.lastJournalist = "Static.";
    await call(tools.recordSlot, {
      slot: "1",
      field: "format",
      value: "static",
    });
    const slot = meta().slots[0];
    expect(slot.medium).toBe("chart");
    expect(slot.reachable).toBe("yes");
  });

  it("should refuse a field outside the slot vocabulary", async () => {
    await expect(
      call(storyboardTools(bases, dialogue).recordSlot, {
        slot: "1",
        field: "colour",
        value: "red",
      }),
    ).rejects.toThrow(/field must be one of/);
  });
});

describe("claim shape", () => {
  it("should record a comparison the journalist described", async () => {
    dialogue.lastJournalist = "It is a comparison, about the column trips_millions: Lisboa against Porto.";
    await call(storyboardTools(bases, dialogue).recordClaim, {
      shape: "comparison",
      column: "trips_millions",
      entity: "Lisboa",
      versus: "Porto",
      direction: "greater",
    });
    expect(meta().claimShape).toBe("comparison");
  });

  it("should refuse a comparison with no second row, with Splash's own reason", async () => {
    dialogue.lastJournalist = "A comparison about trips_millions.";
    await expect(
      call(storyboardTools(bases, dialogue).recordClaim, { shape: "comparison", column: "trips_millions", entity: "Lisboa" }),
    ).rejects.toThrow(/without claimVersus/);
  });

  it("should refuse a column that is not in the data", async () => {
    dialogue.lastJournalist = "A comparison about trips: Lisboa against Porto.";
    await expect(
      call(storyboardTools(bases, dialogue).recordClaim, { shape: "comparison", column: "trips", entity: "Lisboa", versus: "Porto", direction: "greater" }),
    ).rejects.toThrow(/"trips" is not a column.*trips_millions/);
  });

  it("should refuse an entity that is not a row of the data", async () => {
    dialogue.lastJournalist = "A maximum, Lisbon, trips_millions.";
    await expect(
      call(storyboardTools(bases, dialogue).recordClaim, { shape: "maximum", column: "trips_millions", entity: "Lisbon" }),
    ).rejects.toThrow(/"Lisbon" is not a row/);
  });
});

describe("answers recorded a turn late", () => {
  it("should accept the takeaway the journalist gave one exchange earlier", async () => {
    dialogue.history = [{ proposal: "What should the reader keep?", answer: TAKEAWAY }];
    dialogue.lastJournalist = "It is a comparison, about trips_millions.";
    await call(storyboardTools(bases, dialogue).recordTakeaway, { sentence: TAKEAWAY });
    expect(meta().takeaway).toBe(TAKEAWAY);
  });
});

describe("takeaway is a reader's sentence", () => {
  it("should refuse the journalist's claim-shape answer recorded as the takeaway", async () => {
    dialogue.lastJournalist = "It is a comparison, about the column trips_millions: Lisboa against Porto, Lisboa greater.";
    await expect(
      call(storyboardTools(bases, dialogue).recordTakeaway, { sentence: dialogue.lastJournalist }),
    ).rejects.toThrow(/names the data column trips_millions/);
  });
});

describe("takeaway is verbatim", () => {
  it("should refuse a paraphrase of the takeaway even when the journalist said yes to it", async () => {
    dialogue.lastProposal = "Shall I record: Lisboa's ridership is greater than Porto's?";
    dialogue.lastJournalist = "Yes.";
    await expect(
      call(storyboardTools(bases, dialogue).recordTakeaway, { sentence: "Lisboa's ridership is greater than Porto's" }),
    ).rejects.toThrow(/journalist's own answer/);
  });
});

describe("slot discipline", () => {
  it("should refuse a slot the run does not produce", async () => {
    dialogue.lastJournalist = "A map.";
    await expect(
      call(storyboardTools(bases, dialogue).recordSlot, { slot: "2", field: "medium", value: "map" }),
    ).rejects.toThrow(/produces slot\(s\) 1 only/);
  });

  it("should refuse a chosen treatment that was never among the candidates", async () => {
    const tools = await withFormat();
    await call(tools.showCandidates, { slot: "1", candidates: [{ type: "Bar and column", why: "ranks six" }, { type: "Treemap", why: "part of a whole" }] });
    dialogue.lastProposal = "Shall I go with a scatter plot?";
    dialogue.lastJournalist = "Yes.";
    await expect(call(tools.recordSlot, { slot: "1", field: "chosen", value: "Scatter plot" })).rejects.toThrow(
      /must be one of the candidates you showed: Bar and column, Treemap/,
    );
  });

  it("should record the catalogue's name for a treatment the model spelled its own way", async () => {
    const tools = await withFormat();
    await call(tools.showCandidates, { slot: "1", candidates: [{ type: "Bar Chart", why: "ranks six" }, { type: "Treemap chart", why: "part of a whole" }] });
    expect(meta().slots[0].candidates).toEqual(["Bar and column", "Treemap"]);
  });

  it("should refuse a candidate that is not a type of the catalogue", async () => {
    const tools = await withFormat();
    await expect(
      call(tools.showCandidates, { slot: "1", candidates: [{ type: "Bar Chart", why: "a" }, { type: "Galaxy plot", why: "b" }] }),
    ).rejects.toThrow(/"Galaxy plot" is not a chart type/);
  });

  it("should refuse a menu of one candidate", async () => {
    const tools = await withFormat();
    await expect(call(tools.showCandidates, { slot: "1", candidates: [{ type: "Bar Chart", why: "a" }] })).rejects.toThrow(/at least two/);
  });

  it("should refuse two candidates that are the same idea, as Splash's menu does", async () => {
    const tools = await withFormat();
    await expect(
      call(tools.showCandidates, { slot: "1", candidates: [{ type: "Bar Chart", why: "a" }, { type: "Lollipop", why: "b" }] }),
    ).rejects.toThrow(/way\(s\) of seeing this data/);
  });

  it("should accept the journalist's spelling of a candidate and record its format's interaction", async () => {
    const tools = await withFormat();
    await call(tools.showCandidates, { slot: "1", candidates: [{ type: "Bar Chart", why: "a" }, { type: "Treemap", why: "b" }] });
    dialogue.lastJournalist = "Bar and column.";
    await call(tools.recordSlot, { slot: "1", field: "chosen", value: "Comparison (Bar Chart)" });
    expect([meta().slots[0].chosen, meta().slots[0].interaction]).toEqual(["Bar and column", "none"]);
  });

  it("should fill the slot's proves with the confirmed takeaway", async () => {
    dialogue.lastJournalist = TAKEAWAY;
    const tools = storyboardTools(bases, dialogue);
    await call(tools.recordTakeaway, { sentence: TAKEAWAY });
    await withFormat(tools);
    expect(meta().slots[0].proves).toBe(TAKEAWAY);
  });
});

describe("what the local harness can draw", () => {
  it("should tell the model to re-offer a type the journalist asked for that the menu lacked", async () => {
    const tools = await withFormat();
    await call(tools.showCandidates, { slot: "1", candidates: [{ type: "Line", why: "a" }, { type: "Treemap", why: "b" }] });
    dialogue.lastJournalist = "Bar and column.";
    await expect(call(tools.recordSlot, { slot: "1", field: "chosen", value: "Bar and column" })).rejects.toThrow(
      /asked for Bar and column, which your menu did not offer.*show_candidates again/,
    );
  });

  it("should refuse a chosen type with no zone adapter", async () => {
    const tools = await withFormat();
    await call(tools.showCandidates, { slot: "1", candidates: [{ type: "Bar and column", why: "a" }, { type: "Treemap", why: "b" }] });
    dialogue.lastJournalist = "Treemap.";
    await expect(call(tools.recordSlot, { slot: "1", field: "chosen", value: "Treemap" })).rejects.toThrow(/cannot draw Treemap yet/);
  });

  it("should refuse a menu with nothing the local harness can draw", async () => {
    const tools = await withFormat();
    await expect(
      call(tools.showCandidates, { slot: "1", candidates: [{ type: "Treemap", why: "a" }, { type: "Beeswarm", why: "b" }] }),
    ).rejects.toThrow(/can draw none of these yet.*Bar and column/);
  });
});

async function withFormat(tools = storyboardTools(bases, dialogue)) {
  dialogue.lastJournalist = "A chart.";
  await call(tools.recordSlot, { slot: "1", field: "medium", value: "chart" });
  dialogue.lastJournalist = "Static.";
  await call(tools.recordSlot, { slot: "1", field: "format", value: "static" });
  return tools;
}

describe("gaps the harness fills", () => {
  it("should point a missing grounding at record_takeaway rather than ask the model for it", async () => {
    const { gapsForModel } = await import("../src/tools/storyboard.ts");
    expect(gapsForModel(["grounding is missing — the takeaway was never grounded at G1"])[0]).toMatch(/record_takeaway computes it/);
  });
});
