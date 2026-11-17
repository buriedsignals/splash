// A dot map's dots, merged: one path per group and style instead of one circle per dot. 8 900 circles in every state
// of a web page never finished painting between two frames (gx-dot-density web, Qwen3.5-9B, mvq61); a handful of paths
// paint at once, and each still carries its group's key, so hovering a group still lights all of its dots.

/**
 * @param {{ x: number, y: number, key: string }[]} dots
 * @param {(d: { key: string }) => { fill: string, r: number }} styleOf
 * @returns {{ key: string, fill: string, r: number, d: string }[]}
 */
export function mergeDots(dots, styleOf) {
  const groups = new Map();
  for (const dot of dots) {
    const { fill, r } = styleOf(dot);
    const id = `${dot.key}\u0000${fill}\u0000${r}`;
    if (!groups.has(id)) groups.set(id, { key: dot.key, fill, r, parts: [] });
    groups.get(id).parts.push(`M${(dot.x - r).toFixed(1)} ${dot.y.toFixed(1)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`);
  }
  return [...groups.values()].map(({ parts, ...g }) => ({ ...g, d: parts.join("") }));
}
