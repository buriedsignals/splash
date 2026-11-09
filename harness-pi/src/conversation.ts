// One owner session's conversation with the journalist, with the harness standing between them.
// Two rules learned on the 12B live here rather than in a prompt: a turn that claims a record with
// no successful record tool behind it is answered by the harness, and so is a turn that declares
// the phase done while it is not. The journalist never sees those messages.
import type { AgentSession } from "@earendil-works/pi-coding-agent";
import type { Journalist } from "./journalist.ts";
import type { Dialogue } from "./tools/storyboard.ts";
import type { GateState } from "./tools/palette.ts";
import { thinkingLevel } from "./sessions.ts";

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
    /** With thinking off, seconds a turn may sit in hidden reasoning before it is cut and asked again. */
    hiddenReasoningSeconds?: number;
    /** Seconds a turn may go from its request to its first word or tool call before it is cut and asked again. */
    silentTurnSeconds?: number;
  };
  log: string[];
  /** The record tools a stalled turn is narrowed to (Spotlight's last-turn narrowing); none narrows nothing. */
  recordTools?: string[];
}

export interface ConverseResult {
  rounds: number;
  toolCalls: number;
  stop: string;
  /** Every tool call the harness or a tool refused, whether or not it ended the session. */
  refusals: number;
}

// Spotlight's watchdog (harness/pi/src/extension.ts PROGRESS_*_RECORD_TURNS, tools/run.ts
// REFUSAL_STREAK): measured there, productive workers took at most 14 model turns to a first record.
export const FIRST_RECORD_TURNS = 16;
export const NEXT_RECORD_TURNS = 12;
export const REFUSAL_STREAK = 6;

