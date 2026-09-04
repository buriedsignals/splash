// Which MEDIUM × FORMAT pairs a chosen slot in STORYBOARD.md can actually be walked all the way to
// a delivered export. A pair only belongs here once BOTH halves of that walk exist: a craft skill
// that renders it (`producerSkill`, a directory under `skills/`) and `deliver`'s own
// `FORMS_BY_FORMAT` offering forms for that format (`delivered`). Declarative facts only — this file
// is read, never dispatched through; it does not decide which producer to invoke (that stays
// `splash`'s job) and it is not a registry other code reaches into at runtime.
//
// WHY THE KEY IS A PAIR. It used to be the format alone, with three rows, all three naming a CHART
// producer. A `medium: map` + `format: web` slot therefore passed by naming `chart-web` — the
// wrong producer for that medium — and `map-beat`, `map-web`, `image-beat` and
// `scrolly` were unreachable through the table entirely, while `MATRIX.md` recorded a real
// scrolly beat on disk. Medium was simply not in the table, so the guard could not see a producer
// that was wrong rather than absent.
//
// WHAT IS DELIBERATELY ABSENT. `image/web` and `image/video` have no producer, and an ABSENT ROW is
// the point: `formatGap` refuses the pair at the FORMAT GATE, in the journalist's own terms, instead
// of letting them discover it at the last phase. Do not add a row to make a table look complete.
//
// This is generated into Storyboard from the repository's canonical visual catalogue. Runtime
// code still reads only its own local reference — never another skill or the repository root — so
// the skill remains copy-pasteable. The generator parity-checks producers and delivery forms
// against the implementation before it emits this copy. The concrete defect this table exists to
// close remains: a
// journalist asked for a visual "for the web", the storyboard pinned format `web`, `chart-web`
// already rendered it end to end — and `deliver` threw at the very last phase because
// `FORMS_BY_FORMAT` had never heard of `"web"`. Nothing before that moment said so.
//
// `skills/splash/test/format-shippability.test.ts` independently checks the generated rows against
// producer front matter and `deliver` in both directions.
import visualCatalog from "../references/visual-catalog.json" with { type: "json" };

export const FORMAT_CATALOG = Object.fromEntries(
  visualCatalog.formatPairs.map((row) => [
    row.pair,
    { producerSkill: row.producerSkill, delivered: row.delivered, sizeRule: row.sizeRule },
  ]),
);

/** Every format this toolchain can reach for a given medium — what the format gate may offer. */
export function formatsFor(medium) {
  return Object.keys(FORMAT_CATALOG)
    .filter((pair) => pair.startsWith(`${medium}/`))
    .map((pair) => pair.slice(medium.length + 1));
}

/**
 * `null` when this MEDIUM in this FORMAT can be walked all the way to a delivered export; otherwise
 * a one-line reason naming BOTH, meant to be surfaced verbatim at the format gate — never three
 * phases later. Run once, at G2b, by the phase that owns it; its verdict is recorded on the slot as
 * `reachable:`, and both Gate-2 readings then check the record rather than re-running this.
 */
export function formatGap(medium, format) {
  if (!medium) return "medium is missing — its production path cannot be checked";
  if (!format) return "format is missing — its delivery path cannot be checked";
  const row = FORMAT_CATALOG[`${medium}/${format}`];
  if (!row) {
    const reachable = formatsFor(medium);
    return reachable.length > 0
      ? `${medium} beats in the ${format} format are not one this toolchain can produce or deliver yet — for ${medium} it can reach ${reachable.join(", ")}`
      : `${JSON.stringify(medium)} is not a medium this toolchain produces at all`;
  }
  if (!row.delivered) {
    return `${medium} beats in the ${format} format have a producer (${row.producerSkill}) but no delivery path yet`;
  }
  return null;
}
