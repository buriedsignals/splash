// The web Position kit's row floor. A dumbbell's vertical is a run of named rows (a LENGTH, free to follow the
// stretch), so chart-web may floor its pitch; without one a 375 px phone drew ten rows in ~80 px (gx-dumbbell,
// 2026-11-19) and every name printed over its neighbour's. The other Position variants keep their ratio.

export const WEB_FRAME = { width: 900, pitch: 30, minHeight: 300, height: 380 };

/** The viewBox height GesturePositionWeb draws a variant at. */
export function webFrameHeight(variant, rows) {
  return variant === "dumbbell-range-plot" ? Math.max(rows * WEB_FRAME.pitch + 40, WEB_FRAME.minHeight) : WEB_FRAME.height;
}

/**
 * @param {{ variant: string, rows: number, lead: (reg?: string) => number, px: number }} o
 *   lead  the axis register's line height in viewBox px (the scene's tick band, above and below the rows);
 *   px    the tallest thing a row carries on the page, in CSS px.
 */
export function webRowFloor({ variant, rows, lead, px }) {
  if (variant !== "dumbbell-range-plot" || rows < 2) return null;
  // The same plot height sceneOf (gesture-family-position.mjs) lays the dumbbell's rows in.
  const pitch = (webFrameHeight(variant, rows) - 2 * lead("axis") - 8) / rows;
  return {
    rows,
    pitch,
    px: Math.ceil(px),
    why: `Each of the ${rows} rows carries its name in the gutter and its two readings beside its points; under that pitch a row prints over its neighbour's.`,
  };
}