const CLAIMED_RECORD =
  /\b(I have|I've|I)( now| also| successfully| just)? (recorded|saved|materiali[sz]ed|updated|refined|registered)\b/i;
/** The storyboard gate's gap while no slot exists (skills/storyboard/scripts/gate-contract.mjs). */
const NO_SLOT = /no slot: nothing would be produced/;
const CLAIMED_DONE =
  /\b(complete|completed|finali[sz]ed|closed|ready to move|we are ready|all set)\b/i;

export async function converse(o: ConverseOptions): Promise<ConverseResult> {
  const limits = {
    rounds: 30,
    toolCalls: 80,
    minutes: 45,
    sameFailure: 3,
    hiddenReasoningSeconds: 90,
    silentTurnSeconds: 300,
    ...o.limits,
  };
  // With thinking off, the MLX 12B under Osaurus still opened its thought channel and ran 16,384 hidden tokens
  // (over ten minutes, nothing streamed) in one storyboard turn. llama-server's --reasoning-budget 400 cut that;
  // Osaurus honours no budget (seven request and environment forms tried, 2026-11-08), so the harness cuts it here.
  const reasoningOff = thinkingLevel() === "off";
  let hidden: ReturnType<typeof setTimeout> | undefined;
  let cut = false;
  let cuts = 0;
  // Osaurus runs 18 and 20 (2026-11-09): a turn sent nothing for about thirteen minutes, then its thought channel.
  // The hidden-reasoning cut only arms on that first thought token; this one arms when the request goes out.
  let mute: ReturnType<typeof setTimeout> | undefined;
  let cutSilent = false;
  const hush = () => {
    clearTimeout(mute);
    mute = undefined;
  };
  const disarm = () => {
    clearTimeout(hidden);
    hidden = undefined;
  };
  let toolCalls = 0;
  let recorded = 0;
  // Turns in a row that went to the journalist with nothing recorded.
  let silent = 0;
  const failures = new Map<string, number>();
  let sameFailure = 0;
  let stop = "";
  let menu = "";
  let everRecorded = false;
  let sinceRecord = 0;
  let refusalStreak = 0;
  let refusals = 0;
  // A record is progress only when it differs from the last one accepted: a 12B recorded one gesture
  // list forty times between renders (G1a, 2026-11-07), and each repeat reset the bound.
  const argsOf = new Map<string, string>();
  let lastRecord = "";
  const off = o.session.subscribe((e) => {
    if (e.type === "message_update" && /^(text_start|toolcall_start)$/.test(e.assistantMessageEvent?.type ?? "")) hush();
    if (e.type === "message_update" && reasoningOff) {
      const t = e.assistantMessageEvent?.type;
      if (t === "thinking_start" && !hidden)
        hidden = setTimeout(() => {
          cut = true;
          void o.session.abort();
        }, limits.hiddenReasoningSeconds * 1000);
      else if (t === "text_start" || t === "toolcall_start") disarm();
      return;
    }
    if (e.type === "message_end") {
      disarm();
      hush();
    }
    if (e.type === "tool_execution_start") {
      argsOf.set(e.toolCallId, `${e.toolName} ${JSON.stringify(e.args ?? null)}`);
      return;
    }
    if (e.type === "turn_end") {
      sinceRecord++;
      if (!everRecorded && sinceRecord >= FIRST_RECORD_TURNS) stop ||= `no first record in ${FIRST_RECORD_TURNS} model turns`;
      if (everRecorded && sinceRecord >= NEXT_RECORD_TURNS) stop ||= `no new record in ${NEXT_RECORD_TURNS} model turns`;
      if (stop) void o.session.abort();
      return;
    }
    if (e.type !== "tool_execution_end") return;
    toolCalls++;
    const out = JSON.stringify(e.result?.content?.[0]?.text ?? "").slice(
      0,
      300,
    );
    o.log.push(`TOOL ${e.toolName}${e.isError ? " ERROR" : ""}: ${out}`);
    if (!e.isError && /^(record_|materialise|propose_palette|show_candidates)/.test(e.toolName)) {
      recorded++;
      everRecorded = true;
      const call = argsOf.get(e.toolCallId) ?? `unseen ${toolCalls}`;
      if (call !== lastRecord) sinceRecord = 0;
      lastRecord = call;
    }
    // A file written since makes the same record mean something new (the repair loop: fix beat.mjs, record, render).
    if (!e.isError && /^(write_file|edit_file)$/.test(e.toolName)) lastRecord = "";
    argsOf.delete(e.toolCallId);
    if (e.isError) {
      refusals++;
      if (++refusalStreak >= REFUSAL_STREAK) stop ||= `${REFUSAL_STREAK} tool calls refused in a row`;
    } else refusalStreak = 0;
    // The menu the code recorded is the one the journalist sees, whatever the model's prose says.
    if (!e.isError && e.toolName === "show_candidates")
      menu = String(e.result?.content?.[0]?.text ?? "").split("ask which one:\n")[1] ?? "";
    if (e.isError && e.toolName === "record_slot" && /harness recorded this menu/.test(String(e.result?.content?.[0]?.text ?? "")))
      menu = String(e.result?.content?.[0]?.text ?? "").split("end your turn:\n")[1] ?? "";
    // Counted per signature, not only back to back: a model that interleaves a successful call
    // between identical failures (35 renders of a missing beat.mjs, once) still gets stopped.
    if (e.isError) {
      const sig = `${e.toolName}:${out.slice(0, 120)}`;
      failures.set(sig, (failures.get(sig) ?? 0) + 1);
      sameFailure = Math.max(sameFailure, (failures.get(sig) ?? 0) - 1);
    }
    if (toolCalls >= limits.toolCalls) stop ||= "tool-call cap";
    if (sameFailure + 1 >= limits.sameFailure)
      stop ||= `same failure ${limits.sameFailure}x`;
    if (stop) void o.session.abort();
  });
  const timer = setTimeout(() => {
    stop = `${limits.minutes} min cap`;
    void o.session.abort();
  }, limits.minutes * 60_000);

  let prompt = o.first;
  let rounds = 0;
  // A stalled step's next turn offers only the record tools: talk cannot be its answer.
  let narrow = false;
  try {
    for (; rounds < limits.rounds && !stop; rounds++) {
      const lastRound = rounds === limits.rounds - 1;
      mute = setTimeout(() => {
        cut = cutSilent = true;
        void o.session.abort();
      }, limits.silentTurnSeconds * 1000);
      if ((narrow || (lastRound && rounds > 0)) && o.recordTools?.length) {
        const all = o.session.getActiveToolNames();
        o.session.setActiveToolsByName(all.filter((t) => o.recordTools?.includes(t)));
        o.log.push(`HARNESS: tools narrowed to ${o.recordTools.join(", ")}`);
        try {
          await o.session.prompt(prompt);
        } finally {
          o.session.setActiveToolsByName(all);
        }
      } else await o.session.prompt(prompt);
      narrow = false;
      disarm();
      hush();
      if (cut) {
        cut = false;
        const why = cutSilent
          ? `sent nothing for ${limits.silentTurnSeconds} s, no word and no tool call, and was cut`
          : `stayed in hidden reasoning for ${limits.hiddenReasoningSeconds} s with nothing said and no tool called, and was cut`;
        cutSilent = false;
        if (++cuts >= limits.sameFailure) {
          stop = `hidden reasoning cut ${cuts}x`;
          break;
        }
        prompt = `[harness] Your last turn ${why}. Thinking is off: do not reason first. Answer the last message directly, or call the tool it needs. ${await o.gaps()}`.trimEnd();
        o.log.push(`HARNESS: ${prompt}`);
        continue;
      }
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
      // A 12B discussed medium, format, treatment and producer over a dozen turns, said "I have everything
      // recorded", and never called record_slot; the claim nudge pointed it at the journalist's last words, a
      // repeated takeaway, and the storyboard ended on the round cap with no slot. Silence is counted, not claims.
      if (recorded === 0 && silent >= 3 && NO_SLOT.test(await o.gaps())) {
        const answers = [o.dialogue.lastJournalist, ...(o.dialogue.history ?? []).map((h) => h.answer)].filter(Boolean).slice(0, 8).reverse();
        prompt = `[harness] The slot is still not recorded: ${silent} turns went to the journalist with no tool called, so nothing would be produced. Call record_slot for slot "1" now, one call per field the journalist has answered (medium, format, size), then show_candidates, then record chosen and producer from their choice. Their answers so far, oldest first: ${JSON.stringify(answers)}.`;
        o.log.push(`HARNESS: ${prompt}`);
        silent = 0;
        narrow = true;
        continue;
      }
      if (CLAIMED_RECORD.test(said) && recorded === 0) {
        prompt = `[harness] Nothing was recorded in your last turn: no record tool succeeded. ${await o.gaps()} Record the journalist's last answer with the right tool now (their last message was: ${JSON.stringify(o.dialogue.lastJournalist)}), then continue.`;
        o.log.push(`HARNESS: ${prompt}`);
        recorded = 0;
        continue;
      }
      // A turn that asks the journalist something goes to the journalist, whatever words it uses: "To
      // complete the slot, which ...?" was intercepted as a false "complete" until the round cap.
      if (CLAIMED_DONE.test(said) && !said.includes("?")) {
        prompt = `[harness] This step is not finished. ${await o.gaps()} Ask the journalist for what is missing, or record what they already said.`;
        o.log.push(`HARNESS: ${prompt}`);
        recorded = 0;
        continue;
      }
      silent = recorded === 0 ? silent + 1 : 0;
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
    hush();
    disarm();
    off();
  }
  return { rounds, toolCalls, stop: stop || "round cap", refusals };
}
