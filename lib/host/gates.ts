// The half of the façade that serves the three GUARANTEES (2026-07-28, "des refus qui mordent").
//
// Everything the prose chain does with its own hands rather than through a script goes past here:
// naming a folder to a journalist, showing him a file, deciding whether a check passed. The rules
// themselves live in lib/loop; this file only translates them into the façade's envelope
// (`ok` first, then `value` or `code`+`message`) and its exit codes.
//
// A refused precondition is `step-refused` — the code cli.ts already maps to exit 1 — because
// that is exactly what it is: a well-formed request the loop declined. An unreadable directory is
// `usage` (exit 2), the same split every other acting command draws.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { refusalSentence } from "../core/routed-refusal";
import { VISUAL_FORMATS, isVisualFormat } from "../core/vocabulary";
import {
  exportPrecondition,
  productionPrecondition,
  type HandoverForm,
} from "../loop/preconditions";
import { presentArtifact } from "../loop/presentation";
import { runProbes, type ProbeSpec } from "../loop/probe-run";
import { isDirectBranch } from "../../skills/splash/src/candidate-provenance";
import type { AcceptedProposal } from "../../skills/splash/src/producer-spec";
import type { HostResponse } from "./state";

const HANDOVER_FORMS: readonly string[] = ["html", "code-source", "embed"];

export type PrecheckArgs = {
  stage: "production" | "export";
  dir: string;
  format?: string;
  // `null` is a caller EXPLICITLY saying "no form" — the same reading exportPrecondition's own
  // HandoverForm gives it — rather than a value the caller merely forgot to pass. cli.ts never
  // supplies it (a flag is either given as a string or omitted), but a direct caller of this
  // function may.
  form?: string | null;
};

/**
 * THE SAME DIRECT-BRANCH EXEMPTION `produce-all.mjs` already applies (`accepted.some((p) =>
 * !isDirectBranch(p))`, `skills/splash/scripts/produce-all.mjs`) — read here from the same
 * `accepted.json` beside `dir`, because a proposal the journalist NAMED needs no menu, and this
 * façade must agree with the caller that actually matters or a legitimate direct-branch run
 * refuses here and only here. An unreadable/malformed/absent `accepted.json`, or an empty list,
 * is NOT exempt-by-omission (mirrors `.some()` on an empty array being vacuously false only when
 * there IS an array to read) — anything that cannot be read as "every proposal is direct" falls
 * through to the ordinary menu check below.
 */
function isExemptDirectRun(dir: string): boolean {
  const acceptedPath = join(dir, "accepted.json");
  if (!existsSync(acceptedPath)) return false;
  try {
    const accepted = JSON.parse(readFileSync(acceptedPath, "utf8"));
    return (
      Array.isArray(accepted) &&
      !(accepted as AcceptedProposal[]).some((p) => !isDirectBranch(p))
    );
  } catch {
    return false;
  }
}

/**
 * IS THIS DIRECTORY ALLOWED TO BE WHAT THE CALLER IS ABOUT TO CALL IT?
 *
 * `production` — may production start here (is there a ranked menu at all)?
 * `export`     — is this an export, or the folder the build worked in?
 *
 * Both answers are facts on disk. Neither reads a manifest, so a prose run with no run.json can
 * ask them — which is the whole point: the chain that actually runs is the prose one.
 */
export function describePrecheck(args: PrecheckArgs): HostResponse {
  if (args.stage === "production") {
    if (isExemptDirectRun(args.dir))
      return {
        ok: true,
        value: { stage: "production", dir: args.dir, passed: true },
      };
    const refusal = productionPrecondition(args.dir);
    return refusal
      ? { ok: false, code: "step-refused", message: refusalSentence(refusal) }
      : {
          ok: true,
          value: { stage: "production", dir: args.dir, passed: true },
        };
  }

  if (!args.format || !isVisualFormat(args.format))
    return {
      ok: false,
      code: "usage",
      message:
        `precheck --stage export needs --format <${VISUAL_FORMATS.join("|")}> — ` +
        `what the folder is supposed to BE decides which shape it has to have`,
    };
  if (
    args.form !== undefined &&
    args.form !== null &&
    !HANDOVER_FORMS.includes(args.form)
  )
    return {
      ok: false,
      code: "usage",
      message: `precheck --form takes ${HANDOVER_FORMS.join(", ")} (omit it for a static or video hand-over)`,
    };

  let files: string[];
  try {
    files = readdirSync(args.dir);
  } catch (e) {
    return {
      ok: false,
      code: "usage",
      message: `precheck: ${args.dir} cannot be read: ${(e as Error)?.message ?? String(e)}`,
    };
  }

  const form = (args.form ?? null) as HandoverForm;
  const refusal = exportPrecondition(files, { format: args.format, form });
  return refusal
    ? { ok: false, code: "step-refused", message: refusalSentence(refusal) }
    : {
        ok: true,
        value: {
          stage: "export",
          dir: args.dir,
          format: args.format,
          form,
          passed: true,
        },
      };
}

/**
 * SHOW THE ARTIFACT — the act, performed, with what it did reported back.
 *
 * The `env` parameter is threaded rather than read here so a test can suppress the viewer
 * honestly (SPLASH_NO_VIEWER makes `present` record a printed path and WHY), and so this file
 * stays the same shape as the rest of the façade: values in, values out.
 */
export function presentIn(
  path: string,
  env: Record<string, string | undefined> = process.env,
): HostResponse {
  const shown = presentArtifact(path, env);
  return shown.ok
    ? { ok: true, value: shown.value }
    : { ok: false, code: shown.code, message: shown.message };
}

/**
 * RUN THE MECHANICAL CHECKS AND REPORT WHAT THEY ANSWERED.
 *
 * The façade's contribution is the shape gate: a caller that hands over anything other than a
 * list of {check, command:[…]} is refused here rather than having its prose executed.
 */
export function describeProbeRun(specs: unknown, cwd: string): HostResponse {
  if (
    !Array.isArray(specs) ||
    specs.some(
      (s) =>
        s == null ||
        typeof s !== "object" ||
        typeof (s as { check?: unknown }).check !== "string" ||
        !Array.isArray((s as { command?: unknown }).command),
    )
  )
    return {
      ok: false,
      code: "usage",
      message:
        'probe reads a LIST on stdin: [{"check": "<what is probed>", "command": ["bun", "<script>", "<arg>"]}] — ' +
        "the command is argv, never a shell line",
    };
  return { ok: true, value: runProbes(specs as ProbeSpec[], { cwd }) };
}
