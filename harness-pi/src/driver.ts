// The phase driver: whereIs decides what is next, code does every deterministic step, and the model
// gets one owner session at a time for the steps that need judgement — framing, the storyboard
// exchange, writing a beat's content, reviewing it, delivering it. Gates close into files; a step
// that leaves whereIs where it was is a stall, reported rather than retried forever.
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, join } from "node:path";
import type { AgentSession } from "@earendil-works/pi-coding-agent";
import { whereIs } from "../../skills/splash/scripts/where.mjs";
import {
  checkStoryboard,
  parseStoryboard,
} from "../../skills/splash/scripts/gate-contract.mjs";
import { deliveryClosed } from "../../skills/deliver/scripts/another-format.mjs";
import {
  QA_RUN_SCHEMA_VERSION,
  renderDigest,
  writeOutputReview,
} from "../../skills/deliver/scripts/output-review.mjs";
import { claimBlock, contractText, craftKit, recordFallback } from "./craft-kit.ts";
import { converse } from "./conversation.ts";
import { checkEditorProposals, describeProposals } from "./editor-check.ts";
import type { Journalist } from "./journalist.ts";
import { type OwnerId, PROFILES } from "./profiles.ts";
import { openSession } from "./sessions.ts";
import { type Bases, beatTools, fsTools } from "./tools/fs.ts";
import { lookTool } from "./tools/look.ts";
import {
  closeDerivedPalette,
  type GateState,
  paletteTools,
} from "./tools/palette.ts";
import { reviewTools } from "./tools/review.ts";
import { refusalHint, runCommand, runTools } from "./tools/run.ts";
import { type Dialogue, dropUnsizedSizes, gapsForModel, storyboardTools } from "./tools/storyboard.ts";
export { adapterFor } from "./adapters.ts";
import { deliverTools } from "./tools/deliver.ts";

const CHECKOUT = join(import.meta.dirname, "..", "..");
/** The craft skills whereIs names per medium and format (where.mjs CRAFT_SKILLS); each runs through a zone kit. */
const CRAFT_OWNERS = new Set(["chart-beat", "chart-web", "chart-video", "map-beat", "map-web", "scrolly"].map((id) => `skill:${id}`));
const read = (rel: string) => readFileSync(join(CHECKOUT, rel), "utf8");

export interface RunOptions {
  root: string;
  storyDir: string;
  journalist: Journalist;
  modelId?: string;
  log?: (line: string) => void;
}

export interface RunReport {
  outcome: "done" | "stalled" | "blocked" | "crafted";
  phase: string;
  reason: string;
  steps: { owner: string; stop: string; seconds: number }[];
  transcript: string[];
}

function storyboardMeta(storyDir: string): Record<string, any> {
  return parseStoryboard(readFileSync(join(storyDir, "STORYBOARD.md"), "utf8"))
    .meta as unknown as Record<string, any>;
}

/** Both closing offers answered by the journalist, not merely offered ("pending"). */
async function closingAnswered(exportDir: string): Promise<boolean> {
  if (!existsSync(join(exportDir, "HANDOVER.md"))) return false;
  const d = await deliveryClosed(exportDir);
  return d.closed && d.answer !== "pending" && d.subjects !== "pending";
}

