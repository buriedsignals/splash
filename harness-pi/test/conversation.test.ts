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

// Osaurus run 28 (2026-11-10): the storyboard listed treatments in prose without show_candidates; the journalist
// answered "Area (and stacked area)." ten times and the 12B refused it each time on a rule it invented, never
// calling record_slot, whose answer would have been the truth.
describe("converse when a slot exists and nothing is chosen", () => {
  const chosen = async () => {
    const prompts: string[] = [];
    const session = {
      subscribe: () => () => {},
      prompt: async (text: string) => void prompts.push(text),
      getLastAssistantText: () => "I cannot record Area for a Static chart. Would you like a Line chart instead?",
      abort: async () => {},
    };
    await converse({
      session: session as never,
      first: "Start the storyboard.",
      journalist: { answer: async () => "Area (and stacked area)." },
      dialogue: { lastJournalist: "", lastProposal: "" },
      conversational: true,
      done: async () => false,
      gaps: async () => "slot 1: nothing chosen — gate 2 is not closed",
      limits: { rounds: 6 },
      log: [],
    });
    return prompts;
  };

  it("should ask for record_slot chosen with the journalist's own answer after three silent turns", async () => {
    expect((await chosen())[4]).toContain('record_slot for slot "1", field "chosen", value "Area (and stacked area)."');
  });

  it("should tell the model the tool, not its own reading, decides what is reachable", async () => {
    expect((await chosen())[4]).toContain("the tool answers whether it is reachable");
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

// Osaurus run 2026-11-08: with thinking off, the MLX 12B opened its thought channel and ran 16,384 hidden tokens
// (over ten minutes) in one storyboard turn; llama-server's --reasoning-budget 400 had cut that, Osaurus has no budget.
describe("converse cutting hidden reasoning", () => {
  const runaway = async () => {
    const prompts: string[] = [];
    let listener: (e: unknown) => void = () => {};
    let release: () => void = () => {};
    let turn = 0;
    const session = {
      subscribe: (f: (e: unknown) => void) => ((listener = f), () => {}),
      prompt: async (text: string) => {
        prompts.push(text);
        if (turn++ > 0) return;
        listener({ type: "message_update", assistantMessageEvent: { type: "thinking_start" } });
        await new Promise<void>((r) => (release = r));
      },
      getLastAssistantText: () => "",
      abort: async () => release(),
    };
    const out = await converse({
      session: session as never,
      first: "Start the storyboard.",
      journalist: { answer: async () => "Yes." },
      dialogue: { lastJournalist: "", lastProposal: "" },
      conversational: false,
      done: async () => false,
      gaps: async () => "",
      limits: { rounds: 3, hiddenReasoningSeconds: 0.05 },
      log: [],
    });
    return { prompts, out };
  };

  it("should cut a turn that stays in hidden reasoning and ask it again", async () => {
    const { prompts } = await runaway();
    expect(prompts[1]).toStartWith("[harness] Your last turn stayed in hidden reasoning");
  });

  it("should not end the session on that cut", async () => {
    const { out } = await runaway();
    expect(out.stop).toBe("ended");
  });
});

// Osaurus runs 18 and 20 (2026-11-09): a storyboard turn sent nothing for about thirteen minutes before its first
// thought token, so the hidden-reasoning cut, armed by that token, came too late, and the run ran out of its 45 minutes.
describe("converse cutting a turn that sends nothing", () => {
  const stalled = async () => {
    const prompts: string[] = [];
    let release: () => void = () => {};
    let turn = 0;
    const session = {
      subscribe: () => () => {},
      prompt: async (text: string) => {
        prompts.push(text);
        if (turn++ > 0) return;
        await new Promise<void>((r) => (release = r));
      },
      getLastAssistantText: () => "",
      abort: async () => release(),
    };
    const out = await converse({
      session: session as never,
      first: "Start the storyboard.",
      journalist: { answer: async () => "Yes." },
      dialogue: { lastJournalist: "", lastProposal: "" },
      conversational: false,
      done: async () => false,
      gaps: async () => "",
      limits: { rounds: 3, silentTurnSeconds: 0.05 },
      log: [],
    });
    return { prompts, out };
  };

  it("should cut a turn that sends nothing and ask it again", async () => {
    const { prompts } = await stalled();
    expect(prompts[1]).toStartWith("[harness] Your last turn sent nothing");
  });
});
