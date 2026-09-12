// shared/map-beat/geometry.mjs
//
// THE SIZE A MAP IS BAKED AT IS AN OUTPUT OF THE LAYOUT, NOT A SETTING.
//
// The original bake said so in its own header — "this bake is only ever called at the exact size the
// still draws at" — and the plate-as-background arrangement got away with breaking it, because a
// blurry background is still a background. The moment the MARKS move into the image it stops being
// survivable: every absolute length comes out wrong by the ratio, and on a beat that frames on its
// subject the ratio is different per direction (0.698 to 0.781 on the flow map).
//
// So the component publishes where and how large its map will be, and the bake reads it.

export function drawnSizeOf(geometry) {
  return { width: Math.round(geometry.mapW), height: Math.round(geometry.mapH) };
}

/** THE PLATE GOES WHERE THE MARKS GO. Three of the six converted components placed it on the layout
 *  BOX instead — with `preserveAspectRatio="none"`, which compressed the geography by a third while
 *  the marks were drawn at the map's own scale. It stayed invisible as long as a second, coarser
 *  basemap was painted over it. */
export function assertPlateMatchesMarks(geometry) {
  const { mapX, mapY, mapW, mapH, plate } = geometry;
  const off = (a, b) => Math.abs(a - b) > 0.5;
  if (off(plate.x, mapX) || off(plate.y, mapY) || off(plate.width, mapW) || off(plate.height, mapH))
    throw new Error(
      `the plate is placed at ${plate.width}x${plate.height} at (${plate.x}, ${plate.y}) while the ` +
        `marks are drawn at ${mapW}x${mapH} at (${mapX}, ${mapY}) — the map is compressed, and every ` +
        `mark sits somewhere the geography under it does not`,
    );
}
