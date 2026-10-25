// Phase bench: run ONE Splash phase on the local model, from a story prepared exactly at that
// phase's entry, with the phase's real instructions, and let Splash's own code give the verdict.
// Usage: bun harness-pi/bench/bench.ts <phase> [--model gemma-4-12b] [--root <dir>]
// Phases: intake editor storyboard palette analyst craft designer deliver
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import type { AgentSession } from "@earendil-works/pi-coding-agent";
import { createRunRoot, stageStory } from "../src/run-root.ts";
import { fsTools } from "../src/tools/fs.ts";
import { lookTool } from "../src/tools/look.ts";
import { runCommand, runTools } from "../src/tools/run.ts";
import { openSession } from "../src/sessions.ts";
import { type OwnerId, PROFILES } from "../src/profiles.ts";
import { whereIs } from "../../skills/splash/scripts/where.mjs";
import {
  checkStoryboard,
  parseStoryboard,
} from "../../skills/splash/scripts/gate-contract.mjs";
import { readPalette } from "../../skills/palette/scripts/palette.mjs";

const CHECKOUT = resolve(import.meta.dirname, "../..");
const SLUG = "stress-p-transport-ridership";
const REPO_STORY = join(CHECKOUT, "stories", SLUG);
const args = process.argv.slice(2);
const phase = args[0];
const flag = (name: string, fallback: string) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const modelId = flag("model", "gemma-4-12b");
const root = flag("root", join(homedir(), ".splash-harness", "bench", "root"));
const LIMITS = {
  minutes: Number(flag("minutes", "40")),
  toolCalls: 40,
  sameFailure: 3,
  rounds: 14,
};

// ---------------------------------------------------------------------------------------------
// Preparation helpers: each builds the story state a phase expects to find on disk.

async function freshStory(): Promise<string> {
  if (!existsSync(root)) await createRunRoot({ checkout: CHECKOUT, dir: root });
  const dir = join(root, "stories", SLUG);
  rmSync(dir, { recursive: true, force: true });
  return (await stageStory({ root, checkout: CHECKOUT, slug: SLUG })).storyDir;
}

/** The repository's storyboard, written by a frontier-model run, reduced to its first slot. */
function writeReferenceStoryboard(storyDir: string) {
  const text = readFileSync(join(REPO_STORY, "STORYBOARD.md"), "utf8");
  const firstSlotOnly = text.replace(/\n  - id: 2[\s\S]*?\n---\n/, "\n---\n");
  writeFileSync(join(storyDir, "STORYBOARD.md"), firstSlotOnly);
}

async function script(storyDir: string, code: string) {
  const file = join(storyDir, ".harness", `prep-${Date.now()}.mjs`);
  mkdirSync(join(storyDir, ".harness"), { recursive: true });
  writeFileSync(file, code);
  const r = await runCommand(["bun", file], { root, storyDir });
  if (r.exitCode !== 0)
    throw new Error(`preparation failed:\n${r.stderr || r.stdout}`);
}

async function writeSubjects(storyDir: string) {
  await script(
    storyDir,
    `import { recordSurveyedSubjects } from "${join(root, "skills/deliver/scripts/other-subjects.mjs")}";
await recordSurveyedSubjects({ storyDir: ${JSON.stringify(storyDir)}, subjects: [
  { id: "per-resident", learns: "Ranked per resident, Porto overtakes Lisboa and Aveiro drops to last.", medium: "chart", format: "web" },
] });`,
  );
}

function writePalette(storyDir: string) {
  writeFileSync(
    join(storyDir, "PALETTE.md"),
    `---\nground: "#FFFFFF"\naccent: "#0B7A75"\norigin: newsroom\n---\n\n# The colours this story is drawn in\n`,
  );
}

