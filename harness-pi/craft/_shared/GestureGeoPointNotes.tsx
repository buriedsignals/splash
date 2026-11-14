/**
 * The words a point-map gesture writes on the plate (a `name`, an `annotate`, a highlight's note), shared by the four
 * static variants of GestureGeoPointStatic. A note is written DIRECTLY beside its mark (`value-on-the-mark`), on a
 * halo of the ground it sits on, in the annot register — the accent ink for the subject, the plate's ink otherwise —
 * and never on another word: each label tries right, left, above, below, then the four corners of its seat, taking the first that crosses
 * fewest of the plate's circles, and a label no side can hold
 * inside the map box is reported (`onLadder`), not drawn over a neighbour.
 */

export type GeoNote = {
  x: number;
  y: number;
  r?: number;
  lines: string[];
  accent?: boolean;
};

type Box = { x: number; y: number; width: number; height: number };

/** The part of the map the frame shows: beside the copy a map FILLS its box and crops the far east, and notes placed
 *  against the whole map wrote "Ukraine 6 000 MW" from 865 to 974 in a 960px frame (gx-proportional-symbol static,
 *  Qwen3.5-9B, 2026-11-13). */
export function visibleBox(map: Box, frame: Box): Box {
  const x = Math.max(map.x, frame.x);
  const y = Math.max(map.y, frame.y);
  return {
    x,
    y,
    width: Math.min(map.x + map.width, frame.x + frame.width) - x,
    height: Math.min(map.y + map.height, frame.y + frame.height) - y,
  };
}

export function placeGeoNotes({
  notes,
  box,
  widthOf,
  lineHeight,
  taken = [],
  marks = [],
  onLadder,
}: {
  notes: GeoNote[];
  box: { x: number; y: number; width: number; height: number };
  widthOf: (text: string) => number;
  lineHeight: number;
  taken?: { x: number; y: number; w: number; h: number }[];
  /** The plate's circles: a note keeps off them when a side allows, else takes the side crossing fewest. */
  marks?: { x: number; y: number; r: number }[];
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
    // The four corners after the four sides: a dense field (Ukraine's plants among Belarus's and Romania's) often
    // leaves a corner clear where no side is.
    const d = gap * Math.SQRT1_2;
    for (const [sx, sy] of [[1, -1], [-1, -1], [1, 1], [-1, 1]]) {
      const bx = sx > 0 ? note.x + d : note.x - d - w;
      const by = sy < 0 ? note.y - d - h : note.y + d;
      tries.push({ x: sx > 0 ? note.x + d : note.x - d, y: by, anchor: sx > 0 ? "start" : "end", b: { x: bx, y: by, w, h } });
    }
    const inside = (b: { x: number; y: number; w: number; h: number }) =>
      b.x >= box.x + 2 &&
      b.y >= box.y + 2 &&
      b.x + b.w <= box.x + box.width - 2 &&
      b.y + b.h <= box.y + box.height - 2;
    const crossed = (b: { x: number; y: number; w: number; h: number }) =>
      marks.filter((m) => {
        const dx = m.x - Math.max(b.x, Math.min(m.x, b.x + b.w));
        const dy = m.y - Math.max(b.y, Math.min(m.y, b.y + b.h));
        return dx * dx + dy * dy < m.r * m.r;
      }).length;
    const free = tries.filter((t) => inside(t.b) && !hit(t.b));
    const fit = free.reduce<(typeof free)[number] | undefined>(
      (best, t) => (!best || crossed(t.b) < crossed(best.b) ? t : best),
      undefined,
    );
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
