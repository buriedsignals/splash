// One owner session's conversation with the journalist, with the harness standing between them.
// Two rules learned on the 12B live here rather than in a prompt: a turn that claims a record with
// no successful record tool behind it is answered by the harness, and so is a turn that declares
// the phase done while it is not. The journalist never sees those messages.
import type { AgentSession } from "@earendil-works/pi-coding-agent";
import type { Journalist } from "./journalist.ts";
import type { Dialogue } from "./tools/storyboard.ts";
import type { GateState } from "./tools/palette.ts";

export interface ConverseOptions {
  session: AgentSession;
  first: string;
  journalist: Journalist;
  dialogue: Dialogue;
  gate?: GateState;
  conversational: boolean;
  /** True once the phase's own file-backed state says the owner has finished. */
  done: () => Promise<boolean>;
  /** What is still open, for the harness to say when the model claims otherwise. */
  gaps: () => Promise<string>;
  limits?: {
    rounds?: number;
    toolCalls?: number;
    minutes?: number;
    sameFailure?: number;
  };
  log: string[];
}

export interface ConverseResult {
  rounds: number;
  toolCalls: number;
  stop: string;
}

const CLAIMED_RECORD =
  /\b(I have|I've)( now| also| successfully| just)? (recorded|noted|saved|materiali[sz]ed)\b/i;
const CLAIMED_DONE =
  /\b(complete|completed|finali[sz]ed|closed|ready to move|we are ready|all set)\b/i;

export async function converse(o: ConverseOptions): Promise<ConverseResult> {
  const limits = {
    rounds: 30,
    toolCalls: 80,
    minutes: 45,
    sameFailure: 3,
    ...o.limits,
  };
  let toolCalls = 0;
  let recorded = 0;
  let lastFailure = "";
  let sameFailure = 0;
  let stop = "";
  let menu = "";
  const off = o.session.subscribe((e) => {
    if (e.type !== "tool_execution_end") return;
    toolCalls++;
    const out = JSON.stringify(e.result?.content?.[0]?.text ?? "").slice(
      0,
      300,
    );
    o.log.push(`TOOL ${e.toolName}${e.isError ? " ERROR" : ""}: ${out}`);
    if (!e.isError && /^(record_|materialise|propose_palette|show_candidates)/.test(e.toolName))
      recorded++;
    // The menu the code recorded is the one the journalist sees, whatever the model's prose says.
    if (!e.isError && e.toolName === "show_candidates")
      menu = String(e.result?.content?.[0]?.text ?? "").split("ask which one:\n")[1] ?? "";
    const sig = e.isError ? `${e.toolName}:${out.slice(0, 120)}` : "";
    sameFailure = sig && sig === lastFailure ? sameFailure + 1 : 0;
    lastFailure = sig;
    if (toolCalls >= limits.toolCalls) stop = "tool-call cap";
    if (sameFailure + 1 >= limits.sameFailure)
      stop = `same failure ${limits.sameFailure}x`;
    if (stop) void o.session.abort();
  });
  const timer = setTimeout(() => {
    stop = `${limits.minutes} min cap`;
    void o.session.abort();
  }, limits.minutes * 60_000);

  let prompt = o.first;
  let rounds = 0;
  try {
    for (; rounds < limits.rounds && !stop; rounds++) {
      await o.session.prompt(prompt);
      const said = o.session.getLastAssistantText() ?? "";
      o.log.push(`MODEL: ${said.slice(0, 1500)}`);
      if (await o.done()) {
        stop = "done";
        break;
      }
      if (!o.conversational) {
        stop = "ended";
        break;
      }
      if (CLAIMED_RECORD.test(said) && recorded === 0) {
        prompt = `[harness] Nothing was recorded in your last turn: no record tool succeeded. ${await o.gaps()} Record the journalist's last answer with the right tool now (their last message was: ${JSON.stringify(o.dialogue.lastJournalist)}), then continue.`;
        o.log.push(`HARNESS: ${prompt}`);
        recorded = 0;
        continue;
      }
      if (CLAIMED_DONE.test(said)) {
        prompt = `[harness] This step is not finished. ${await o.gaps()} Ask the journalist for what is missing, or record what they already said.`;
        o.log.push(`HARNESS: ${prompt}`);
        recorded = 0;
        continue;
      }
      recorded = 0;
      const shown = menu ? `The candidates, as recorded:\n${menu}\n\n${said}` : said;
      menu = "";
      const answer = await o.journalist.answer(shown);
      o.log.push(`JOURNALIST: ${answer}`);
      if (o.dialogue.lastJournalist)
        (o.dialogue.history ??= []).unshift({ proposal: o.dialogue.lastProposal, answer: o.dialogue.lastJournalist });
      o.dialogue.lastProposal = said;
      o.dialogue.lastJournalist = answer;
      if (o.gate?.asked) o.gate.answered = true;
      prompt = answer;
    }
  } catch (e) {
    stop ||= `error: ${(e as Error).message}`;
  } finally {
    clearTimeout(timer);
    off();
  }
  return { rounds, toolCalls, stop: stop || "round cap" };
}