async function writeDirection(storyDir: string) {
  await script(
    storyDir,
    `import { composeRunDirection, writeRunDirection } from "${join(root, "shared/design-base/run-direction.mjs")}";
import { filedDirections } from "${join(root, "shared/design-base/index.mjs")}";
const { chosen } = composeRunDirection({ newsroom: { ground: "#FFFFFF", accent: "#0B7A75", origin: "newsroom" }, filed: filedDirections(), subject: "Lisboa carries more trips than the other five networks together" });
writeRunDirection(${JSON.stringify(storyDir)}, chosen);`,
  );
}

async function buildData(storyDir: string) {
  const r = await runCommand(
    ["bun", join(root, "skills/analyst/scripts/build-data.mjs"), storyDir, "1"],
    {
      root,
      storyDir,
    },
  );
  if (r.exitCode !== 0)
    throw new Error(`build-data failed:\n${r.stderr || r.stdout}`);
}


/** A story whose slot-1 beat holds a real render (a proof beat's), BRIEF and data, ready for review. */
async function renderedBeat(): Promise<string> {
  const d = await freshStory();
  writeReferenceStoryboard(d);
  await writeSubjects(d);
  writePalette(d);
  await writeDirection(d);
  await buildData(d);
  const beat = join(d, "beats", "1-lisboa-share");
  const fromBuild = join(d, "beats", "1");
  if (existsSync(fromBuild)) cpSync(fromBuild, beat, { recursive: true }), rmSync(fromBuild, { recursive: true });
  mkdirSync(join(beat, "renders"), { recursive: true });
  for (const f of ["creme.png", "creme.svg"]) cpSync(join(CHECKOUT, "proof/static-bar-top-emitters-2024/renders", f), join(beat, "renders", f));
  return d;
}

// ---------------------------------------------------------------------------------------------
// The journalist's answers, taken from the reference storyboard (stories/stress-p…/STORYBOARD.md).

// Matched on the question the model asked, most specific first; anything unmatched gets the
// answer the exchange already accepts from a journalist who does not know.
const SHEET: [RegExp, string][] = [
  [/delivery form|which form|owned-file|source-bundle/i, "owned-file"],
  [/another format|other format/i, "No, thank you."],
  [/\balt\b|alternative text/i, "A horizontal bar chart: Lisboa's 214 million trips against Porto's 96 million and four smaller networks."],
  [/caveat/i, "One year only (2025); trips, not people."],
  [/language/i, "English."],
  [/palette|colou?r|option \d|ground|accent/i, "Option 1, the house colours."],
  [/datawrapper|custom|producer/i, "Custom."],
  [/candidate|which (treatment|chart type)|bar and column|lollipop|treemap/i, "Bar and column."],
  [/reference|example you (like|admire)|inspiration/i, "No reference, thank you."],
  [/survey|other (subject|angle)|another subject/i, "No other subject for now."],
  [/portrait|square|landscape|\bsize\b/i, "Landscape."],
  [/static|interactive|video|scroll/i, "Static."],
  [/\bmedium\b|chart, (a )?map|map,? or (an )?image/i, "A chart."],
  [/intent|what should the reader do|compare|ranking|part.to.whole/i, "Comparison between categories."],
  [/maximum|minimum|shape|which column/i, "It is a comparison, about the column trips_millions: Lisboa against Porto and against the six together."],
  [/credit|source|effective|as of|date/i, "Unattributed, as of 2026-08-21."],
  [/position|placement|where should/i, "After the opening paragraph."],
  [/not (let you )?conclude|limit/i, "One year only (2025), so no trend. Six city networks, not all Portuguese public transport. Trips count trips, not people."],
  [/compare it to|comparison|against what/i, "Porto's 96 million, and the 394 million all six networks carry between them."],
  [/subject of (your|the) piece|who is the subject/i, "The subject is Lisboa, the network the article opens on."],
  [/one sentence|takeaway|keeps? one|reader keep/i, "Lisboa alone carries 214 of the 394 million trips these six Portuguese city networks recorded in 2025 — more than twice Porto's 96 million."],
  [/read in your piece|restitution|correct\??|is that right|did I read/i, "Yes, that is what the piece says. The data is the six city networks for 2025."],
];
// Only the LAST question in the turn is the one being asked: the model often restates earlier
// movements ("landscape is an orientation, but first...") before it.
const lastQuestion = (said: string) => {
  const qs = said.split(/(?<=\?)/).map((x) => x.trim()).filter((x) => x.endsWith("?"));
  return qs.length ? qs[qs.length - 1].split(/[.!\n*]\s/).pop()! : said.slice(-300);
};
const answerFor = (said: string) => {
  const q = lastQuestion(said);
  return SHEET.find(([re]) => re.test(q))?.[1] ?? "I don't know.";
};

