// Which side of its seat a destination's name sits on: AWAY from the node, so the name never lies on its own band.
// Measured in Mercator, the projection the live map draws in. MapLibre's `text-anchor` names the side of the TEXT
// that touches the point: "right" puts the name west of the seat.
const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) * (180 / Math.PI);

/** @param {[number, number]} node  @param {[number, number]} seat  @returns {"left"|"right"|"top"|"bottom"} */
export function nameAnchor(node, seat) {
  const dx = seat[0] - node[0];
  const dy = mercY(seat[1]) - mercY(node[1]);
  if (Math.abs(dx) >= Math.abs(dy)) return dx < 0 ? "right" : "left";
  return dy > 0 ? "bottom" : "top";
}
