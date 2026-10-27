/**
 * The words a point-map gesture writes on the plate (a `name`, an `annotate`, a highlight's note), shared by the four
 * static variants of GestureGeoPointStatic. A note is written DIRECTLY beside its mark (`value-on-the-mark`), on a
 * halo of the ground it sits on, in the annot register — the accent ink for the subject, the plate's ink otherwise —
 * and never on another word: each label tries right, left, above, then below its seat, and a label no side can hold
 * inside the map box is reported (`onLadder`), not drawn over a neighbour.
 */

export type GeoNote = {
  x: number;
  y: number;
  r?: number;
  lines: string[];
  accent?: boolean;
};

export function placeGeoNotes({
  notes,
  box,
  widthOf,
  lineHeight,
  taken = [],
  onLadder,
}: {
  notes: GeoNote[];
  box: { x: number; y: number; width: number; height: number };
  widthOf: (text: string) => number;
  lineHeight: number;
  taken?: { x: number; y: number; w: number; h: number }[];
  onLadder?: (note: string) => void;
}) {
  const placed: {
    note: GeoNote;
    x: number;
    y: number;
    anchor: "start" | "end";
  }[] = [];
  const boxes = [...taken];
  const hit = (b: { x: number; y: number; w: number; h: number }) =>
    boxes.some(
      (o) =>
        b.x < o.x + o.w &&
        o.x < b.x + b.w &&
        b.y < o.y + o.h &&
        o.y < b.y + b.h,
    );
  for (const note of notes) {
    const w = Math.max(...note.lines.map(widthOf));
    const h = note.lines.length * lineHeight;
    const gap = (note.r ?? 2) + 4;
    const tries: {
      x: number;
      y: number;
      anchor: "start" | "end";
      b: { x: number; y: number; w: number; h: number };
    }[] = [
      {
        x: note.x + gap,
        y: note.y - h / 2,
        anchor: "start",
        b: { x: note.x + gap, y: note.y - h / 2, w, h },
      },
      {
        x: note.x - gap,
        y: note.y - h / 2,
        anchor: "end",
        b: { x: note.x - gap - w, y: note.y - h / 2, w, h },
      },
      {
        x: note.x - w / 2,
        y: note.y - gap - h,
        anchor: "start",
        b: { x: note.x - w / 2, y: note.y - gap - h, w, h },
      },
      {
        x: note.x - w / 2,
        y: note.y + gap,
        anchor: "start",
        b: { x: note.x - w / 2, y: note.y + gap, w, h },
      },
    ];
    const inside = (b: { x: number; y: number; w: number; h: number }) =>
      b.x >= box.x + 2 &&
      b.y >= box.y + 2 &&
      b.x + b.w <= box.x + box.width - 2 &&
      b.y + b.h <= box.y + box.height - 2;
    const fit = tries.find((t) => inside(t.b) && !hit(t.b));
    if (!fit) {
      onLadder?.(
        `NOTE — "${note.lines.join(" ")}" has no free side inside the map: not drawn`,
      );
      continue;
    }
    boxes.push(fit.b);
    placed.push({ note, x: fit.x, y: fit.y, anchor: fit.anchor });
  }
  return placed;
}

export function GeoNotes({
  placed,
  lineHeight,
  style,
  ink,
  accentInk,
  halo,
}: {
  placed: ReturnType<typeof placeGeoNotes>;
  lineHeight: number;
  style: Record<string, unknown>;
  ink: string;
  accentInk: string;
  halo: string;
}) {
  return (
    <g>
      {placed.map((p, i) =>
        p.note.lines.map((l, k) => (
          <text
            key={`${i}-${k}`}
            x={p.x}
            y={p.y + (k + 0.78) * lineHeight}
            textAnchor={p.anchor}
            {...style}
            fill={p.note.accent ? accentInk : ink}
            stroke={halo}
            strokeWidth={3}
            strokeLinejoin="round"
            paintOrder="stroke"
          >
            {l}
          </text>
        )),
      )}
    </g>
  );
}
