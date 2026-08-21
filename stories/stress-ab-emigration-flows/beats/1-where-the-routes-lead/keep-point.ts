/**
 * Is this projected place inside the plate, give or take a margin? A byte-for-byte copy of
 * `map-web/assets/geo-symbol.ts`'s own `keepPoint`, carried here rather than imported: a story
 * workspace does not reach into a skill directory at runtime, for the same reason a skill does not
 * reach into another skill.
 *
 * It is the bake's own frame gate and it is about PLACES, not ribbons. A ribbon may legitimately
 * bow outside the frame between two places that are both inside it; nothing here tests that, and
 * the beat's own camera is padded so that it cannot happen.
 */
export function keepPoint(
  point: { px: number; py: number },
  frame: { width: number; height: number },
  margin = 20,
): boolean {
  return (
    point.px >= -margin &&
    point.px <= frame.width + margin &&
    point.py >= -margin &&
    point.py <= frame.height + margin
  );
}
