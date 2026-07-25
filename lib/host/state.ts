import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { nextActions, parseManifest, type RunManifest } from "../loop/manifest";
import { resumeReport } from "../loop/resume";
import type { HostErrorCode } from "./errors";

// The one response shape every host command answers with, so a host parses one thing.
// Mirrors the verb contract's VerbResult on purpose: same discipline, same reasoning —
// a host outside JavaScript has no `catch`, so a failure has to be a value. The code is
// drawn from lib/host/errors.ts's single declared list, which is also what the capability
// declaration publishes.
export type HostResponse =
  | { ok: true; value: unknown }
  | { ok: false; code: HostErrorCode; message: string };

// `state` and `next` are READ-ONLY, and that is a promise in lib/host/README.md: the façade
// only ever writes inside the paths a `verb` request names.
//
// This function therefore does NOT go through readManifest(). readManifest silently migrates
// a pre-v2 manifest, and lib/loop/migrate.ts's migration WRITES: freezeInput creates
// `input/` and a content-addressed data file inside the run directory. A single
// `state --run` on a v1 run left a `input/data-<hash>.csv` behind — and the migration is not
// even persisted to run.json, so every subsequent read redid it.
//
// A non-writing migration is not available from here: the v1 shape stores its CSV INLINE,
// and v2 references input by path+hash. Producing a v2 manifest without writing that file
// would mean handing the host a report whose `inputValidation` describes a file that does not
// exist — a lie about the run rather than a read of it. So the honest answer is a typed
// refusal that tells the host to run the migration explicitly, as a write it chose.
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
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (e) {
    return {
      fail: {
        ok: false,
        code: "invalid-run",
        message: `cannot read a valid manifest at ${manifestPath}: ${(e as Error).message}`,
      },
    };
  }
  const declared =
    raw && typeof raw === "object"
      ? (raw as { schemaVersion?: unknown }).schemaVersion
      : undefined;
  if (declared !== 2)
    return {
      fail: {
        ok: false,
        code: "stale-schema",
        message:
          `${manifestPath} declares schemaVersion ${JSON.stringify(declared ?? null)}, ` +
          `not 2 — state and next are read-only and will not migrate it, because ` +
          `migrating writes a frozen input file into the run directory. Run the migration ` +
          `explicitly, then read the run again`,
      },
    };
  try {
    return { run: parseManifest(raw) };
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
