import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  nextActions,
  parseManifest,
  CURRENT_SCHEMA_VERSION,
  type RunManifest,
} from "../loop/manifest";
import { migrateWriteFree } from "../loop/migrate";
import { orderingIntents } from "../loop/propose";
import { resumeReport } from "../loop/resume";
import { installRoot, loadDecor } from "../newsroom/decor";
import { intentCopy, intentCopyLanguage } from "./intent-copy";
import type { VerbErrorCode } from "../core/verbs/types";
import type { HostErrorCode } from "./errors";

// The one response shape every host command answers with, so a host parses one thing.
// Mirrors the verb contract's VerbResult on purpose: same discipline, same reasoning —
// a host outside JavaScript has no `catch`, so a failure has to be a value.
//
// The code comes from EITHER declared list, and both are published by the capability
// declaration (`errorCodes.verb` / `errorCodes.host`) precisely because a host meets two
// families. The read-only commands only ever answer a host code; the acting commands
// (lib/host/drive.ts) pass a loop refusal through with the code the loop gave it —
// `invalid-request` for a form that is not in the offer — rather than relabelling it as a
// façade error, which would lose which layer answered. Neither list is retyped here.
export type HostResponse =
  | { ok: true; value: unknown }
  | { ok: false; code: HostErrorCode | VerbErrorCode; message: string };