export async function runStory(o: RunOptions): Promise<RunReport> {
  const bases: Bases = { root: o.root, storyDir: o.storyDir };
  const story = basename(o.storyDir);
  const transcript: string[] = [];
  const steps: RunReport["steps"] = [];
  const say = (line: string) => {
    transcript.push(line);
    o.log?.(line);
  };
  const dialogue: Dialogue = { lastJournalist: "", lastProposal: "" };
  const gate: GateState = { asked: false, answered: false };
  const f = fsTools(bases);
  const r = runTools(bases);
  let editorProposals = "";
  let lastState = "";
  let stalls = 0;

  async function session(
    owner: OwnerId,
    slot: string,
    systemPrompt: string,
    tools: any[],
  ): Promise<AgentSession> {
    return openSession({
      runRoot: o.root,
      key: { story, owner, slot, attempt: Date.now() },
      systemPrompt,
      tools,
      keepRecentTokens: PROFILES[owner].keepRecentTokens,
      modelId: o.modelId,
    });
  }

  const storyboardGaps = async () => {
    if (!existsSync(join(o.storyDir, "STORYBOARD.md")))
      return "STORYBOARD.md does not exist yet.";
    await dropUnsizedSizes(join(o.storyDir, "STORYBOARD.md"));
    const gaps = gapsForModel(checkStoryboard(storyboardMeta(o.storyDir)));
    const subjects = existsSync(join(o.storyDir, "SUBJECTS.md"))
      ? []
      : ["the survey of other subjects (record_subject) is not recorded"];
    const all = [...gaps, ...subjects];
    return all.length
      ? `Still open: ${all.slice(0, 5).join(" | ")}.`
      : "Gate 2 can close.";
  };

  for (let step = 0; step < 24; step++) {
    const s = await whereIs(o.storyDir);
    const state = `${s.phase}/${s.status}/${s.resume}`;
    say(`STATE ${state}`);
    o.journalist.phase = s.phase;
    if (s.phase === "done")
      return {
        outcome: "done",
        phase: s.phase,
        reason: s.resume,
        steps,
        transcript,
      };
    // A craft kit's measurement ends at its render: designer and delivery were measured in full runs and cost
    // minutes per run (SPLASH_STOP_AFTER_CRAFT=1, eval only).
    if (process.env.SPLASH_STOP_AFTER_CRAFT === "1" && s.phase === "production" && /Invoke designer/.test(s.resume))
      return { outcome: "crafted", phase: s.phase, reason: s.resume, steps, transcript };
    if (s.status === "blocked")
      return {
        outcome: "blocked",
        phase: s.phase,
        reason: s.resume,
        steps,
        transcript,
      };
    stalls = state === lastState ? stalls + 1 : 0;
    lastState = state;
    if (stalls >= 2)
      return {
        outcome: "stalled",
        phase: s.phase,
        reason: s.resume,
        steps,
        transcript,
      };
    const owner = s.owner ? `${s.owner.kind}:${s.owner.id}` : "";
    const t0 = Date.now();
    let stop = "harness";

    if (s.phase === "intake") {
      return {
        outcome: "blocked",
        phase: s.phase,
        reason: "stage the story first (run-root.ts stageStory)",
        steps,
        transcript,
      };
    } else if (owner === "persona:editor") {
      const sess = await session(
        "persona:editor",
        "story",
        `${read(PROFILES["persona:editor"].body)}\n\nThe story is ${o.storyDir}. Return the JSON your contract defines.`,
        [f.readFile, f.listDir],
      );
      const res = await converse({
        session: sess,
        first: `The story ${o.storyDir} is at FRAMING (Gate 1). Read its frozen sources and return your proposals.`,
        journalist: o.journalist,
        dialogue,
        conversational: false,
        done: async () => false,
        gaps: async () => "",
        log: transcript,
        limits: { minutes: 5 },
      });
      const reply = sess.getLastAssistantText() ?? "";
      const checked = checkEditorProposals(reply, o.storyDir);
      editorProposals = checked ? describeProposals(checked) : reply;
      say(`EDITOR ${checked ? `${checked.length} proposal(s): ${checked.map((c) => `${c.grounding}${c.unsourcedNumbers.length ? ` unsourced ${c.unsourcedNumbers.join("/")}` : ""}`).join("; ")}` : "reply held no parseable proposals"}`);
      sess.dispose();
      stop = res.stop;
      // The editor may not write STORYBOARD.md: Gate 1 is answered inside the storyboard session.
      await storyboardPhase();
    } else if (owner === "skill:storyboard") {
      await storyboardPhase();
    } else if (owner === "skill:analyst") {
      for (const slot of storyboardMeta(o.storyDir).slots ?? []) {
        const res = await runCommand(
          [
            "bun",
            join(o.root, "skills/analyst/scripts/build-data.mjs"),
            o.storyDir,
            String(slot.id),
          ],
          bases,
        );
        say(
          `ANALYST slot ${slot.id}: exit ${res.exitCode} ${res.stderr.slice(0, 300)}`,
        );
      }
    } else if (s.phase === "production" && CRAFT_OWNERS.has(owner)) {
      const result = await craftPhase();
      if (result)
        return {
          outcome: "blocked",
          phase: s.phase,
          reason: result,
          steps,
          transcript,
        };
    } else if (owner === "persona:designer") {
      await reviewPhase();
    } else if (owner === "skill:deliver") {
      await deliverPhase();
      // Splash's own G4 check reopens delivery once the closing answers are recorded (their receipts
      // are digested into the manifest as "pending"); the delivery is closed when both are answered.
      const beat = firstBeat();
      const exportDir = join(o.storyDir, "export", beat);
      if (await closingAnswered(exportDir)) {
        steps.push({
          owner,
          stop: "delivered",
          seconds: Math.round((Date.now() - t0) / 1000),
        });
        return {
          outcome: "done",
          phase: "delivery",
          reason: `delivered export/${beat}/ and closing offers answered`,
          steps,
          transcript,
        };
      }
    } else {
      return {
        outcome: "blocked",
        phase: s.phase,
        reason: `no handler for owner ${owner}: ${s.resume}`,
        steps,
        transcript,
      };
    }
    steps.push({ owner, stop, seconds: Math.round((Date.now() - t0) / 1000) });
  }
  return {
    outcome: "stalled",
    phase: "",
    reason: "step cap",
    steps,
    transcript,
  };

  function firstBeat(): string {
    const beats = readdirSync(join(o.storyDir, "beats")).filter(
      (d) => !d.startsWith("."),
    );
    return beats.sort()[0];
  }

  function recordedSoFar(): string {
    const meta = storyboardMeta(o.storyDir);
    const lines = Object.entries(meta)
      .filter(([k, v]) => k !== "slots" && v !== undefined && v !== "")
      .map(([k, v]) => `- ${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`);
    for (const slot of meta.slots ?? [])
      lines.push(`- slot ${slot.id}: ${Object.entries(slot).filter(([k]) => k !== "id").map(([k, v]) => `${k}=${Array.isArray(v) ? v.join("/") : v}`).join(", ")}`);
    return lines.join("\n");
  }

  async function storyboardPhase() {
    const sb = storyboardTools(bases, dialogue);
    const pal = paletteTools(bases, gate);
    const p = PROFILES["skill:storyboard"];
    const sess = await session(
      "skill:storyboard",
      "story",
      `You are the storyboard step of Splash, running locally. The story is ${o.storyDir}. You talk with the journalist one question at a time and end your turn after each question. You never write STORYBOARD.md yourself: every answer is recorded with a record_ tool (record_takeaway, record_claim, record_hand, record_language, record_slot, record_subject), the candidates menu is built with show_candidates and shown as it returns, and the palette with propose_palette then record_palette. A record only exists if its tool returned "recorded"; never say you recorded something otherwise. Record an answer only after the journalist has given it; when they do not know, propose one with your reasoning and record it only once they accept. This run produces slot 1 only. Keep every message short — at most three sentences before your one question — except when you show the candidates menu.\n\n` +
        [p.body, ...p.requiredReads].map(read).join("\n\n---\n\n"),
      [
        f.readFile,
        f.listDir,
        sb.recordTakeaway,
        sb.recordClaim,
        sb.recordHand,
        sb.recordLanguage,
        sb.recordSlot,
        sb.showCandidates,
        sb.recordSubject,
        pal.propose,
        pal.record,
      ],
    );
    const res = await converse({
      session: sess,
      first: existsSync(join(o.storyDir, "STORYBOARD.md"))
        ? `The story ${o.storyDir} is in the STORYBOARD phase, resumed. Already recorded, do not ask again:\n${recordedSoFar()}\n${await storyboardGaps()} Continue with the journalist from there.`
        : `The story ${o.storyDir} has been through intake.${editorProposals ? ` The editor prepared these framing proposals for Gate 1, each with the code's check against the data:\n${editorProposals}\n` : ""} Run the STORYBOARD phase with the journalist, movement by movement, starting with the restitution.`,
      journalist: o.journalist,
      dialogue,
      gate,
      conversational: true,
      done: async () => (await storyboardGaps()) === "Gate 2 can close.",
      gaps: storyboardGaps,
      log: transcript,
      limits: { minutes: 20 },
    });
    sess.dispose();
    say(`STORYBOARD stop: ${res.stop}`);
  }

  /**
   * The few-valued text columns of data.json and their values, put in front of the craft prompt: a
   * table with several rows per year (by location, by sex) must be filtered to one series, and the
   * 12B twice drew all of them as one line before it read the columns.
   */
  function dataSummary(path: string): string {
    if (!existsSync(path)) return "";
    const table = JSON.parse(readFileSync(path, "utf8")) as { columns: { name: string; type: string }[]; rows: unknown[][] };
    const lines = table.columns.flatMap((c, i) => {
      if (c.type === "number") return [];
      const values = [...new Set(table.rows.map((r) => r[i]).filter((v) => v !== null && v !== "").map(String))];
      return values.length > 1 && values.length <= 6 ? [`- ${c.name}: ${values.map((v) => JSON.stringify(v)).join(", ")}`] : [];
    });
    const shape = `data.json is { columns: [{ name, type }], rows: [[...]] } — each row is an ARRAY of cells in column order; read a cell as row[table.columns.findIndex((c) => c.name === "${table.columns.find((c) => c.type === "number")?.name ?? "name"}")]. Columns: ${table.columns.map((c) => c.name).join(", ")}.\n`;
    return shape + (lines.length
      ? `data.json has ${table.rows.length} rows, and these text columns split them into groups. For EACH column below keep ONE value — the one covering everything (a total, "all", "both"…) unless the takeaway names a group — so each year or category has exactly one row:\n${lines.join("\n")}\nRead columns by name (columns.findIndex), never by a typed index.\n\n`
      : "\n");
  }

  async function craftPhase(): Promise<string | null> {
    const meta = storyboardMeta(o.storyDir);
    const slot = (meta.slots ?? [])[0];
    // The gesture kit first, the per-type kit after a recorded fallback (craft-kit.ts).
    const choice = craftKit(join(o.storyDir, "beats", String(slot?.id ?? "1")), String(slot?.chosen ?? ""), String(slot?.format ?? "static"));
    const adapter = choice.kit;
    if (!adapter)
      return `no zone kit yet for "${slot?.chosen}" in ${slot?.format ?? "static"} (harness-pi/craft/${slot?.format ?? "static"}/)`;
    // Harness-owned closures before craft: palette, the run's one direction, the beat's plan binding.
    closeDerivedPalette(bases);
    if (!existsSync(join(o.storyDir, "DIRECTION.md"))) {
      const prep = join(o.storyDir, ".harness", "direction.mjs");
      mkdirSync(join(o.storyDir, ".harness"), { recursive: true });
      writeFileSync(
        prep,
        `import { composeRunDirection, writeRunDirection } from "${join(o.root, "shared/design-base/run-direction.mjs")}";
import { filedDirections } from "${join(o.root, "shared/design-base/index.mjs")}";
import { readPalette } from "${join(o.root, "shared/chart-beat/colour.mjs")}";
const p = readPalette(${JSON.stringify(o.storyDir)}, { stopAt: ${JSON.stringify(o.storyDir)} });
const { chosen } = composeRunDirection({ newsroom: { ground: p.ground, accent: p.accent, origin: p.origin }, filed: filedDirections(), subject: ${JSON.stringify(String(meta.takeaway ?? ""))} });
writeRunDirection(${JSON.stringify(o.storyDir)}, chosen);\n`,
      );
      const res = await runCommand(["bun", prep], bases);
      say(`DIRECTION exit ${res.exitCode} ${res.stderr.slice(0, 300)}`);
    }
    const beat = String(slot.id);
    const beatDir = join(o.storyDir, "beats", beat);
    // Every run records which kit crafted the beat.
    mkdirSync(join(beatDir, ".harness"), { recursive: true });
    writeFileSync(join(beatDir, ".harness", "kit.txt"), `${adapter}\n`);
    say(`CRAFT kit: ${adapter.split("/craft/")[1] ?? adapter}${choice.gestures ? " (gestures)" : ""}`);
    // The adapter directory is the whole kit: generic runner, worked component, contract, example.
    for (const file of readdirSync(adapter))
      cpSync(join(adapter, file), join(beatDir, file));
    // The refusals and readers every kit shares (craft/_shared) travel with it.
    const shared = join(adapter, "..", "..", "_shared");
    for (const file of readdirSync(shared)) cpSync(join(shared, file), join(beatDir, file));
    if (!existsSync(join(beatDir, "BRIEF.md"))) {
      writeFileSync(
        join(beatDir, "BRIEF.md"),
        `---\nplanVersion: 1\nfindingIds: [slot-${beat}]\n---\n\n# Beat ${beat}\n\n${slot.proves ?? ""}\n`,
      );
    }
    const sess = await session(
      "skill:chart-beat",
      beat,
      `You are the chart-beat craft step of Splash, running locally. The Splash root is ${o.root}. The story is ${o.storyDir}. You act only through your tools.\n\n${await contractText(adapter, String(slot.format ?? "static"))}`,
      [
        f.readFile,
        f.listDir,
        beatTools(bases, beat).writeFile,
        beatTools(bases, beat).editFile,
        lookTool(bases),
        r.render,
      ],
    );
    // The 12B often says DONE, or stops, while its beat still refuses to render. The harness renders
    // the beat itself and hands the exact refusal back in the SAME session (its context intact), up to
    // three times, instead of opening a new session that starts from nothing.
    let prompt = `${dataSummary(join(beatDir, "data.json"))}${choice.gestures ? claimBlock(meta as unknown as Record<string, unknown>) : ""}Slot ${beat} of ${o.storyDir} is a ${slot.format ?? "static"} "${slot.chosen}" ${slot.medium ?? "chart"} beat, prepared at beats/${beat}/. The confirmed takeaway is in STORYBOARD.md and is the title, word for word. Write every word on the plate (eyebrow, labels, unit, standfirst, alt) in the story's language, "${meta.language ?? "en"}", whatever language the data's column names are in. Draw the measure the takeaway is about: a takeaway about a rate, share or ranking per resident draws that computed measure, not the raw column. Write beats/${beat}/beat.mjs as CONTRACT.md says, render it with render_beat (beat "${beat}", format "${slot.format ?? "static"}"), look at the PNG, fix what is wrong, and reply DONE when the render is right.`;
    let final: { exitCode: number; stdout: string; stderr: string } = { exitCode: 1, stdout: "", stderr: "beat.mjs was never written" };
    const craftStart = Date.now();
    for (let attempt = 0; attempt < 3 && Date.now() - craftStart < 20 * 60_000; attempt++) {
      const res = await converse({
        session: sess,
        first: prompt,
        journalist: o.journalist,
        dialogue,
        conversational: false,
        done: async () => false,
        gaps: async () => "",
        log: transcript,
        limits: { minutes: 15 },
      });
      say(`CRAFT stop: ${res.stop}`);
      // The delivered render is the render of the beat.mjs on disk: the 12B once fixed beat.mjs after
      // its last render and shipped the stale, wrong picture.
      if (existsSync(join(beatDir, "beat.mjs")))
        final = await runCommand(["bun", join(beatDir, "render-beat.mjs")], bases);
      say(`CRAFT final render: exit ${final.exitCode}${final.exitCode ? ` ${(final.stdout.match(/REFUSED.*/)?.[0] ?? final.stderr).slice(-300)}` : ""}`);
      if (final.exitCode === 0 || res.stop.endsWith("min cap")) break;
      // A kit refuses on stdout ("REFUSED — …") or throws on stderr ("error: …").
      const output = `${final.stdout}\n${final.stderr}`;
      // The refusal line and the lines under it: a build failure says only "2 errors building …" on its first line.
      const lines = output.split("\n");
      const at = lines.findIndex((l) => /^\s*(error|REFUSED)/i.test(l));
      const reason = at >= 0 ? lines.slice(at, at + 6).map((l) => l.trim()).filter(Boolean).join(" ").slice(0, 900) : final.stderr.slice(-400);
      prompt = `[harness] The beat does not render yet: ${reason}${refusalHint(output)} Fix beats/${beat}/beat.mjs with small edit_file calls, render it, look at the PNG, and reply DONE only when the render succeeds.`;
    }
    sess.dispose();
    // The gesture kit never fails on its staging: when the 12B's attempts end on a refused gesture list, the kit
    // applies the core's own fixes to the model's list (SPLASH_GESTURE_REPAIR), and the run reports each repair.
    if (final.exitCode !== 0 && choice.gestures && existsSync(join(beatDir, "beat.mjs")) && /gestures/.test(`${final.stdout}${final.stderr}`)) {
      final = await runCommand(["bun", join(beatDir, "render-beat.mjs")], bases, { SPLASH_GESTURE_REPAIR: "1" });
      for (const line of final.stdout.split("\n").filter((l) => l.startsWith("REPAIRED"))) say(`CRAFT ${line.slice(0, 240)}`);
      say(`CRAFT repaired render: exit ${final.exitCode}`);
    }
    // A refusal leaves the beat unrendered, so whereIs sends it back to craft.
    if (final.exitCode !== 0) rmSync(join(beatDir, "renders"), { recursive: true, force: true });
    // The gesture kit failed: record the fallback and craft again on the per-type kit, in a new session on its
    // contract. Measurement runs turn this off so they judge the gesture kit alone.
    if (final.exitCode !== 0 && choice.fallbackAllowed) {
      const reason = (final.stdout.match(/REFUSED.*/)?.[0] ?? final.stderr).slice(-400);
      const to = recordFallback(beatDir, String(slot.chosen), String(slot.format ?? "static"), { from: adapter, refusal: reason });
      say(`CRAFT fallback: gesture kit refused (${reason.slice(0, 160)}); continuing on ${to?.split("/craft/")[1] ?? to}`);
      return craftPhase();
    }
    return null;
  }

  function pngOf(dir: string): string | null {
    const renders = join(dir, "renders");
    const png = existsSync(renders) ? readdirSync(renders).find((f) => f.endsWith(".png")) : undefined;
    return png ? join(renders, png) : null;
  }

  async function reviewPhase() {
    const beat = firstBeat();
    const beatDir = join(o.storyDir, "beats", beat);
    const sess = await session(
      "persona:designer",
      beat,
      `${read(PROFILES["persona:designer"].body)}\n\nThe story is ${o.storyDir}. Call review_facts first and look at the PNG; cite review_facts' measurements as evidence. Judge also whether the render proves the slot's claim and says the takeaway.\n\n${read("skills/doctrine/references/design-rubric.md")}`,
      [f.readFile, f.listDir, lookTool(bases), reviewTools(bases)],
    );
    await converse({
      session: sess,
      first: `Review the rendered beat ${beatDir} and return your verdicts as the JSON your contract defines. Its render is ${pngOf(beatDir) ?? "in renders/"}; call review_facts with beat "${basename(beatDir)}", then look at that PNG.`,
      journalist: o.journalist,
      dialogue,
      conversational: false,
      done: async () => false,
      gaps: async () => "",
      log: transcript,
      limits: { minutes: 6 },
    });
    const review = sess.getLastAssistantText() ?? "";
    sess.dispose();
    // Gate 3 is the journalist's: the harness asks, and writes OUTPUT-REVIEW.json only on approval,
    // with the QA receipt from the render that exists and the designer's verdicts as evidence.
    const pngs = existsSync(join(beatDir, "renders"))
      ? readdirSync(join(beatDir, "renders")).filter((x) => x.endsWith(".png"))
      : [];
    const answer = await o.journalist.answer(
      `The beat is rendered at ${join(beatDir, "renders", pngs[0] ?? "")}. The designer's review:\n${review.slice(0, 1500)}\n\nDo you approve this visual for delivery?`,
    );
    say(`APPROVAL QUESTION → ${answer}`);
    if (!/^(yes|oui|approved?|ok)/i.test(answer.trim()) || pngs.length === 0) {
      writeFileSync(join(beatDir, "FEEDBACK.md"), `${answer}\n`);
      return;
    }
    const outputId = basename(beatDir);
    const draftDigest = renderDigest(beatDir);
    const findingIds = [`slot-${outputId.split("-")[0]}`];
    await writeOutputReview({
      beatDir,
      id: `review-${outputId}-${Date.now()}`,
      planVersion: 1,
      findingIds,
      qaRuns: [
        {
          schemaVersion: QA_RUN_SCHEMA_VERSION,
          id: `qa-${outputId}-${Date.now()}`,
          outputId,
          planVersion: 1,
          draftDigest,
          findingIds,
          status: "passed",
          completedAt: new Date().toISOString(),
        },
      ],
      angleEvidenceBrief:
        review.slice(0, 2000) || "designer review unavailable",
      decision: "approve",
      reviewer: "journalist",
      decidedAt: new Date().toISOString(),
      notes: answer,
      replacesReviewId: undefined,
    });
  }

  async function deliverPhase() {
    const beat = firstBeat();
    const dl = deliverTools(bases, dialogue);
    const sess = await session(
      "skill:deliver",
      beat,
      `You are the delivery step of Splash, running locally. The story is ${o.storyDir}. Call offer_forms, show the forms to the journalist, ask which one and end your turn. When they name one, call materialise with that form id and an alt text describing the chart. Then call offer_closing, show both offers, ask and end your turn, and record each answer with record_closing. A step only happened if its tool returned success; never say otherwise.\n\n${read(PROFILES["skill:deliver"].body)}`,
      [f.readFile, f.listDir, dl.offer, dl.make, dl.closing, dl.recordClosing],
    );
    const exportDir = join(o.storyDir, "export", beat);
    const res = await converse({
      session: sess,
      first: `Beat ${beat} of ${o.storyDir} is approved. Run the DELIVERY phase.`,
      journalist: o.journalist,
      dialogue,
      conversational: true,
      done: async () => await closingAnswered(exportDir),
      gaps: async () =>
        existsSync(join(exportDir, "HANDOVER.md"))
          ? "The closing offers are not both answered yet."
          : "Nothing is materialised yet.",
      log: transcript,
      limits: { minutes: 8 },
    });
    sess.dispose();
    say(`DELIVER stop: ${res.stop}`);
  }
}
