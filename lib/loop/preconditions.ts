// ① THE FACTS ON DISK, TURNED INTO HARD PRECONDITIONS.
//
// Two of the rules the 2026-07-28 sweep found violated are checkable with no judge, no model and
// no text heuristic. They are an existsSync and a filter over a directory listing:
//
//   candidates.json absent          ⇒ the suggester never ran ⇒ production does not start.
//   config.json / native-source.json among the files handed over
//                                   ⇒ that is the build folder, not an export ⇒ not delivered.
//
// The second is a MEASUREMENT, not an intuition: the 16 proven non-deliveries of the sweep are
// all inside the 36 cases that handed that folder back, and none outside it. A three-line check
// replaces a judge's opinion there.
//
// PURE, and in the loop rather than in the skill, because both readers call the SAME function —
// the host façade (what the prose chain invokes) and the prose chain's own scripts. A rule
// enforced in one place and forgotten in the other is how the sweep's D01 happened in the first
// place. Nothing here spawns, reads an engine, or needs a manifest.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { routed, type RoutedRefusal } from "../core/routed-refusal";
import type { VisualFormat } from "../core/vocabulary";

/** The ranked menu the suggester persists beside the accepted proposal. Named here rather than
 *  spelled at each call site: three readers ask about this file. */
export const CANDIDATES_FILE = "candidates.json";

/**
 * MAY PRODUCTION START IN THIS DIRECTORY — or is there no menu anything could have been
 * chosen from?
 *
 * Honest about what it proves: the file is written by hand in the prose chain (nothing in the
 * repo generates it — two-chains-gap-2026-07-28.md §1.1), so its presence is cheap to fabricate.
 * What it stops is the ordinary case the sweep measured: a run that never made a menu at all and
 * produced anyway. Spec §6 states the same limit for the other two mechanisms — it makes the lie
 * expensive, not impossible.
 */
export function productionPrecondition(runDir: string): RoutedRefusal | null {
  if (existsSync(join(runDir, CANDIDATES_FILE))) return null;
  return routed(
    "no-candidates-menu",
    `no ranked list of visuals was ever written down for this story (${join(runDir, CANDIDATES_FILE)} does not exist), so nothing produced here was chosen from one` +
      ` — if the journalist NAMED this visual, mark the proposal direct (skillsInvoked: ["splash:cadrage-direct"]) and it needs no menu`,
  );
}

/** The delivery FORM axis — orthogonal to VisualFormat. Structurally identical to
 *  skills/splash/src/export-guard.ts's DeliveryForm, which becomes an alias of this one: the lib
 *  half is the definition, because it is the half both sides may import. */
export type HandoverForm =
  | "html"
  | "code-source"
  | "embed"
  | "cms"
  // A VIDEO's own first form: the mp4 itself. It used to be the only thing a video could be, so
  // it needed no name — video was handed over with `form: null`. It has siblings now (a hosted
  // link, an insertion into the article), so the file is one choice among three and says so.
  | "file"
  | null;

// The files a PRODUCTION directory carries and an export never does. Not a guess: the first
// three (config.json, and either native-source.json for chart-native or source-manifest.json for
// map-native/scrolly) are exactly what export-code.mjs:296-302/409-416 looks for to decide a
// build folder can yield a source bundle, and the last three are the spine's own bookkeeping.
export const PRODUCTION_MARKERS = [
  "config.json",
  "native-source.json",
  "source-manifest.json",
  "report.json",
  "accepted.json",
  "candidates.json",
] as const;

/**
 * IS THIS FOLDER AN EXPORT, or the directory the build worked in?
 *
 * THE ONE EXEMPTION, and it is measured rather than assumed: a runnable source bundle carries
 * config.json AT ITS ROOT by design — skills/splash/scripts/bundle-source.mjs:357 writes it
 * there, and the README it generates (:269) tells the newsroom to edit that very file and run
 * the build again. Refusing it would fail the one delivery form whose whole point is that the
 * newsroom owns the source, and a false block kills a real journalist's run.
 */
export function exportPrecondition(
  files: string[],
  opts: { format: VisualFormat; form: HandoverForm },
): RoutedRefusal | null {
  if (opts.form === "code-source") return null;
  const planted = files.filter((f) =>
    (PRODUCTION_MARKERS as readonly string[]).includes(f),
  );
  if (planted.length === 0) return null;
  return routed(
    "production-folder-handed-over",
    `the folder being handed over still holds ${planted.join(", ")} — those are files the build leaves behind, so this is the working directory and not the finished ${opts.format} the newsroom was promised`,
  );
}