// `state` and `next` are READ-ONLY, and that is a promise in lib/host/README.md: the façade
// only ever writes inside the paths a `verb` request names.
//
// This function therefore does NOT go through readManifest(). readManifest silently migrates
// a stale manifest through lib/loop/migrate.ts's `migrate`, and one leg of that chain WRITES:
// migrateV1toV2's freezeInput creates `input/` and a content-addressed data file inside the run
// directory. A single `state --run` on a v1 run left a `input/data-<hash>.csv` behind — and the
// migration is not even persisted to run.json, so every subsequent read redid it.
//
// Every OTHER leg — v2→v3, v3→v4, v4→v5 — is a pure object transform with no filesystem access
// at all (migrateWriteFree, lib/loop/migrate.ts). That is what lets a manifest declaring one of
// those versions be migrated IN MEMORY here and returned as the current shape: nothing is
// persisted, so a repeated read produces the same migration again, and the file on disk is
// exactly what it was before this call — the promise above, kept. Only a v1 manifest (whose sole
// path to v2 writes) still gets the typed refusal, and so does a manifest declaring a version
// NEWER than this build knows, which genuinely cannot be handled here at all.
//
// Exported because the commands that DO write (lib/host/drive.ts) must load a run by exactly the
// same rule — including the write-free in-memory migration and the refusal it falls back to. A
// writing command has a weaker excuse for refusing to migrate, and it still only migrates what is
// write-free: a host asked for one loop step, not for a migration that freezes an input file into
// its run. One loader, one migration rule, no second opinion about what a readable run is.
export function loadRun(
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
  // Read from lib/loop/manifest.ts's CURRENT_SCHEMA_VERSION, never restated — a hand-copied
  // literal here is exactly what let this gate drift silently behind RunManifestSchema's own
  // version for as long as it did (found via a live CLI subprocess, not tsc: this is a runtime
  // literal, invisible to the type checker). If you are bumping CURRENT_SCHEMA_VERSION, this
  // gate follows automatically — nothing to edit here.
  if (declared !== CURRENT_SCHEMA_VERSION) {
    // migrateWriteFree can throw (e.g. Zod rejecting a migrated shape that turns out to be a
    // corrupt or incomplete manifest, not just a stale one) — caught here for the same reason
    // the CURRENT-version parse below is: a host has no `catch`, so this loader never throws.
    try {
      const migrated = migrateWriteFree(raw);
      if (migrated) return { run: migrated };
    } catch (e) {
      return {
        fail: {
          ok: false,
          code: "invalid-run",
          message: `cannot read a valid manifest at ${manifestPath}: ${(e as Error).message}`,
        },
      };
    }
    const newer =
      typeof declared === "number" && declared > CURRENT_SCHEMA_VERSION;
    return {
      fail: {
        ok: false,
        code: "stale-schema",
        message: newer
          ? `${manifestPath} declares schemaVersion ${declared}, newer than ` +
            `${CURRENT_SCHEMA_VERSION} — this build of Splash cannot read a run written by a ` +
            `newer version; upgrade Splash before reading this run`
          : `${manifestPath} declares schemaVersion ${JSON.stringify(declared ?? null)}, ` +
            `not ${CURRENT_SCHEMA_VERSION} — state and next are read-only and will not migrate ` +
            `it, because its migration to schemaVersion 2 writes a frozen input file into the ` +
            `run directory (lib/loop/migrate.ts's migrateV1toV2). That write has to happen ` +
            `before state or next can read this run`,
      },
    };
  }
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

/**
 * The newsroom's interface language, resolved WITHOUT the write.
 *
 * `loadDecor()` called with no directory may WRITE — it persists the one-time legacy decor
 * migration into the install root — and `tryLoadDecor()` takes exactly that path. `state` and
 * `next` promise the opposite (lib/host/README.md), which is why they refuse to migrate a stale
 * manifest rather than migrating it quietly; resolving a language must not smuggle a write back
 * in through a different door. Naming the root explicitly is the read-only shape decor.ts
 * documents: "with an explicit dir the decor is read and derived but NOTHING is written".
 *
 * A decor that cannot be read yields "" rather than a throw: the choices are a constant and only
 * their language is at stake, and `state` is the command a host reaches for when things are
 * already wrong. Shared with `suggest-intent`, the other read-only command that needs it, so the
 * two cannot end up resolving the language by different rules.
 */
export function readOnlyUiLanguage(load: typeof loadDecor = loadDecor): string {
  try {
    return load(installRoot()).language.ui;
  } catch {
    return "";
  }
}

// WHAT ORDERED THIS ELEMENT'S OFFER, per element that has an angle.
//
// The offer is ranked around one semantic input, and until this slice that input was GUESSED
// from the takeaway's prose by a keyword pass which, measured on real editorial phrasings,
// answered nothing at all most of the time and mis-read others. Either way the run said nothing,
// so "ordered around the journalist's point" and "ordered by fit and readiness alone" looked
// identical from outside. That silence was the defect — not the crudeness of the regexes.
//
// Now the intent is DECLARED (lib/loop/angle.ts refuses an angle without one), so `declared` is
// the only basis a run opened after this slice can have. `guessed` and `none` can only come from
// an angle recorded before the field existed — which is not refused (that would strand legitimate
// runs) but is never silent either.
//
// One pure call to the same function `propose` ranks with, so this cannot promise an ordering the
// brain did not use — the discipline resume.ts's `verification` already follows for the gate.
function intentBasisOf(
  el: RunManifest["elements"][number],
): { basis: string; declared?: string; guessed?: string[] } | undefined {
  if (!el.angle) return undefined;
  const { intents, basis } = orderingIntents(el);
  return basis === "declared"
    ? { basis, declared: intents[0]! }
    : { basis, guessed: intents };
}

// The run's current truth: validated hashes, derived gate state, exact next actions.
// resumeReport (sub-project A) does all the work — this only makes its failure modes into
// values and its output into a host response, plus the two things resume.ts cannot answer: the
// intent question (localised copy; resume.ts is deliberately language-free) and where each
// element's ordering came from.
export function describeState(runDir: string): HostResponse {
  const loaded = loadRun(runDir);
  if ("fail" in loaded) return loaded.fail;
  try {
    const report = resumeReport(loaded.run, runDir);
    const byId = new Map(loaded.run.elements.map((el) => [el.id, el]));
    const elements = report.elements.map((e) => {
      const intent = intentBasisOf(byId.get(e.id)!);
      return { ...e, ...(intent ? { intent } : {}) };
    });
    // THE QUESTION, present exactly while it is still owed — the same presence rule the offer
    // follows. A host told `nextActions: ["confirm-angle"]` must be able to put the question
    // without knowing a second command exists, and must never have to invent the wording: the
    // socle forbids asking a journalist "is your intent part-to-whole?", so the choices arrive
    // phrased for a newsroom, in the language the decor resolved.
    //
    // What it deliberately does NOT carry is a suggestion: that is read from the DRAFT takeaway,
    // which does not exist in the run yet — `suggest-intent` is where a host gets one.
    const owed = elements.some((e) => e.nextActions.includes("confirm-angle"));
    if (!owed) return { ok: true, value: { ...report, elements } };
    const language = intentCopyLanguage(readOnlyUiLanguage());
    const copy = intentCopy(language);
    return {
      ok: true,
      value: {
        ...report,
        elements,
        intentChoices: {
          language,
          question: copy.question,
          choices: copy.choices,
        },
      },
    };
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
