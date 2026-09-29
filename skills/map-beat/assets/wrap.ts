// twin/skills/chart-beat/assets/wrap.ts
/**
 * WRAP ON THE MEASURED WIDTH OF THE REAL STRING, NEVER ON A CHARACTER COUNT.
 *
 * Carried byte for byte into `map-beat/assets/wrap.ts` (the static seeds `ChartSeed` and
 * `Co2MapStill` both wrap their furniture with it). `chart-web/assets/ChartWebSeed.tsx` keeps its
 * own copy that takes `measure` as a parameter, because that component never imports the
 * rasteriser; the video seeds' and `image-beat`'s copies predate the hyphen break below.
 */

import { measureText } from "../scripts/render-still.mjs";

type Font = { fontSize: number; fontWeight: number };

export function wrap(text: string, maxWidth: number, font: Font): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of breakLongTokens(text.split(/\s+/), maxWidth, font)) {
    const joiner = line.endsWith("-") ? "" : " ";
    const trial = line ? `${line}${joiner}${word}` : word;
    if (line && measureText(trial, font) > maxWidth) {
      lines.push(line);
      line = word;
    } else line = trial;
  }
  return line ? [...lines, line] : lines;
}

/**
 * A WORD WIDER THAN ITS OWN MEASURE, WHICH ONLY A PHONE FRAME PRODUCES.
 *
 * `wrap` breaks between words, so a single token wider than the measure is emitted whole and runs
 * off the frame. At 900x560 that never happened; at 1080 wide with 78px type it happens on the
 * first render — a 30-character hyphenated place name measured 1225px against a 936px measure and
 * drew 219px outside the frame, with no assertion but a real ink box seeing it.
 *
 * Breaking at a HYPHEN is ordinary typography and loses nothing: the hyphen is already there and
 * already reads as a break. So a hyphenated token is split at its own hyphens, each hyphen kept on
 * the line it ends, and `wrap` re-joins without a space after one.
 *
 * A token with no hyphen and no room is EMITTED WHOLE, deliberately, and this is the one place a
 * refusal was written and then taken back out. Two reasons, both measured rather than argued.
 * First, breaking a word mid-syllable is a decision about somebody's name and is not this file's to
 * take. Second, a throw would be a contract change for every copy of `wrap`, including the fluid
 * web frame's, where a transient 1px measure during layout is ordinary and must not be fatal. The
 * overflow it would have caught is already refused where it can be SEEN:
 * `three-sizes-no-collision.test.ts` measures every run's real ink box against the frame edge and
 * fails the render.
 */
function breakLongTokens(words: string[], maxWidth: number, font: Font): string[] {
  const out: string[] = [];
  for (const word of words) {
    const pieces = word.split("-");
    if (pieces.length === 1 || measureText(word, font) <= maxWidth) {
      out.push(word);
      continue;
    }
    pieces.forEach((piece, i) =>
      out.push(i < pieces.length - 1 ? `${piece}-` : piece),
    );
  }
  return out;
}
