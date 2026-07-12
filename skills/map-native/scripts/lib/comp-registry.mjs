// skills/map-native/scripts/lib/comp-registry.mjs
// MIRROR of skills/chart-native/scripts/lib/comp-registry.mjs — keep the two in lockstep.
// Reads a named Remotion <Composition>'s registered LITERALS (width/height,
// durationInFrames/fps) straight out of Root.tsx's source text — "known constants"
// read at produce-time with no render (no React/Remotion runtime needed). produce.mjs
// uses them to fail-hard on regressed comp dims (e.g. re-introducing the 4:5 1350
// bug) and to feed snap-video's duration-vs-registered check.
//
// The attribute scan is BOUNDED to the one <Composition …> tag carrying the id: the
// previous non-greedy [\s\S]*? scan could silently walk past the matched tag into a
// LATER registration whenever the matched comp lacked (or reordered) an attribute,
// and return another comp's numbers. Non-literal values (durationInFrames={STORY_
// FRAMES}) yield null — callers skip or fail that check VISIBLY, never wrongly.

// The source slice of the single JSX tag containing `id="<compId>"` — from the
// nearest `<` before the id attribute to the tag's closing `>`. Registrations are
// flat self-closing tags with no `>` inside attribute values (verified across both
// skills' Root.tsx); if that ever changes, this truncates and the callers return
// null → produce fails hard with a clear message rather than reading wrong numbers.
function compTagSlice(rootTsxSrc, compId) {
  const idMatch = rootTsxSrc.match(new RegExp(`id=["']${compId}["']`));
  if (!idMatch || idMatch.index === undefined) return null;
  const tagStart = rootTsxSrc.lastIndexOf("<", idMatch.index);
  const tagEnd = rootTsxSrc.indexOf(">", idMatch.index);
  if (tagStart === -1 || tagEnd === -1) return null;
  return rootTsxSrc.slice(tagStart, tagEnd + 1);
}

function literalNumberProp(tagSlice, prop) {
  const m = tagSlice.match(new RegExp(`${prop}=\\{(\\d+)\\}`));
  return m ? Number(m[1]) : null;
}

/** Registered pixel dims of one composition, or null when absent/non-literal. */
export function readCompDims(rootTsxSrc, compId) {
  const tag = compTagSlice(rootTsxSrc, compId);
  if (!tag) return null;
  const width = literalNumberProp(tag, "width");
  const height = literalNumberProp(tag, "height");
  return width !== null && height !== null ? { width, height } : null;
}

/** Registered timing of one composition, or null when absent/non-literal. */
export function readCompTiming(rootTsxSrc, compId) {
  const tag = compTagSlice(rootTsxSrc, compId);
  if (!tag) return null;
  const frames = literalNumberProp(tag, "durationInFrames");
  const fps = literalNumberProp(tag, "fps");
  return frames !== null && fps !== null ? { frames, fps } : null;
}
