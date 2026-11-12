// THE STILL'S NOTES NUDGED CLEAR — pure arithmetic, run by GestureTimeStatic.tsx. Each note steps up or down by a
// fraction of its lead until its box touches no box already placed (end labels, fixed notes, earlier notes) and no
// drawn line. r8 on Osaurus (2026-11-12) set "36 pedelec riders killed" right of its reading, where the rising line
// ran through the words: the notes were kept clear of each other only.

const TRIES = [0, -1, 1, -2, 2, -3, 3, -4, 4, -5, 5, 6, -6, 7, -7, 8];

const hit = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0;

/** Whether a box is crossed by any polyline ([[x, y], …] in pixels). */
export function crossesLine(lines, b) {
  return lines.some((pts) =>
    pts.slice(1).some(([x1, y1], i) => {
      const [x0, y0] = pts[i];
      const a = Math.max(Math.min(x0, x1), b.left);
      const c = Math.min(Math.max(x0, x1), b.right);
      if (c < a) return false;
      if (x1 === x0) return Math.max(y0, y1) >= b.top && Math.min(y0, y1) <= b.bottom;
      const yAt = (x) => y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
      return Math.max(yAt(a), yAt(c)) >= b.top && Math.min(yAt(a), yAt(c)) <= b.bottom;
    }),
  );
}

/**
 * @param {any[]} notes
 * @param {{ boxes: any[], boxOf: (n: any) => any, leadOf: (n: any) => number, fontSizeOf: (n: any) => number, plot: { top: number, bottom: number }, lines?: number[][][] }} opts
 * Moves each unfixed note's y in place. boxes: already-placed boxes (grows); boxOf(note) → its box; leadOf(note) → its
 * line lead; plot: { top, bottom }; lines: the drawn polylines a note must not sit on.
 */
export function nudgeNotes(notes, { boxes, boxOf, leadOf, plot, lines = [], fontSizeOf }) {
  for (const n of notes.filter((x) => x.fixed)) boxes.push(boxOf(n));
  for (const n of notes.filter((x) => !x.fixed)) {
    const step = leadOf(n) * 0.9;
    const y0 = n.y;
    for (const k of TRIES) {
      n.y = Math.max(plot.top + fontSizeOf(n), Math.min(plot.bottom - 2, y0 + k * step));
      const box = boxOf(n);
      if (!boxes.some((b) => hit(b, box)) && !crossesLine(lines, box)) break;
    }
    n.leader = Math.abs(n.y - y0) > step * 1.5;
    boxes.push(boxOf(n));
  }
  return notes;
}
