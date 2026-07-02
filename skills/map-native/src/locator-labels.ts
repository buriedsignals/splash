// Pure label declutter for the locator map — no MapTiler, no React. Replaces MapLibre's
// silent culling with a DETERMINISTIC priority rule: markers always draw; labels are placed
// highest-priority first and a label shows only if its box does not collide with one already
// shown. Same input → same result, regardless of input order. Reusable by symbol later.

export interface LabelBox {
  key: string;
  x: number; // top-left screen x (px)
  y: number; // top-left screen y (px)
  w: number;
  h: number;
  priority: number; // higher = placed first
}

function overlaps(a: LabelBox, b: LabelBox): boolean {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}

export function placeLabels(boxes: LabelBox[]): {
  shown: string[];
  hidden: string[];
} {
  const ordered = [...boxes].sort(
    (a, b) =>
      b.priority - a.priority || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0),
  );
  const placed: LabelBox[] = [];
  const shown: string[] = [];
  const hidden: string[] = [];
  for (const box of ordered) {
    if (placed.some((p) => overlaps(box, p))) {
      hidden.push(box.key);
    } else {
      placed.push(box);
      shown.push(box.key);
    }
  }
  return { shown, hidden };
}

// Radial offset (ems) to place a label just outside a marker of `markerRadius` px, for
// MapLibre `text-radial-offset`. Mirrors symbol-labels' labelRadialOffset.
export function labelRadialOffset(
  markerRadius: number,
  textSize: number,
  gap = 6,
): number {
  return (markerRadius + gap) / textSize;
}
