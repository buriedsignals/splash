// Which MEDIUM × GENRE pairs a chosen slot in STORYBOARD.md can actually be walked all the way to
// a delivered export. A pair only belongs here once BOTH halves of that walk exist: a craft skill
// that renders it (`producerSkill`, a directory under `skills/`) and `deliver`'s own
// `FORMS_BY_GENRE` offering forms for that genre (`delivered`). Declarative facts only — this file
// is read, never dispatched through; it does not decide which producer to invoke (that stays
// `splash`'s job) and it is not a registry other code reaches into at runtime.
//
// WHY THE KEY IS A PAIR. It used to be the genre alone, with three rows, all three naming a CHART
// producer. A `medium: map` + `genre: web` slot therefore passed by naming `chart-web` — the
// wrong producer for that medium — and `map-beat`, `map-web`, `image-beat` and
// `scrolly` were unreachable through the table entirely, while `MATRIX.md` recorded a real
// scrolly beat on disk. Medium was simply not in the table, so the guard could not see a producer
// that was wrong rather than absent.
//
// WHAT IS DELIBERATELY ABSENT. `image/web` and `image/video` have no producer, and an ABSENT ROW is
// the point: `genreGap` refuses the pair at the GENRE GATE, in the journalist's own terms, instead
// of letting them discover it at the last phase. Do not add a row to make a table look complete.
//
// This is a REIMPLEMENTATION of deliver's own knowledge, not an import of it — a skill
// directory has to stay copy-pasteable on its own, so no runtime code here may cross into
// deliver (the same rule `splash/SKILL.md`'s gotcha documents for `where.mjs` and
// `storyboard`'s own `checkStoryboard`: two independent readings of one rule, cross-checked
// by a test, not unified by an import). The concrete defect this table exists to close: a
// journalist asked for a visual "for the web", the storyboard pinned genre `web`, `chart-web`
// already rendered it end to end — and `deliver` threw at the very last phase because
// `FORMS_BY_GENRE` had never heard of `"web"`. Nothing before that moment said so.
//
// `skills/splash/test/genre-shippability.test.ts` is the drift test that keeps this table
// honest: for every pair it asserts the `producerSkill` directory exists on disk, that the skill's
// own `SKILL.md` front matter NAMES ITSELF as that skill and names the medium (the assertion
// without which a wrong-producer row would still pass, since both directories exist), and that
// `delivered: true` matches a real key in deliver's `FORMS_BY_GENRE` — in both directions, so
// a producer added without matching delivery (or the reverse) turns that test red.
export const GENRE_CATALOG = {
  "chart/static": { producerSkill: "chart-beat", delivered: true },
  "chart/web": { producerSkill: "chart-web", delivered: true },
  "chart/video": { producerSkill: "chart-video", delivered: true },
  "chart/scrolly": { producerSkill: "scrolly", delivered: true },
  "map/static": { producerSkill: "map-beat", delivered: true },
  "map/web": { producerSkill: "map-web", delivered: true },
  "map/video": { producerSkill: "map-beat", delivered: true },
  "map/scrolly": { producerSkill: "scrolly", delivered: true },
  "image/static": { producerSkill: "image-beat", delivered: true },
  "image/scrolly": { producerSkill: "scrolly", delivered: true },
};

/** Every genre this toolchain can reach for a given medium — what the genre gate may offer. */
export function genresFor(medium) {
  return Object.keys(GENRE_CATALOG)
    .filter((pair) => pair.startsWith(`${medium}/`))
    .map((pair) => pair.slice(medium.length + 1));
}

/**
 * `null` when this MEDIUM in this GENRE can be walked all the way to a delivered export; otherwise
 * a one-line reason naming BOTH, meant to be surfaced verbatim at the genre gate — never three
 * phases later. Run once, at G2b, by the phase that owns it; its verdict is recorded on the slot as
 * `reachable:`, and both Gate-2 readings then check the record rather than re-running this.
 */
export function genreGap(medium, genre) {
  if (!medium) return "medium is missing — its production path cannot be checked";
  if (!genre) return "genre is missing — its delivery path cannot be checked";
  const row = GENRE_CATALOG[`${medium}/${genre}`];
  if (!row) {
    const reachable = genresFor(medium);
    return reachable.length > 0
      ? `${medium} beats in the ${genre} genre are not one this toolchain can produce or deliver yet — for ${medium} it can reach ${reachable.join(", ")}`
      : `${JSON.stringify(medium)} is not a medium this toolchain produces at all`;
  }
  if (!row.delivered) {
    return `${medium} beats in the ${genre} genre have a producer (${row.producerSkill}) but no delivery path yet`;
  }
  return null;
}
