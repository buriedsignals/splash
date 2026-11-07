// T2 replay scan (Tom, REMI §2 row 1): every kept Pi session under ~/.splash-harness/kept-runs, read
// for the harness problems it already recorded — refusals by form, the same refusal repeated, streaks the
// 6-refusal bound would have ended, turns with no record, and prose that claims a record no tool made.
// Free: it reads transcripts, it calls no model.
// Usage: bun harness-pi/eval/replay-scan.ts [--root <kept-runs dir>] [--top 25]
import { readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  FIRST_RECORD_TURNS,
  NEXT_RECORD_TURNS,
  REFUSAL_STREAK,
} from "../src/conversation.ts";

export type Form =
  "output-limit" | "schema" | "kit-refused" | "code-error" | "tool-refused";

/** One refusal's form and a signature stable across runs (figures, quotes and paths folded). */
export function classify(
  tool: string,
  text: string,
): { form: Form; sig: string } {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const pick = (re: RegExp) => lines.find((l) => re.test(l));
  let form: Form;
  let line: string;
  if (/output token limit/.test(text))
    [form, line] = ["output-limit", "hit the output token limit"];
  else if (
    /Validation failed|must have required propert|Expected .* but received|invalid arguments/i.test(
      text,
    )
  )
    [form, line] = [
      "schema",
      pick(/Validation failed|must have|Expected|invalid/i) ?? lines[0] ?? "",
    ];
  else if (/REFUSED/.test(text))
    [form, line] = ["kit-refused", pick(/REFUSED/) ?? ""];
  else if (/^error: |\b(TypeError|ReferenceError|SyntaxError)\b/m.test(text))
    [form, line] = [
      "code-error",
      pick(/^error: |TypeError|ReferenceError|SyntaxError/) ?? "",
    ];
  else
    [form, line] = [
      "tool-refused",
      lines.find((l) => !l.startsWith("$ ") && !/^exit \d+$/.test(l)) ??
        lines[0] ??
        "",
    ];
  const sig = `${tool}: ${line
    .replace(/\/[^\s"']+/g, "<path>")
    .replace(/"[^"]*"/g, '"…"')
    .replace(/-?\d[\d.,]*/g, "N")
    .slice(0, 140)}`;
  return { form, sig };
}

const RECORD =
  /^(record_|materialise|propose_palette|show_candidates|write_file|edit_file)/;
