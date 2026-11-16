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