// ---------------------------------------------------------------------------------------------

interface Case {
  owner: OwnerId;
  conversational: boolean;
  prepare(): Promise<string>;
  task(storyDir: string): string;
  verdict(storyDir: string): Promise<{ pass: boolean; detail: string }>;
}

const stateOf = async (storyDir: string) => {
  const s = await whereIs(storyDir);
  return `${s.phase}/${s.status} — ${s.resume}`;
};

const CASES: Record<string, Case> = {
  intake: {
    owner: "skill:storyboard", // intake has no profile of its own: the model only has to call freezeSource
    conversational: false,
    async prepare() {
      const dir = await freshStory();
      for (const f of [
        "article.md",
        "data.csv",
        "profile.json",
        "MANIFEST.json",
      ])
        rmSync(join(dir, "source", f), { force: true });
      mkdirSync(join(dir, "inbox"), { recursive: true });
      cpSync(
        join(REPO_STORY, "source", "article.md"),
        join(dir, "inbox", "draft.md"),
      );
      cpSync(
        join(REPO_STORY, "source", "data.csv"),
        join(dir, "inbox", "ridership.csv"),
      );
      return dir;
    },
    task: (d) =>
      `Run the INTAKE phase: freeze the journalist's article inbox/draft.md and data inbox/ridership.csv into ${d}/source/ with the intake skill's freezeSource (skills/intake/scripts/freeze.mjs).`,
    async verdict(d) {
      const s = await whereIs(d);
      return { pass: s.phase !== "intake", detail: await stateOf(d) };
    },
  },
  editor: {
    owner: "persona:editor",
    conversational: false,
    prepare: freshStory,
    task: (d) =>
      `The story ${d} is at FRAMING (Gate 1). Read its frozen sources and return your proposals as the JSON your return contract defines, ending with the Gate-1 question.`,
    async verdict(d) {
      return {
        pass: !existsSync(join(d, "STORYBOARD.md")),
        detail: "judged on the returned JSON (see transcript)",
      };
    },
  },
  storyboard: {
    owner: "skill:storyboard",
    conversational: true,
    prepare: freshStory,
    task: (d) =>
      `The story ${d} has been through intake. Run the STORYBOARD phase with the journalist, movement by movement, starting with the restitution. Each time you need the journalist, ask one question and end your turn.`,
    async verdict(d) {
      const path = join(d, "STORYBOARD.md");
      if (!existsSync(path))
        return { pass: false, detail: "no STORYBOARD.md written" };
      const { meta } = parseStoryboard(readFileSync(path, "utf8"));
      const errors = checkStoryboard(meta);
      return {
        pass: errors.length === 0,
        detail: `${errors.length} gate errors: ${errors.slice(0, 6).join(" | ")} — ${await stateOf(d)}`,
      };
    },
  },
  palette: {
    owner: "skill:storyboard",
    conversational: true,
    async prepare() {
      const d = await freshStory();
      writeReferenceStoryboard(d);
      return d;
    },
    task: (d) =>
      `The storyboard of ${d} is written except its palette. Run movement 9 (palette) as skills/palette/SKILL.md describes: propose, ask the journalist, then record PALETTE.md at the story root.`,
    async verdict(d) {
      try {
        const p = readPalette(d, { stopAt: d });
        return { pass: true, detail: `PALETTE.md valid: ${JSON.stringify(p)}` };
      } catch (e) {
        return {
          pass: false,
          detail: String((e as Error).message).slice(0, 300),
        };
      }
    },
  },
  analyst: {
    owner: "skill:analyst",
    conversational: false,
    async prepare() {
      const d = await freshStory();
      writeReferenceStoryboard(d);
      await writeSubjects(d);
      writePalette(d);
      return d;
    },
    task: (d) =>
      `whereIs says: ${"production/analysis"} for ${d}. Run the analyst for slot 1.`,
    async verdict(d) {
      return {
        pass:
          existsSync(join(d, "beats")) &&
          !(await stateOf(d)).includes("analyst"),
        detail: await stateOf(d),
      };
    },
  },
  craft: {
    owner: "skill:chart-beat",
    conversational: false,
    async prepare() {
      const d = await freshStory();
      writeReferenceStoryboard(d);
      await writeSubjects(d);
      writePalette(d);
      await writeDirection(d);
      await buildData(d);
      return d;
    },
    task: (d) =>
      `Produce slot 1 of ${d} (chosen: "Bar and column", static, landscape) as a chart beat in beats/1-…/ as the skill describes: scaffold, write the beat's own claim, title and marks, render, look, fix. Reply DONE when the render is right.`,
    async verdict(d) {
      return {
        pass:
          (await whereIs(d)).phase !== "production" ||
          (await stateOf(d)).includes("review"),
        detail: await stateOf(d),
      };
    },
  },
  designer: {
    owner: "persona:designer",
    conversational: false,
    async prepare() {
      const d = await renderedBeat();
      return d;
    },
    task: (d) =>
      `Review the rendered beat ${d}/beats/1-lisboa-share against the rubric and slot 1 of the storyboard, and return your verdicts as the JSON your return contract defines.`,
    async verdict() {
      return { pass: true, detail: "judged on the returned JSON (see transcript)" };
    },
  },
  deliver: {
    owner: "skill:deliver",
    conversational: true,
    async prepare() {
      const d = await renderedBeat();
      await script(
        d,
        `import { approveCurrentOutput } from "${join(CHECKOUT, "skills/deliver/test/output-review-fixture.ts")}";
await approveCurrentOutput(${JSON.stringify(join("BEAT_DIR"))});`.replace("\"BEAT_DIR\"", JSON.stringify(join(d, "beats", "1-lisboa-share"))),
      );
      return d;
    },
    task: (d) =>
      `Beat 1-lisboa-share of ${d} is approved. Run the DELIVERY phase: offer the journalist the forms, wait for the choice, then materialise only that one.`,
    async verdict(d) {
      const s = await whereIs(d);
      return { pass: s.phase === "done" || existsSync(join(d, "export", "1-lisboa-share", "HANDOVER.md")), detail: await stateOf(d) };
    },
  },
};

