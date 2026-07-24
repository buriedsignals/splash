import { existsSync } from "node:fs";
import { join } from "node:path";
import { nextActions, readManifest, type RunManifest } from "../loop/manifest";
import { resumeReport } from "../loop/resume";

// The one response shape every host command answers with, so a host parses one thing.
// Mirrors the verb contract's VerbResult on purpose: same discipline, same reasoning —
// a host outside JavaScript has no `catch`, so a failure has to be a value.
export type HostResponse =
  { ok: true; value: unknown } | { ok: false; code: string; message: string };

function loadRun(
  runDir: string,
): { run: RunManifest } | { fail: HostResponse } {
  const manifestPath = join(runDir, "run.json");
  if (!existsSync(manifestPath))
    return {
      fail: {
        ok: false,
        code: "no-run",
        message: `no run.json in ${runDir} — this directory holds no run`,
      },
    };
  try {
    return { run: readManifest(manifestPath, runDir) };
  } catch (e) {
    return {
      fail: {
        ok: false,
        code: "invalid-run",
        message: `cannot read a valid manifest at ${manifestPath}: ${(e as Error).message}`,
      },
    };
  }
}

// The run's current truth: validated hashes, derived gate state, exact next actions.
// resumeReport (sub-project A) does all the work — this only makes its failure modes into
// values and its output into a host response.
export function describeState(runDir: string): HostResponse {
  const loaded = loadRun(runDir);
  if ("fail" in loaded) return loaded.fail;
  try {
    return { ok: true, value: resumeReport(loaded.run, runDir) };
  } catch (e) {
    return {
      ok: false,
      code: "invalid-run",
      message: (e as Error)?.message ?? String(e),
    };
  }
}

// What is valid to do next, run-level. Deliberately narrower than describeState: a host
// polling for "can I act yet" should not have to parse a whole report.
export function describeNext(runDir: string): HostResponse {
  const loaded = loadRun(runDir);
  if ("fail" in loaded) return loaded.fail;
  try {
    return { ok: true, value: { nextActions: nextActions(loaded.run) } };
  } catch (e) {
    return {
      ok: false,
      code: "invalid-run",
      message: (e as Error)?.message ?? String(e),
    };
  }
}
