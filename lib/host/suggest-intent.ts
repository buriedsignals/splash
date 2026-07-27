// suggest-intent.ts — the question that gets the intent DECLARED, and the suggestion that helps
// answer it without ever answering for the journalist.
//
// P1 of the socle: the tool OFFERS and the journalist DECIDES. That is exactly the shape here —
// the nine answers phrased editorially (lib/host/intent-copy.ts) plus what the keyword pass
// (lib/brain/rank-intent.ts) believes it read in the draft takeaway, labelled as a suggestion.
//
// Why this is a command of its own rather than a field of `state`: the suggestion is computed
// FROM the draft takeaway, and at the moment the question is asked the takeaway is not in the run
// yet — the journalist answers both in the same `confirm-angle`. `state` therefore carries the
// choices (a host driving from `state` must be able to render the question) and this carries the
// choices plus the reading.
import { suggestIntents } from "../brain/rank-intent";
import type { Intent } from "../brain/intents";
import { tryLoadDecor } from "../newsroom/decor";
import {
  intentCopy,
  intentCopyLanguage,
  type IntentChoice,
} from "./intent-copy";
import type { HostResponse } from "./state";

export type IntentQuestion = {
  /** The language this was actually answered in — not the one asked for, when we do not ship it. */
  language: string;
  question: string;
  choices: IntentChoice[];
  /** What the wording READS LIKE. Frequently empty, and empty is a real answer. */
  suggested: Intent[];
  /** The suggestion put into words, or the sentence that says there is none. */
  note: string;
};

/** Pure: the copy for a language, joined to a reading of one draft takeaway. */
export function suggestIntentFor(
  takeaway: string,
  language: string,
): IntentQuestion {
  const resolved = intentCopyLanguage(language);
  const copy = intentCopy(resolved);
  const suggested = suggestIntents(takeaway);
  // Phrased with the LABEL of the first reading, never with the machine id: a journalist is
  // never shown "change-over-time". More than one cue can fire, and the note names the leading
  // one rather than reciting a list — the full set is still in `suggested` for a host that wants
  // to mark several choices.
  const first = suggested[0];
  const label = first
    ? copy.choices.find((c) => c.id === first)!.label
    : undefined;
  return {
    language: resolved,
    question: copy.question,
    choices: copy.choices,
    suggested,
    note: label ? copy.suggestionNote(label) : copy.noSuggestion,
  };
}

/**
 * The façade command. Read-only, and it needs no run: the question comes BEFORE the angle
 * exists, so requiring `--run` would make it unaskable at the only moment it is useful.
 *
 * The language comes from the newsroom's decor by default — the same `language.ui` every other
 * journalist-facing string resolves through — and an explicit one overrides it for this call
 * alone, exactly as `resolveLanguage` already models an override.
 */
export function describeIntentQuestion(
  takeaway: string,
  language?: string,
): HostResponse {
  if (takeaway.trim() === "")
    return {
      ok: false,
      code: "usage",
      message:
        "suggest-intent needs --takeaway <s> — the claim the journalist is making, which is what " +
        "the suggestion is read from (the choices themselves do not depend on it)",
    };
  // A decor problem must not make the question unaskable: the choices are a constant, and the
  // only thing the decor decides is which language they are shown in.
  let uiLanguage = "";
  try {
    uiLanguage = tryLoadDecor().language.ui;
  } catch {
    uiLanguage = "";
  }
  return {
    ok: true,
    value: suggestIntentFor(takeaway, language ?? uiLanguage),
  };
}