// ---------------------------------------------------------------------------------------------

function systemPromptFor(owner: OwnerId, storyDir: string): string {
  const p = PROFILES[owner];
  const preamble = `You are one step of Splash, running locally. The Splash root is ${root}. The story is ${storyDir}. You act only through your tools; there is no shell. Command lines in the skill map to tools: scaffolding is scaffold_static_beat, "bun <beat>/render-directions.mjs" is render_beat with format "static", the analyst command is build_data, looking at a PNG is look, and any JavaScript the skill shows you is run with run_script (import modules by absolute path under ${root}/skills or ${root}/shared). To change a file, use edit_file with old_text copied exactly from read_file output, one small region at a time.\n\n`;
  return (
    preamble +
    [p.body, ...p.requiredReads]
      .map((f) => readFileSync(join(CHECKOUT, f), "utf8"))
      .join("\n\n---\n\n")
  );
}

async function drive(
  session: AgentSession,
  first: string,
  conversational: boolean,
) {
  const t0 = Date.now();
  let toolCalls = 0;
  let lastFailure = "";
  let sameFailure = 0;
  let stop = "";
  const transcript: string[] = [];
  const off = session.subscribe((e) => {
    if (e.type === "tool_execution_end") {
      toolCalls++;
      transcript.push(
        `TOOL ${e.toolName}${e.isError ? " ERROR" : ""}: ${JSON.stringify(e.result?.content?.[0]?.text ?? "").slice(0, 300)}`,
      );
      const sig = e.isError
        ? `${e.toolName}:${JSON.stringify(e.result?.content?.[0]?.text ?? "").slice(0, 120)}`
        : "";
      sameFailure = sig && sig === lastFailure ? sameFailure + 1 : 0;
      lastFailure = sig;
      if (toolCalls >= LIMITS.toolCalls) stop = "tool-call cap";
      if (sameFailure + 1 >= LIMITS.sameFailure)
        stop = `same failure ${LIMITS.sameFailure}x`;
      if (stop) void session.abort();
    }
  });
  const timer = setTimeout(() => {
    stop = `${LIMITS.minutes} min cap`;
    void session.abort();
  }, LIMITS.minutes * 60_000);
  let prompt = first;
  try {
    for (let round = 0; round < LIMITS.rounds && !stop; round++) {
      await session.prompt(prompt);
      const said = session.getLastAssistantText() ?? "";
      transcript.push(`MODEL: ${said.slice(0, 1200)}`);
      if (!conversational) break;
      // Only the question at the end of the turn is the one being asked.
      prompt = answerFor(said);
      transcript.push(`JOURNALIST: ${prompt}`);
    }
  } catch (e) {
    stop ||= `error: ${(e as Error).message}`;
  } finally {
    clearTimeout(timer);
    off();
  }
  return {
    seconds: Math.round((Date.now() - t0) / 1000),
    toolCalls,
    stop: stop || "ended",
    transcript,
  };
}

