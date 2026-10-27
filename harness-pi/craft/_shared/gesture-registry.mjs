// The gesture vocabulary and what each family and format admits (craft/gestures/GRAMMAR.md §3, §6). Browser-safe:
// the video bundle and the scrolly drive import it, so no Node module and no native code.

/** Each gesture's meaning, as the 12B is shown it. */
export const VOCABULARY = {
  reveal: "marks appear one by one in their natural order (rank or time)",
  filter: "the rows the claim is about keep their ink; the others step back, nothing moves",
  zoom: "the value scale enlarges onto a few rows to show what the overview cannot; the factor is printed",
  reorder: "the same rows move into the order that answers the question",
  rescale: "the value axis travels to a new top, the marks glide with it — never between two shots being compared",
  count: "a figure climbs as the rows it counts appear; the note states where it ends",
  compare: "two rows set side by side: a copy of the second's length laid against the first, the note states the gap or ratio",
  trace: "a line or path draws itself in the order of its data",
  name: "one row is ringed and labelled with its value",
  "pull-back": "the frame returns to the whole chart, with what was shown still marked",
  highlight: "one row takes the accent colour; the others stay neutral",
  bracket: "a bracket spans a run of rows (or one row against the whole) and prints their sum or share",
  reference: "a rule at a stated value, named in its note",
  annotate: "a short note written directly beside one row",
};

/** The gestures each implemented family admits, in every format. */
export const FAMILY_GESTURES = {
  length: ["highlight", "name", "annotate", "bracket", "compare", "reference", "filter", "zoom", "reorder", "rescale", "count", "reveal", "pull-back"],
};

/**
 * Each family's spec, static data only (the family's own hooks travel with its kit, see validateGestures):
 *   gestures  the gestures it admits, in every format
 *   counts    whether its marks count things (histogram bins): their counts add up even when the binned measure is a rate
 *   additive  whether its marks' values add up to a whole (bars, parts, units, stacks) — positions, time series and
 *             rates do not, and a bracket or count over them is refused
 * A family kit adds its entry here (phase 2); FAMILY_GESTURES mirrors the gesture lists for older readers.
 */
export const FAMILIES = {
  length: { gestures: FAMILY_GESTURES.length, additive: true },
};

/** Gestures that act on every drawn row rather than on named ones. */
export const WHOLE_CHART = new Set(["reveal", "reorder", "rescale", "pull-back"]);

/** What can rest together on a web page before any control is used. */
export const WEB_RESTING = new Set(["highlight", "name", "annotate", "reference", "count", "reveal", "pull-back"]);

/** Video: the composed gestures fill these events, in order; establish and reference are the scheduler's. */
export const VIDEO_EVENTS = ["reveal", "subject", "conclusion"];

/** A video's conclusion shows the whole chart (doctrine rule 9): these hide part of it. */
export const HIDES_THE_WHOLE = new Set(["zoom", "filter"]);

export const FORMATS = ["static", "web", "video", "scrolly"];

/** Gestures a format cannot draw: a still plate has no zoom (its printed factor would sit on an un-zoomed plate). */
const NOT_IN = { static: new Set(["zoom"]) };

/** The admissible gestures for a family and format, with their meanings, as a contract or a refusal lists them. */
export function admissible(family, format) {
  const list = FAMILIES[family]?.gestures ?? FAMILY_GESTURES[family];
  if (!list) throw new Error(`no gesture family "${family}" is implemented`);
  if (!FORMATS.includes(format)) throw new Error(`format must be one of ${FORMATS.join(", ")}, not "${format}"`);
  return list.filter((d) => !NOT_IN[format]?.has(d)).map((d) => ({ do: d, meaning: VOCABULARY[d] }));
}