const CLAIMED =
  /\b(I have|I've|I)( now| also| successfully| just)? (recorded|saved|materiali[sz]ed|updated|refined|registered|fixed)\b/i;

export interface SessionScan {
  file: string;
  owner: string;
  turns: number;
  /** Each refusal, and whether the next call succeeded (the feedback worked, through this tool or another). */
  refusals: { form: Form; sig: string; recovered: boolean }[];
  maxStreak: number;
  /** The turn the 16/12 watchdog would have stopped this session at, if any. */
  watchdogAt: number | null;
  claimsWithoutRecord: number;
}

export function scanSession(
  file: string,
  owner: string,
  jsonl: string,
): SessionScan {
  const s: SessionScan = {
    file,
    owner,
    turns: 0,
    refusals: [],
    maxStreak: 0,
    watchdogAt: null,
    claimsWithoutRecord: 0,
  };
  let streak = 0;
  let since = 0;
  let ever = false;
  let recordedThisTurn = false;
  let lastText = "";
  const endTurn = () => {
    if (CLAIMED.test(lastText) && !recordedThisTurn) s.claimsWithoutRecord++;
    lastText = "";
    recordedThisTurn = false;
  };
  for (const raw of jsonl.split("\n")) {
    if (!raw.trim()) continue;
    let d: {
      type?: string;
      message?: {
        role?: string;
        toolName?: string;
        isError?: boolean;
        content?: unknown;
      };
    };
    try {
      d = JSON.parse(raw);
    } catch {
      continue;
    }
    const m = d.message;
    if (d.type !== "message" || !m) continue;
    // A turn runs from one prompt (a user message) to the next: its claims are judged against all its calls.
    if (m.role === "user") endTurn();
    else if (m.role === "assistant") {
      s.turns++;
      since++;
      const parts = Array.isArray(m.content)
        ? (m.content as { type: string; text?: string }[])
        : [];
      lastText += parts
        .filter((p) => p.type === "text")
        .map((p) => p.text ?? "")
        .join("\n");
      if (
        s.watchdogAt === null &&
        since >= (ever ? NEXT_RECORD_TURNS : FIRST_RECORD_TURNS)
      )
        s.watchdogAt = s.turns;
    } else if (m.role === "toolResult") {
      const text = Array.isArray(m.content)
        ? (m.content as { text?: string }[]).map((p) => p.text ?? "").join("\n")
        : String(m.content ?? "");
      const tool = m.toolName ?? "?";
      const streak0 = streak;
      if (m.isError) {
        s.refusals.push({ ...classify(tool, text), recovered: false });
        s.maxStreak = Math.max(s.maxStreak, ++streak);
      } else {
        streak = 0;
        if (streak0 > 0) s.refusals[s.refusals.length - 1].recovered = true;
        if (RECORD.test(tool)) {
          ever = true;
          since = 0;
          recordedThisTurn = true;
        }
      }
    }
  }
  endTurn();
  return s;
}

function sessionFiles(
  root: string,
): { file: string; owner: string; run: string }[] {
  const out: { file: string; owner: string; run: string }[] = [];
  for (const run of readdirSync(root)) {
    const sessions = join(root, run, "sessions");
    try {
      statSync(sessions);
    } catch {
      continue;
    }
    for (const story of readdirSync(sessions))
      for (const owner of readdirSync(join(sessions, story)))
        for (const leg of readdirSync(join(sessions, story, owner)))
          for (const f of readdirSync(join(sessions, story, owner, leg)))
            if (f.endsWith(".jsonl"))
              out.push({
                file: join(sessions, story, owner, leg, f),
                owner,
                run,
              });
  }
  return out;
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const root = args.includes("--root")
    ? args[args.indexOf("--root") + 1]
    : join(homedir(), ".splash-harness", "kept-runs");
  const top = Number(
    args.includes("--top") ? args[args.indexOf("--top") + 1] : 25,
  );
  // --since YYYY-MM-DD: only runs started on or after that day (a run's name ends in its start, in ms).
  const since = args.includes("--since") ? Date.parse(args[args.indexOf("--since") + 1]) : 0;
  const scans = sessionFiles(root)
    .filter(({ run }) => Number(run.match(/-(\d{13})$/)?.[1] ?? 0) >= since)
    .map(({ file, owner, run }) => ({
    run,
    ...scanSession(file, owner, readFileSync(file, "utf8")),
  }));
  const runs = new Set(scans.map((s) => s.run));
  const forms = new Map<string, number>();
  const sigs = new Map<
    string,
    { n: number; recovered: number; sessions: Set<string>; form: Form; owners: Set<string> }
  >();
  for (const s of scans)
    for (const r of s.refusals) {
      forms.set(r.form, (forms.get(r.form) ?? 0) + 1);
      const e = sigs.get(r.sig) ?? {
        n: 0,
        recovered: 0,
        sessions: new Set(),
        form: r.form,
        owners: new Set(),
      };
      e.n++;
      if (r.recovered) e.recovered++;
      e.sessions.add(s.file);
      e.owners.add(s.owner);
      sigs.set(r.sig, e);
    }
  const repeated = scans.filter((s) => {
    const c = new Map<string, number>();
    for (const r of s.refusals) c.set(r.sig, (c.get(r.sig) ?? 0) + 1);
    return [...c.values()].some((n) => n >= 3);
  });
  console.log(
    `# Replay scan — ${scans.length} sessions in ${runs.size} kept runs (${root})\n`,
  );
  console.log(
    `- refusals: ${[...forms.values()].reduce((a, b) => a + b, 0)} — ${[...forms].map(([f, n]) => `${f} ${n}`).join(", ")}`,
  );
  console.log(`- sessions repeating one refusal ≥3×: ${repeated.length}`);
  console.log(
    `- sessions whose refusal streak reached ${REFUSAL_STREAK}: ${scans.filter((s) => s.maxStreak >= REFUSAL_STREAK).length}`,
  );
  console.log(
    `- sessions the ${FIRST_RECORD_TURNS}/${NEXT_RECORD_TURNS} watchdog would have stopped: ${scans.filter((s) => s.watchdogAt !== null).length}`,
  );
  console.log(
    `- assistant turns claiming a record no tool made: ${scans.reduce((a, s) => a + s.claimsWithoutRecord, 0)} in ${scans.filter((s) => s.claimsWithoutRecord).length} sessions\n`,
  );
  console.log(
    "| n | recovered | sessions | form | owners | signature |\n|---|---|---|---|---|---|",
  );
  for (const [sig, e] of [...sigs]
    .sort((a, b) => b[1].sessions.size - a[1].sessions.size || b[1].n - a[1].n)
    .slice(0, top))
    console.log(
      `| ${e.n} | ${e.recovered} | ${e.sessions.size} | ${e.form} | ${[...e.owners].join(" ")} | ${sig.replace(/\|/g, "\\|")} |`,
    );
}
