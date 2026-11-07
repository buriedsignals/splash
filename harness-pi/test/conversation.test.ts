import { describe, expect, it } from "bun:test";
import { converse } from "../src/conversation.ts";

/** A session that never calls a tool and asks the journalist something every turn, as the 12B did on China. */
function silentSession() {
  const prompts: string[] = [];
  const session = {
    subscribe: () => () => {},
    prompt: async (text: string) => void prompts.push(text),
    getLastAssistantText: () => "Would you like to proceed with the Chart medium?",
    abort: async () => {},
  };
  return { prompts, session };
}

const run = (gaps: string) => {
  const { prompts, session } = silentSession();
  const answers = ["Bar and column.", "A chart.", "Scrollytelling.", "Yes.", "Custom."];
  let n = 0;
  return converse({
    session: session as never,
    first: "Start the storyboard.",
    journalist: { answer: async () => answers[n++ % answers.length] },
    dialogue: { lastJournalist: "", lastProposal: "" },
    conversational: true,
    done: async () => false,
    gaps: async () => gaps,
    limits: { rounds: 6 },
    log: [],
  }).then(() => prompts);
};

describe("converse", () => {
  it("should ask for record_slot after three silent turns while no slot exists", async () => {
    const prompts = await run("no slot: nothing would be produced");
    expect(prompts[4]).toStartWith('[harness] The slot is still not recorded: 3 turns went to the journalist with no tool called, so nothing would be produced. Call record_slot for slot "1"');
  });

  it("should quote the journalist's answers oldest first in that nudge", async () => {
    const prompts = await run("no slot: nothing would be produced");
    expect(prompts[4]).toContain('["Bar and column.","A chart.","Scrollytelling."]');
  });

  it("should leave silent turns to the journalist once a slot exists", async () => {
    const prompts = await run("effectiveDate is missing");
    expect(prompts.some((p) => p.startsWith("[harness]"))).toBe(false);
  });
});

describe("converse narrowing a stalled turn", () => {
  const narrowed = async () => {
    const offered: string[][] = [];
    let active = ["read_file", "record_slot", "show_candidates"];
    const session = {
      subscribe: () => () => {},
      prompt: async () => void offered.push([...active]),
      getLastAssistantText: () => "Which medium would you like?",
      abort: async () => {},
      getActiveToolNames: () => active,
      setActiveToolsByName: (names: string[]) => void (active = names),
    };
    await converse({
      session: session as never,
      first: "Start the storyboard.",
      journalist: { answer: async () => "A chart." },
      dialogue: { lastJournalist: "", lastProposal: "" },
      conversational: true,
      done: async () => false,
      gaps: async () => "no slot: nothing would be produced",
      limits: { rounds: 8 },
      log: [],
      recordTools: ["record_slot", "show_candidates"],
    });
    return offered;
  };

  it("should offer only the record tools on the turn after the stall nudge", async () => {
    expect((await narrowed())[4]).toEqual(["record_slot", "show_candidates"]);
  });

  it("should give every tool back on the turn after that", async () => {
    expect((await narrowed())[5]).toEqual(["read_file", "record_slot", "show_candidates"]);
  });

  it("should narrow the last round too", async () => {
    expect((await narrowed())[7]).toEqual(["record_slot", "show_candidates"]);
  });
});

describe("converse bounds (Spotlight's watchdog: 16 / 12 / 6)", () => {
  type Ev = { type: string; toolName?: string; isError?: boolean; result?: unknown; toolCallId?: string; args?: unknown };
  /** A session whose every prompt plays `turn` (the events of one model turn) through its listener. */
  const scripted = (turn: (i: number) => Ev[]) => {
    let listener: (e: Ev) => void = () => {};
    let i = 0;
    let aborted = false;
    return {
      session: {
        subscribe: (l: (e: Ev) => void) => ((listener = l), () => {}),
        prompt: async () => {
          for (const e of turn(i++)) {
            if (aborted) break;
            listener(e);
          }
        },
        getLastAssistantText: () => "Which medium would you like?",
        abort: async () => void (aborted = true),
      },
    };
  };
  const go = (turn: (i: number) => Ev[]) =>
    converse({
      session: scripted(turn).session as never,
      first: "Start.",
      journalist: { answer: async () => "A chart." },
      dialogue: { lastJournalist: "", lastProposal: "" },
      conversational: true,
      done: async () => false,
      gaps: async () => "effectiveDate is missing",
      limits: { rounds: 60, toolCalls: 500 },
      log: [],
    });
  const read = (i: number): Ev => ({ type: "tool_execution_end", toolName: "read_file", result: { content: [{ text: `r${i}` }] } });
  const refused = (i: number): Ev => ({ type: "tool_execution_end", toolName: "record_slot", isError: true, result: { content: [{ text: `refused ${i}` }] } });
  const record: Ev = { type: "tool_execution_end", toolName: "record_slot", result: { content: [{ text: "ok" }] } };

  it("should stop a session that made no first record within 16 model turns", async () => {
    const r = await go((i) => [read(i), { type: "turn_end" }]);
    expect(r.stop).toBe("no first record in 16 model turns");
  });

  it("should stop a session that made no new record within 12 model turns of its last", async () => {
    const r = await go((i) => [i === 0 ? record : read(i), { type: "turn_end" }]);
    expect(r.stop).toBe("no new record in 12 model turns");
  });

  // G1a, 2026-11-07: a 12B recorded one gesture list forty times between renders; each accepted
  // repeat reset the bound, and the session ran to the eval's wall clock.
  it("should not count the same record again as a new one", async () => {
    const r = await go((i) => [
      { type: "tool_execution_start", toolCallId: `c${i}`, toolName: "record_gestures", args: { gestures: ["a"] } } as Ev,
      { type: "tool_execution_end", toolCallId: `c${i}`, toolName: "record_gestures", result: { content: [{ text: "ok" }] } } as Ev,
      { type: "turn_end" },
    ]);
    expect(r.stop).toBe("no new record in 12 model turns");
  });

  it("should count the same record as new once a file was written since", async () => {
    const r = await go((i) => [
      { type: "tool_execution_start", toolCallId: `w${i}`, toolName: "edit_file", args: {} } as Ev,
      { type: "tool_execution_end", toolCallId: `w${i}`, toolName: "edit_file", result: { content: [{ text: "ok" }] } } as Ev,
      { type: "tool_execution_start", toolCallId: `c${i}`, toolName: "record_gestures", args: { gestures: ["a"] } } as Ev,
      { type: "tool_execution_end", toolCallId: `c${i}`, toolName: "record_gestures", result: { content: [{ text: "ok" }] } } as Ev,
      { type: "turn_end" },
    ]);
    expect(r.stop).toBe("round cap");
  });

  it("should stop after six tool calls in a row refused, varied or not", async () => {
    const r = await go((i) => [refused(i), { type: "turn_end" }]);
    expect(r.stop).toBe("6 tool calls refused in a row");
  });

  it("should count every refusal it saw, not only the streak that stopped it", async () => {
    const r = await go((i) => [refused(i), i % 3 === 2 ? record : read(i), { type: "turn_end" }]);
    expect(r.refusals).toBeGreaterThan(6);
  });
});
