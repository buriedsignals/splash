/**
 * The line from the station's ring to the block that names and counts it, when the block could not be seated
 * against the ring. gx-locator video (Gemma 12B, mvg92, 2026-11-19): settlements' names and dots took the ground
 * beside Zaporizhzhia's ring, the block fell back to the nearest clear spot ~220 px off, level with « Dnipro », and
 * nothing tied it back to the ring it counts. Null when the block already stands within `reach` of the ring's edge.
 */
const GAP = 4;

export const leaderTo = (centre, radius, box, reach) => {
  const near = {
    x: Math.min(Math.max(centre.x, box.x), box.x + box.width),
    y: Math.min(Math.max(centre.y, box.y), box.y + box.height),
  };
  if (Math.hypot(near.x - centre.x, near.y - centre.y) - radius <= reach) return null;
  const x2 = near.x + Math.sign(centre.x - near.x) * GAP;
  const y2 = near.y + Math.sign(centre.y - near.y) * GAP;
  const d = Math.hypot(x2 - centre.x, y2 - centre.y);
  const from = radius + GAP;
  return { x1: centre.x + ((x2 - centre.x) / d) * from, y1: centre.y + ((y2 - centre.y) / d) * from, x2, y2 };
};
