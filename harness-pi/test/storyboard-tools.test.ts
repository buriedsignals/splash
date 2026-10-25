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

  it("should refuse an entity that is not a row of the data", async () => {
    dialogue.lastJournalist = "A maximum, Lisbon, trips_millions.";
    await expect(
      call(storyboardTools(bases, dialogue).recordClaim, { shape: "maximum", column: "trips_millions", entity: "Lisbon" }),
    ).rejects.toThrow(/"Lisbon" is not a row/);
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
    const tools = storyboardTools(bases, dialogue);
    await call(tools.recordSlot, { slot: "1", field: "candidates", value: "Bar and column, Lollipop" });
    dialogue.lastJournalist = "Scatter plot.";
    await expect(call(tools.recordSlot, { slot: "1", field: "chosen", value: "Scatter plot" })).rejects.toThrow(
      /must be one of the candidates you showed: Bar and column, Lollipop/,
    );
  });
});
