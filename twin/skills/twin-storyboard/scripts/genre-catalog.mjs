// The genres a chosen slot in STORYBOARD.md can actually be walked all the way to a delivered
// export. A genre only belongs here once BOTH halves of that walk exist: a craft skill that
// renders it (`producerSkill`, a directory under `skills/`) and `twin-deliver`'s own
// `FORMS_BY_GENRE` offering forms for it (`delivered`). Declarative facts only — this file is
// read, never dispatched through; it does not decide which producer to invoke (that stays
// `splash-twin`'s job) and it is not a registry other code reaches into at runtime.
//
// This is a REIMPLEMENTATION of twin-deliver's own knowledge, not an import of it — a skill
// directory has to stay copy-pasteable on its own, so no runtime code here may cross into
// twin-deliver (the same rule `splash-twin/SKILL.md`'s gotcha documents for `where.mjs` and
// `twin-storyboard`'s own `checkStoryboard`: two independent readings of one rule, cross-checked
// by a test, not unified by an import). The concrete defect this table exists to close: a
// journalist asked for a visual "for the web", the storyboard pinned genre `web`, `twin-chart-web`
// already rendered it end to end — and `twin-deliver` threw at the very last phase because
// `FORMS_BY_GENRE` had never heard of `"web"`. Nothing before that moment said so.
//
// `skills/splash-twin/test/genre-shippability.test.ts` is the drift test that keeps this table
// honest: it asserts every `producerSkill` named below exists on disk, and that `delivered: true`
// here matches a real key in twin-deliver's `FORMS_BY_GENRE` — in both directions, so a producer
// added without matching delivery (or the reverse) turns that test red, naming the mismatch.
export const GENRE_CATALOG = {
  static: { producerSkill: "twin-chart-beat", delivered: true },
  web: { producerSkill: "twin-chart-web", delivered: true },
  video: { producerSkill: "twin-chart-video", delivered: true },
};

/**
 * `null` when `genre` can be walked all the way to a delivered export; otherwise a one-line
 * reason naming the genre and what is missing, meant to be surfaced verbatim as a gate error.
 */
export function genreGap(genre) {
  if (!genre) return "genre is missing — its delivery path cannot be checked";
  const row = GENRE_CATALOG[genre];
  if (!row) {
    return `genre ${JSON.stringify(genre)} is not one this toolchain can produce or deliver yet`;
  }
  if (!row.delivered) {
    return `genre ${JSON.stringify(genre)} has a producer (${row.producerSkill}) but no delivery path yet`;
  }
  return null;
}