const c = CASES[phase];
if (!c)
  throw new Error(
    `unknown phase ${phase}; one of ${Object.keys(CASES).join(", ")}`,
  );
const storyDir = await c.prepare();
const before = await stateOf(storyDir);
if (args.includes("--dry")) {
  console.log(JSON.stringify({ phase, storyDir, before }, null, 2));
  process.exit(0);
}
const bases = { root, storyDir };
const f = fsTools(bases);
const r = runTools(bases);
const profile = PROFILES[c.owner];
const writeless = c.owner.startsWith("persona:");
const tools = writeless
  ? [f.readFile, f.listDir, lookTool(bases)]
  : [
      f.readFile,
      f.listDir,
      f.writeFile,
      f.editFile,
      lookTool(bases),
      r.scaffoldStatic,
      r.render,
      r.buildData,
      r.runScript,
    ];
const session = await openSession({
  runRoot: root,
  key: { story: SLUG, owner: c.owner, slot: phase, attempt: Date.now() },
  systemPrompt: systemPromptFor(c.owner, storyDir),
  tools,
  keepRecentTokens: profile.keepRecentTokens,
  modelId,
});
const run = await drive(session, c.task(storyDir), c.conversational);
const stats = session.getSessionStats();
const v = await c.verdict(storyDir);
const report = {
  phase,
  model: modelId,
  before,
  pass: v.pass,
  verdict: v.detail,
  seconds: run.seconds,
  toolCalls: run.toolCalls,
  stop: run.stop,
  context: stats.contextUsage,
  sessionFile: stats.sessionFile,
};
session.dispose();
const out = join(root, "..", "results");
mkdirSync(out, { recursive: true });
writeFileSync(
  join(out, `${phase}-${Date.now()}.json`),
  JSON.stringify({ ...report, transcript: run.transcript }, null, 2),
);
console.log(JSON.stringify(report, null, 2));
