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
