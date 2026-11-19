// A map page's standfirst is clamped to ONE line at desktop width (chart-web's `buildCss`): a longer one is cut
// mid-sentence, and the drawing-share guard refuses a second line. gx-flow-map web (Qwen3.5-9B, 2026-11-19) printed
// « …ce qui est exact, c'est la largeur, les deux extrémités et la… » with the projection's sentence cut away.
// So the kit measures the line before it renders: the derived sentence rides on the standfirst when both fit, and
// moves to the reading line under the map when they do not; a first form of limits that cannot fit alone is refused.

/** The text width one desktop line holds: the 1512 px window chart-web measures, less its 24 px gutters, with a
 *  margin for the browser's own shaping. */
export const ONE_LINE_PX = (1512 - 2 * 24) * 0.97;

/**
 * @param {{ limits: string, derived: string, reading: string, width: (text: string) => number, named?: string }} o
 *   limits  the first form of limits as the plate prints it; derived  the sentence the kit appends (e.g. what
 *   Mercator costs); reading  the line under the map; width  the text's measured width in the standfirst's font;
 *   named  the journalist's own limits, offered back when the form cannot fit.
 * @returns {{ caveat: string, reading: string }}
 */
export function fitCaveat({ limits, derived, reading, width, named }) {
  const both = derived ? `${limits} ${derived}` : limits;
  if (width(both) <= ONE_LINE_PX) return { caveat: both, reading };
  if (width(limits) <= ONE_LINE_PX) return { caveat: limits, reading: derived ? `${derived} ${reading}` : reading };
  const over = Math.ceil(width(limits) - ONE_LINE_PX);
  const perChar = width(limits) / limits.length;
  const budget = Math.floor(ONE_LINE_PX / perChar);
  const works = named && width(named) <= ONE_LINE_PX ? `limits: "${named}"` : `a first form under ${budget} characters`;
  throw new Error(
    `limits' first form runs ${over} px past the one line a desktop page gives it, and the page would cut it mid-sentence — a value that works: ${works} (keep your own sentence as a shorter form after it, or drop it)`,
  );
}
