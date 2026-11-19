// The web Time kit's row floor, for the one variant whose vertical is a run of ranks. A 375 px phone drew gx-bump's ten
// ranks in ~80 px (2026-11-19) and the end names printed over each other. A rank is a LENGTH, free to follow the
// stretch, so chart-web floors its pitch; a value axis (line, area, stream) keeps the desktop ratio.

/**
 * @param {{ variant: string, domain: [number, number], height: number, px: number }} o
 *   domain  the ranks the plot spans (rank 1 on top: [slots, 1]); height  the viewBox height the ranks are laid over;
 *   px  the tallest word a rank carries on the page (its end name), in CSS px.
 */
export function bumpRowFloor({ variant, domain, height, px }) {
  if (variant !== "bump-ranking-over-time") return null;
  const span = Math.abs(domain[1] - domain[0]);
  if (!(span >= 1)) return null;
  // chart-web holds rows × pitch inside the viewBox: the ranks' lines sit `span` gaps apart over the full height.
  const rows = Math.round(span);
  return {
    rows,
    pitch: height / span,
    px: Math.ceil(px),
    why: `Each rank carries its name at the line's end; under that pitch a name prints over the next rank's.`,
  };
}
