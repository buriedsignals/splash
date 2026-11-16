// What verify-web's output says failed, read without Chrome (craft/_shared/web.mjs refuses on it).

/** The `failures:` block of verify-web's output (the skipped block lists its items the same way). */
export function failuresBlock(lines) {
  const from = lines.findIndex((l) => /^failures:/.test(l));
  const listed = [];
  if (from >= 0) for (const l of lines.slice(from + 1)) { if (!/^\s+- /.test(l)) break; listed.push(l); }
  return listed;
}

/** Every failure is about motion: two idle frames differ, or choosing "rest" does not restore the landing picture. */
export function motionOnly(failures) {
  return failures.length > 0 && failures.every((l) => /pixels differ between two idle frames|again restores the landing picture/.test(l));
}

/**
 * The refusal for failures a word in beat.mjs can answer. It names them, and only them: listing a known false red
 * beside a real failure (gx-connected-scatter web, Qwen3.5-9B) sent the model to "fix the words" with three failures
 * in view, two of which no word can answer.
 */
export function wordsRefusal(listed, falseReds) {
  const real = listed.filter((l) => !falseReds.includes(l));
  const named = real.map((l) => l.replace(/^\s+- /, "  - ")).join("\n");
  const others = falseReds.length
    ? ` The ${falseReds.length} other failure${falseReds.length > 1 ? "s are" : " is"} a known false red (the typeface probe on a face the page embeds, or the restore check's anti-aliasing): change nothing for ${falseReds.length > 1 ? "them" : "it"}.`
    : "";
  return `the page rendered but the chart-web verification failed (${real.length || "see above"}) — fix the words in beat.mjs that ${real.length > 1 ? "these failures name" : "this failure names"}, then render again:\n${named}${others}`;
}
