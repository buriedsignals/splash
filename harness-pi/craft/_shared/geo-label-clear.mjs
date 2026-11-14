/**
 * Whether a settlement's dot, ring included, lands on or touches one of a label's boxes ({x0,y0,x1,y1}).
 * gx-locator static (the 12B, 2026-11-15): Dnipro's ring sat on the « Z » of the subject's « Zaporizhzhia », and a
 * reader gives the station the dot nearest its name. Such a settlement is left off the plate.
 */
export function dotUnderLabel(boxes, cx, cy, r, gap = 2) {
  const m = r + gap;
  return boxes.some((b) => cx > b.x0 - m && cx < b.x1 + m && cy > b.y0 - m && cy < b.y1 + m);
}
