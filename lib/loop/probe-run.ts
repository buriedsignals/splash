// ③ THE PROBES DECIDE. Their result is READ by the gate — never reported to it.
//
// The 2026-07-28 sweep found ten runs where the review gate graded itself, and two of them
// recorded a `pass` on a test that had crashed or had never run at all. That is possible for
// exactly one reason: the outcome was a field the reviewing step filled in. Here it is an exit
// code the gate observed. One cannot declare green a check one did not launch when the gate
// launches it.
//
// SHELL-SAFETY, and it is not decorative: a probe arrives from model output. A probe is an ARGV
// ARRAY, spawned as-is — never a string handed to a shell, never interpolated into a `-c`. A
// command that is not a non-empty array of non-empty strings is refused by shape, before
// anything is executed.
//
// NEVER THROWS. A probe that cannot even be spawned is a concern with the reason as its evidence,
// because "the check could not run" and "the check passed" must never be the same value.

/** How long one probe may take. A hung probe must not hang a review: the timeout is a concern
 *  with its own sentence, which is a true statement about the artifact under review. */
export const PROBE_TIMEOUT_MS = 120_000;

export type ProbeSpec = {
  /** What is being probed, in the reviewer's words. Travels into the record verbatim. */
  check: string;
  /** The command that answers it, as argv. */
  command: string[];
};

export type ProbeResult = {
  check: string;
  command: string[];
  outcome: "pass" | "concern";
  /** `null` when nothing ran (a malformed command, a binary that does not exist). */
  exitCode: number | null;
  /** The evidence: the probe's own tail output, or why it could not run. */
  note: string;
};

const TAIL_CHARS = 800;

function tail(text: string): string {
  const t = text.trim();
  return t.length <= TAIL_CHARS ? t : `…${t.slice(-TAIL_CHARS)}`;
}

function malformed(spec: ProbeSpec): string | null {
  if (!Array.isArray(spec.command) || spec.command.length === 0)
    return 'a probe\'s command must be a non-empty argv array (e.g. ["bun", "scripts/snap.mjs"]) — a probe with no command is a claim, and a claim is what this gate stopped accepting';
  if (spec.command.some((a) => typeof a !== "string" || a.length === 0))
    return "every element of a probe's argv must be a non-empty string";
  return null;
}

/**
 * RUN EVERY PROBE, AND REPORT WHAT EACH ONE ANSWERED.
 *
 * Every probe runs, always: cutting the ledger short at the first failure would make the record
 * describe how far the review got rather than what the artifact is like.
 */
export function runProbes(
  specs: ProbeSpec[],
  opts: { cwd: string; timeoutMs?: number },
): ProbeResult[] {
  return specs.map((spec) => {
    const shapeError = malformed(spec);
    if (shapeError)
      return {
        check: spec.check,
        command: Array.isArray(spec.command) ? spec.command : [],
        outcome: "concern",
        exitCode: null,
        note: shapeError,
      };
    try {
      const run = Bun.spawnSync(spec.command, {
        cwd: opts.cwd,
        stdout: "pipe",
        stderr: "pipe",
        timeout: opts.timeoutMs ?? PROBE_TIMEOUT_MS,
      });
      const output = tail(
        `${run.stdout?.toString() ?? ""}\n${run.stderr?.toString() ?? ""}`,
      );
      if (run.exitCode === 0)
        return {
          check: spec.check,
          command: spec.command,
          outcome: "pass",
          exitCode: 0,
          note: output,
        };
      return {
        check: spec.check,
        command: spec.command,
        outcome: "concern",
        exitCode: run.exitCode,
        note: `the check exited ${run.exitCode}: ${output}`,
      };
    } catch (e) {
      return {
        check: spec.check,
        command: spec.command,
        outcome: "concern",
        exitCode: null,
        note: `the check could not be run: ${(e as Error)?.message ?? String(e)}`,
      };
    }
  });
}
