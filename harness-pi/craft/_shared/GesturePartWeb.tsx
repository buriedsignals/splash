/**
 * The Part-to-whole family as an interactive page, every type a variant: `treemap` (squarified tiles),
 * `marimekko-mosaic-plot` (variable-width 100 % columns, a cell's AREA its value), `pie-and-donut` (arcs of one ring
 * from twelve o'clock). Forked from GesturePartStatic.tsx (the plate) and the per-type web components
 * (web/treemap/DirectedTreemapWeb.tsx: labels asked of each cell in the reader's own pixels; web/pie-and-donut/
 * DirectedDonutWeb.tsx: an angle is never stretched, `meet`), with their fixed staging replaced by the web
 * scheduler's resting picture and controls (_shared/gesture-part-web.mjs).
 *
 * ONE PLATE PER STATE, as GestureBarWeb draws them: the resting plate (every gesture that can rest together) and one
 * plate per control (the resting picture plus that gesture), drawn whole at build time and revealed by its radio
 * (`:checked` / `:has()`, no script). A treemap bracket RE-LAYS its plate (the set as one block of its summed area),
 * so a pointer on any plate is answered by the part drawn there.
 *
 * Kept from the per-type doctrine: one whole, one area (or angle) per unit on every plate; one accent on what the
 * gestures mark, the field one neutral at the non-text floor; a part steps toward the ink under the pointer and
 * answers with its share of the whole and its rank; a figure printed inside its own part is drawn only where the
 * part holds it at the reader's own size (a size container per part), and every part still answers a pointer.
 */

import {
  adjustToContrast,
  assertLegible,
  contrast,
  mix,
  NON_TEXT_CONTRAST_MIN,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";
import { figureVars, webRegisters } from "#shared/design-base/web.mjs";
import { skillScriptFrom } from "#shared/design-base/skill-script.mjs";
import {
  anchorOf,
  arcPath,
  copyShape,
  layoutPart,
} from "./gesture-family-part.mjs";

const { controlChromeCss } = await import(
  skillScriptFrom(
    import.meta.dirname,
    "chart-web",
    "assets",
    "control-chrome.ts",
  )
);

export const FRAMES = {
  treemap: { width: 900, height: 480 },
  "marimekko-mosaic-plot": { width: 900, height: 460 },
  "pie-and-donut": { width: 760, height: 400 },
};
const SCOPE = ".chart-figure";
const CELL_PAD_PX = 4;
const TIER = 4;
const tier = (w: number) => Math.ceil((w + CELL_PAD_PX * 2 + 2) / TIER) * TIER;
const pct = (v: number, extent: number) => (v / extent) * 100;

export type WebPart = {
  name: string;
  value: number;
  label: string;
  display: string;
  detail: string;
  key?: string;
  series?: string;
  rest?: boolean;
};
type Picture = {
  accent: string[];
  rings: string[];
  stepBack: string[];
  notes: { text: string; marks: string[] }[];
  brackets: { members: string[] }[];
  copies: { onto: string; value: number }[];
  count: { text: string } | null;
};
export type WebControl = {
  index: number;
  do: string;
  atom: string;
  legend: string;
  chip: string;
  announce: string;
  note: string;
  picture: Picture;
  groups: string[][];
};

export function GesturePartWeb({
  variant,
  parts,
  resting,
  controls,
  restLabel,
  landingLabel,
  restNotes,
  wholeLabel,
  title,
  eyebrow,
  caveat,
  source,
  unit,
  alt,
  direction,
  ground,
  accent,
  ink,
  muted,
  grid,
  measure,
  format,
}: {
  variant: "treemap" | "marimekko-mosaic-plot" | "pie-and-donut";
  parts: WebPart[];
  resting: Picture;
  controls: WebControl[];
  restLabel: string;
  landingLabel: string;
  restNotes: string[];
  wholeLabel: string;
  title: string;
  eyebrow: string;
  caveat: string;
  source: string;
  unit: string;
  alt: string;
  direction: any;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
  measure: (text: string, font: Record<string, unknown>) => number;
  format: (v: number) => string;
}) {
  const FRAME = FRAMES[variant];
  const W = FRAME.width;
  const H = FRAME.height;
  const regs = webRegisters(direction, { ink: { ink, muted, accent } });
  const donut = variant === "pie-and-donut";
  const mosaic = variant === "marimekko-mosaic-plot";

  assertLegible(accent, ground, {
    role: "mark",
    where: `${direction.id ?? "this direction"}'s accent`,
  });
  const lit = adjustToContrast(accent, ground, NON_TEXT_CONTRAST_MIN) ?? accent;
  let neutral = mix(ground, ink, 0.3);
  if (contrast(neutral, ground) < NON_TEXT_CONTRAST_MIN)
    neutral =
      adjustToContrast(neutral, ground, NON_TEXT_CONTRAST_MIN) ?? neutral;
  // A part a filter steps back keeps its place and its share of the whole, in the quietest fill.
  const quiet = mix(ground, ink, 0.1);
  const labelInk = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const accentInk =
    contrast(accent, ground) >= TEXT_CONTRAST_MIN ? accent : labelInk;
  const darken = (fill: string) => {
    for (let dose = 0.16; dose <= 0.7; dose += 0.02) {
      const moved = mix(fill, ink, dose);
      if (contrast(moved, fill) >= 1.12) return moved;
    }
    throw new Error(
      `no dose of the direction's ink moves ${fill} 1.12:1 off itself — a reader could not see which part answered the pointer`,
    );
  };
  const activeFor = new Map([lit, neutral, quiet].map((f) => [f, darken(f)]));
  const inkOn = (fill: string) => {
    const pick = contrast(ink, fill) >= contrast(ground, fill) ? ink : ground;
    return adjustToContrast(pick, fill, TEXT_CONTRAST_MIN) ?? pick;
  };

  // ── geometry ──────────────────────────────────────────────────────────────────────────────────
  const R1 = Math.min(W, H) / 2 - 22;
  const box = donut
    ? { x: W / 2 - R1, y: H / 2 - R1, w: 2 * R1, h: 2 * R1 }
    : { x: 0, y: 0, w: W, h: H };
  const marks = parts.map((p) => ({
    name: p.name,
    value: p.value,
    key: p.key,
    series: p.series,
    rest: p.rest,
  }));
  const byName = new Map(parts.map((p) => [p.name, p]));
  const keyOf = new Map(parts.map((p, i) => [p.name, `m${i + 1}`]));

  const valueFont = {
    fontSize: Number.parseFloat(regs.value.fontSize as string),
    fontWeight: regs.value.fontWeight,
    fontFamily: String(regs.value.fontFamily).split(",")[0].replace(/"/g, ""),
  };
  const lead = valueFont.fontSize * Number(regs.value.lineHeight);
  const widthOf = (text: string) => measure(text, valueFont) * 1.04;
  const cellText = (p: WebPart) =>
    mosaic ? (p.series ?? p.display) : p.display;

  type PlateDef = { id: number; picture: Picture; groups: string[][] };
  const plates: PlateDef[] = [
    { id: 0, picture: resting, groups: [] },
    ...controls.map((c, k) => ({
      id: k + 1,
      picture: c.picture,
      groups: c.groups,
    })),
  ];

  // A DONUT'S LABELS stand outside the ring, beside their arc, never displaced (a label pushed away from its arc
  // reads as another arc's). Each label is drawn only at plot widths where it clears the frame's edge and every
  // larger part's label on its side: the threshold is computed here and asked of the layer, in the reader's pixels.
  const outsideLabels = (shapes: Map<string, any>) => {
    if (!donut) return [];
    const lineH = 2 * lead + 4;
    const GAP = 8;
    // The label's box in CSS px at a plot width `wp`: beside the rim point, pushed off the ring along the arc's own
    // direction (above it near twelve o'clock, below it near six).
    const boxAt = (l: any, wp: number) => {
      const k = wp / W;
      const x = l.x * k;
      const y = l.y * k - lineH * (0.5 + 0.5 * l.cos) - GAP * l.cos;
      const left = l.right ? x + GAP : x - GAP - l.tw;
      return { left, right: left + l.tw, top: y, bottom: y + lineH, k };
    };
    const clears = (l: any, wp: number, placed: any[]) => {
      const b = boxAt(l, wp);
      if (b.left < 0 || b.right > W * b.k || b.top < 0 || b.bottom > H * b.k) return false;
      // Off the ring: the box's nearest point to the centre stays outside the outer radius.
      const cx = (W / 2) * b.k;
      const cy = (H / 2) * b.k;
      const nx = Math.max(b.left, Math.min(cx, b.right));
      const ny = Math.max(b.top, Math.min(cy, b.bottom));
      if (Math.hypot(nx - cx, ny - cy) < R1 * b.k + 2) return false;
      return placed.every((q) => {
        const o = boxAt(q, wp);
        return b.right + 4 <= o.left || o.right + 4 <= b.left || b.bottom + 2 <= o.top || o.bottom + 2 <= b.top;
      });
    };
    const placed: any[] = [];
    for (const p of [...parts].sort((a, b) => b.value - a.value)) {
      const s = shapes.get(p.name);
      if (!s || !(s.a1 - s.a0 > 0.02)) continue;
      const a = anchorOf(s);
      const l = { name: p.name, x: s.cx + s.r1 * Math.sin(a.angle), y: s.cy - s.r1 * Math.cos(a.angle), cos: Math.cos(a.angle), right: Math.sin(a.angle) >= 0, tw: Math.max(widthOf(p.display), widthOf(p.label)) + 8 };
      // The smallest plot width from which this label clears everything already placed, at every larger width.
      let need = 0;
      for (let wp = 3200; wp >= 160; wp -= TIER) {
        if (!clears(l, wp, placed)) break;
        need = wp;
      }
      if (!need) continue;
      placed.push({ ...l, need });
    }
    return placed;
  };

  const drawn = plates.map((plate) => {
    const shapes = layoutPart({
      variant,
      parts: marks,
      box,
      groups: plate.groups,
    });
    return { ...plate, shapes, outside: outsideLabels(shapes) };
  });

  const fillOf = (pic: Picture, p: WebPart) =>
    pic.accent.includes(p.name)
      ? lit
      : pic.stepBack.includes(p.name) || (p.rest && pic.stepBack.length)
        ? quiet
        : neutral;

  // A marimekko's columns: name and total under each, on two staggered rows, clamped inside the frame.
  const columns = mosaic
    ? [...new Set(parts.map((p) => p.key as string))].map((k) => {
        const cells = parts.filter((p) => p.key === k);
        const s = drawn[0].shapes.get(cells[0].name);
        return {
          k,
          name: cells[0].rest ? restLabel : k,
          total: cells.reduce((t, p) => t + p.value, 0),
          x: s.x,
          w: s.w,
        };
      })
    : [];
  const axisFont = {
    fontSize: Number.parseFloat(regs.axis.fontSize as string),
    fontWeight: regs.axis.fontWeight,
    fontFamily: String(regs.axis.fontFamily).split(",")[0].replace(/"/g, ""),
  };
  const axisLead = axisFont.fontSize * Number(regs.axis.lineHeight ?? 1.2);
  const xAxisRowPx = mosaic ? Math.ceil(4 * axisLead) + 12 : 0;

  // Each column label takes the staggered row where it clears the labels already placed (the columns the gestures
  // name most first, then the widest), and is drawn only at plot widths where it clears them and the frame's edges:
  // the threshold is asked of the axis band in the reader's own pixels, as a donut's arc labels are.
  const mentionCount = new Map<string, number>();
  for (const pic of [resting, ...controls.map((c) => c.picture)])
    for (const n of [...pic.accent, ...pic.rings, ...pic.brackets.flatMap((x) => x.members), ...pic.copies.map((x) => x.onto)]) {
      const k = byName.get(n)?.key;
      if (k !== undefined) mentionCount.set(k, (mentionCount.get(k) ?? 0) + 1);
    }
  const axisPlaced = new Map<string, { row: number; need: number; lw: number }>();
  {
    const rows: { cx: number; lw: number }[][] = [[], []];
    const order = [...columns].sort((a, b) => (mentionCount.get(b.k) ?? 0) - (mentionCount.get(a.k) ?? 0) || b.w - a.w);
    for (const c of order) {
      const lw = Math.ceil(Math.max(measure(c.name, axisFont), measure(format(c.total), axisFont)) * 1.1) + 4;
      const cx = c.x + c.w / 2;
      const edge = Math.max((lw / 2) * W / Math.max(cx, 1), (lw / 2) * W / Math.max(W - cx, 1));
      const needIn = (row: { cx: number; lw: number }[]) => Math.max(edge, ...row.map((q) => (((q.lw + lw) / 2 + 6) * W) / Math.max(Math.abs(q.cx - cx), 0.5)));
      const row = needIn(rows[0]) <= needIn(rows[1]) ? 0 : 1;
      rows[row].push({ cx, lw });
      axisPlaced.set(c.k, { row, need: Math.ceil(needIn(rows[row].slice(0, -1)) / TIER) * TIER, lw });
    }
  }
  const axisNeeds = [...new Set([...axisPlaced.values()].map((v) => v.need))];

  // ── the stylesheet ─────────────────────────────────────────────────────────────────────────────
  const boxes = drawn.flatMap((d) =>
    parts.map((p) => ({
      wname: tier(widthOf(cellText(p))),
      wvalue: tier(Math.max(widthOf(cellText(p)), widthOf(p.label))),
    })),
  );
  const nameTiers = [...new Set(boxes.map((b) => b.wname))].sort(
    (a, b) => a - b,
  );
  const valueTiers = [...new Set(boxes.map((b) => b.wvalue))].sort(
    (a, b) => a - b,
  );
  const needs = [
    ...new Set(drawn.flatMap((d) => d.outside.map((o: any) => o.need))),
  ].sort((a, b) => a - b);
  const css = [
    `${SCOPE} [data-plate]:not([data-plate="0"]) { display: none; }`,
    `${SCOPE} .chart-plot .part-layer { position: relative; pointer-events: none; container-type: size; overflow: hidden; }`,
    `${SCOPE} .gesture-controls { flex: 0 0 auto; display: flex; flex-wrap: wrap; align-items: center; gap: 0 28px; margin-top: 4px; }`,
    `${SCOPE} .gesture-controls > fieldset { flex: 0 1 auto; max-width: 100%; }`,
    `${SCOPE} .gesture-notes { flex: 0 0 auto; display: grid; }`,
    `${SCOPE} .gesture-notes > div { grid-area: 1 / 1; align-self: start; }`,
    `${SCOPE} .gw-note { visibility: hidden; }`,
    `${SCOPE} .chart-rest-notes { margin: 4px 0 0; }`,
    `#tooltip { max-width: min(440px, calc(100vw - 32px)); }`,
    `${SCOPE} .cell-box { position: absolute; box-sizing: border-box; padding: 0; container-type: size; display: block; overflow: hidden; }`,
    // The padding is the words', not the box's: a box keeps its part's exact size however thin the part is.
    `${SCOPE} .cell-box > span { padding: 0 ${CELL_PAD_PX}px; }`,
    `${SCOPE} .cell-box > span:first-child { padding-top: ${CELL_PAD_PX}px; }`,
    `${SCOPE} .cell-box > span { display: block; white-space: nowrap; }`,
    `${SCOPE} .cell-box > .cell-value { font-weight: 400; }`,
    `@container (max-height: ${(lead + CELL_PAD_PX * 2 - 0.01).toFixed(2)}px) { ${SCOPE} .cell-box > span { opacity: 0; } }`,
    `@container (max-height: ${(2 * lead + CELL_PAD_PX * 2 - 0.01).toFixed(2)}px) { ${SCOPE} .cell-box > .cell-value { opacity: 0; } }`,
    ...nameTiers.map(
      (t) =>
        `@container (max-width: ${(t - 0.01).toFixed(2)}px) { ${SCOPE} .cell-box[data-wname="${t}"] > span { opacity: 0; } }`,
    ),
    ...valueTiers.map(
      (t) =>
        `@container (max-width: ${(t - 0.01).toFixed(2)}px) { ${SCOPE} .cell-box[data-wvalue="${t}"] > .cell-value { opacity: 0; } }`,
    ),
    `${SCOPE} .arc-label { position: absolute; white-space: nowrap; line-height: ${regs.value.lineHeight}; }`,
    `${SCOPE} .arc-label[data-side="left"] { text-align: right; }`,
    `${SCOPE} .arc-label > span { display: block; }`,
    ...needs.map(
      (t) =>
        `@container (max-width: ${t - 0.01}px) or (max-height: ${((t * H) / W - 0.01).toFixed(2)}px) { ${SCOPE} .arc-label[data-need="${t}"] { opacity: 0; } }`,
    ),
    `${SCOPE} .centre-label { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); text-align: center; white-space: nowrap; background: transparent; }`,
    ...(mosaic
      ? [
          `${SCOPE} .chart-plot .x-axis { pointer-events: none; container-type: inline-size; }`,
          `${SCOPE} .x-axis .axis-label.x { white-space: nowrap; text-align: center; transform: translateX(-50%); left: calc(var(--cx) / ${W / 100} * 1%); }`,
          ...axisNeeds.map((t) => `@container (max-width: ${t - 0.01}px) { ${SCOPE} .x-axis .axis-label.x[data-need="${t}"] { opacity: 0; } }`),
          `${SCOPE} .x-axis .axis-label.x[data-row="1"] { top: ${Math.round(2 * axisLead) + 8}px; }`,
        ]
      : []),
    ...controls.flatMap((_, k) => {
      const on = `${SCOPE}:has(#gesture-${k + 1}-on:checked)`;
      return [
        `${on} [data-plate] { display: none; }`,
        `${on} [data-plate="${k + 1}"] { display: block; }`,
        `${on} .gw-note { visibility: hidden; }`,
        `${on} [data-gesture-${k + 1}-note="on"] { visibility: visible; }`,
      ];
    }),
    ...controls.map((_, k) =>
      controlChromeCss({
        scope: SCOPE,
        name: `gesture-${k + 1}`,
        margin: "2px 0 0",
      }),
    ),
  ].join("\n");

  const { color: _valueInk, ...valueRest } = regs.value as any;

  const shapeEl = (s: any, props: Record<string, unknown>) =>
    s.kind === "arc" ? (
      <path d={arcPath(s)} {...props} />
    ) : (
      <rect
        x={s.x}
        y={s.y}
        width={Math.max(s.w, 0.01)}
        height={Math.max(s.h, 0.01)}
        {...props}
      />
    );

  const drawPlate = (d: (typeof drawn)[number]) => {
    const pic = d.picture;
    const mk = (name: string) => `p${d.id}-${keyOf.get(name)}`;
    const isRest = d.id === 0;
    const groupBox = (members: string[]) => {
      const list = members.map((n) => d.shapes.get(n)).filter(Boolean);
      if (!list.length) return null;
      if (list[0].kind === "arc")
        return {
          ...list[0],
          a0: Math.min(...list.map((s: any) => s.a0)),
          a1: Math.max(...list.map((s: any) => s.a1)),
          r0: list[0].r1 + 5,
          r1: list[0].r1 + 9,
        };
      return null;
    };
    return [
      <div className="y-axis" data-plate={d.id} key={`y${d.id}`} />,
      <svg
        key={`s${d.id}`}
        role="group"
        aria-label={title}
        xmlns="http://www.w3.org/2000/svg"
        className="chart"
        data-hit="cell"
        data-plate={d.id}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio={donut ? "xMidYMid meet" : "none"}
      >
        {isRest ? <desc>{alt}</desc> : null}
        <rect x={0} y={0} width={W} height={H} fill={ground} />
        {parts.map((p) => {
          const s = d.shapes.get(p.name);
          if (!s || !(p.value > 0)) return null;
          const fill = fillOf(pic, p);
          return (
            <g key={p.name}>
              {shapeEl(s, {
                "data-mark": mk(p.name),
                fill,
                stroke: ground,
                strokeWidth: 1.4,
                vectorEffect: "non-scaling-stroke",
                style: { ["--mark-active" as string]: activeFor.get(fill) },
              })}
            </g>
          );
        })}
        {/* rings: a part named, or ringed rather than recoloured */}
        {pic.rings.map((n) => {
          const s = d.shapes.get(n);
          if (!s) return null;
          return (
            <g key={`ring-${n}`}>
              {shapeEl(
                s.kind === "arc"
                  ? { ...s, r0: s.r0 - 2, r1: s.r1 + 2 }
                  : {
                      ...s,
                      x: s.x + 1.5,
                      y: s.y + 1.5,
                      w: Math.max(0, s.w - 3),
                      h: Math.max(0, s.h - 3),
                    },
                {
                  fill: "none",
                  stroke: labelInk,
                  strokeWidth: 2.4,
                  vectorEffect: "non-scaling-stroke",
                  pointerEvents: "none",
                },
              )}
            </g>
          );
        })}
        {/* brackets: the set gathered (treemap block outline, donut band, marimekko cell outlines) */}
        {pic.brackets.map((b, i) => {
          const band = groupBox(b.members);
          if (band)
            return (
              <path
                key={`b${i}`}
                d={arcPath(band)}
                fill={labelInk}
                pointerEvents="none"
              />
            );
          const list = b.members.map((n) => d.shapes.get(n)).filter(Boolean);
          if (variant === "treemap" && list.length > 1) {
            const x0 = Math.min(...list.map((s: any) => s.x));
            const y0 = Math.min(...list.map((s: any) => s.y));
            const x1 = Math.max(...list.map((s: any) => s.x + s.w));
            const y1 = Math.max(...list.map((s: any) => s.y + s.h));
            return (
              <rect
                key={`b${i}`}
                x={x0 + 1}
                y={y0 + 1}
                width={x1 - x0 - 2}
                height={y1 - y0 - 2}
                fill="none"
                stroke={labelInk}
                strokeWidth={3}
                vectorEffect="non-scaling-stroke"
                pointerEvents="none"
              />
            );
          }
          return list.map((s: any, j: number) => (
            <rect
              key={`b${i}-${j}`}
              x={s.x + 1}
              y={s.y + 1}
              width={Math.max(0, s.w - 2)}
              height={Math.max(0, s.h - 2)}
              fill="none"
              stroke={labelInk}
              strokeWidth={2.4}
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
          ));
        })}
        {/* compare: the compared quantity laid against the subject, at the plate's own measure per unit */}
        {pic.copies.map((c, i) => {
          const s = copyShape({
            variant,
            shapes: d.shapes,
            onto: c.onto,
            value: c.value,
            ontoValue: byName.get(c.onto)?.value ?? 0,
            box,
          });
          if (!s) return null;
          return (
            <g key={`copy${i}`}>
              {shapeEl(s, {
                fill: "none",
                stroke: labelInk,
                strokeWidth: 2.4,
                strokeDasharray: "6 4",
                vectorEffect: "non-scaling-stroke",
                pointerEvents: "none",
              })}
            </g>
          );
        })}
        {/* hit points: a large tile is sampled on a grid so a pointer anywhere on it is answered by it */}
        {parts.flatMap((p) => {
          const s = d.shapes.get(p.name);
          if (!s || !(p.value > 0)) return [];
          const spots: { cx: number; cy: number; r: number }[] = [];
          if (s.kind === "arc") {
            const a = anchorOf(s);
            spots.push({ cx: a.x, cy: a.y, r: (s.r1 - s.r0) / 2 });
          } else {
            const nx =
              variant === "treemap"
                ? Math.max(1, Math.min(4, Math.round(s.w / 70)))
                : 1;
            const ny =
              variant === "treemap"
                ? Math.max(1, Math.min(4, Math.round(s.h / 70)))
                : 1;
            for (let iy = 0; iy < ny; iy++)
              for (let ix = 0; ix < nx; ix++)
                spots.push({
                  cx: s.x + (s.w * (ix + 0.5)) / nx,
                  cy: Math.min(
                    Math.max(s.y + (s.h * (iy + 0.5)) / ny, 1.5),
                    H - 1.5,
                  ),
                  r: Math.max(3, Math.min(s.w / nx, s.h / ny, 40) / 2),
                });
          }
          return spots.map((spot, i) => (
            <circle
              key={`hit-${p.name}-${i}`}
              className="pt"
              data-mark-ref={mk(p.name)}
              cx={spot.cx}
              cy={spot.cy}
              r={spot.r}
              fill="transparent"
              stroke="none"
              tabIndex={i === 0 ? 0 : -1}
              role={i === 0 ? "img" : undefined}
              aria-label={i === 0 ? p.detail : undefined}
              aria-hidden={i === 0 ? undefined : true}
              data-detail={p.detail}
            />
          ));
        })}
        <rect
          className="hit-area"
          x={0}
          y={0}
          width={W}
          height={H}
          fill="transparent"
          pointerEvents="all"
        />
      </svg>,
      <div
        className={isRest ? "overlay part-layer" : "part-layer"}
        aria-hidden="true"
        data-plate={d.id}
        key={`l${d.id}`}
      >
        {!donut &&
          parts.map((p) => {
            const s = d.shapes.get(p.name);
            if (!s || !(p.value > 0) || (mosaic && s.h < H * 0.015))
              return null;
            const fill = fillOf(pic, p);
            return (
              <span
                key={`c-${p.name}`}
                className="cell-box"
                data-fits-its-mark=""
                data-wname={tier(widthOf(cellText(p)))}
                data-wvalue={tier(
                  Math.max(widthOf(cellText(p)), widthOf(p.label)),
                )}
                style={{
                  ...valueRest,
                  color: inkOn(fill),
                  left: `${pct(s.x, W)}%`,
                  top: `${pct(s.y, H)}%`,
                  width: `${pct(s.w, W)}%`,
                  height: `${pct(s.h, H)}%`,
                }}
              >
                <span className="cell-name" data-fits-its-mark="">
                  {cellText(p)}
                </span>
                <span className="cell-value" data-fits-its-mark="">
                  {p.label}
                </span>
              </span>
            );
          })}
        {d.outside.map((o: any) => {
          const p = byName.get(o.name)!;
          return (
            <span
              key={`a-${o.name}`}
              className="arc-label"
              data-fits-its-mark=""
              data-need={o.need}
              data-side={o.right ? "right" : "left"}
              style={{
                ...valueRest,
                color: pic.accent.includes(p.name) ? accentInk : labelInk,
                left: `${pct(o.x, W)}%`,
                top: `${pct(o.y, H)}%`,
                transform: `translate(${o.right ? "8px" : "calc(-100% - 8px)"}, calc(${(-50 - 50 * o.cos).toFixed(2)}% - ${(8 * o.cos).toFixed(2)}px))`,
              }}
            >
              <span data-fits-its-mark="">{p.label}</span>
              <span
                data-fits-its-mark=""
                style={{ ...regs.annot, color: labelInk }}
              >
                {p.display}
              </span>
            </span>
          );
        })}
        {donut ? (
          <span
            className="centre-label end-label"
            style={{
              ...regs.value,
              color: pic.count ? accentInk : labelInk,
              transform: "translate(-50%, -50%)",
            }}
          >
            {pic.count ? pic.count.text : wholeLabel}
          </span>
        ) : null}
      </div>,
    ];
  };

  return (
    <figure
      className="chart-figure"
      style={{
        ["--ground" as string]: ground,
        ["--accent" as string]: accent,
        ["--ink" as string]: ink,
        ["--muted" as string]: muted,
        ["--grid" as string]: grid,
        ...figureVars(regs),
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="chart-header">
        <p
          className="chart-eyebrow"
          style={{ ...regs.eyebrow, margin: "0 0 6px" }}
        >
          {eyebrow}
        </p>
        <h2
          className="chart-title"
          style={{ ...regs.display, margin: "0 0 6px" }}
        >
          {title}
        </h2>
        <p className="chart-caveat" style={{ ...regs.body, margin: 0 }}>
          {caveat}
        </p>
        {restNotes.length ? (
          <p className="chart-rest-notes" style={{ ...regs.body }}>
            {restNotes.map((n, i) => (
              <span key={i}>
                {i ? " · " : ""}
                {n}
              </span>
            ))}
          </p>
        ) : null}
      </div>

      <div className="gesture-controls">
        {controls.map((c, k) => (
          <fieldset className={`chart-gesture-${k + 1}`} key={k}>
            <legend>{c.legend}</legend>
            <div className="options">
              <label>
                <input
                  id={`gesture-${k + 1}-rest`}
                  type="radio"
                  name={`gesture-${k + 1}`}
                  value="rest"
                  aria-label={landingLabel}
                  defaultChecked
                />
                {landingLabel}
              </label>
              <label>
                <input
                  id={`gesture-${k + 1}-on`}
                  type="radio"
                  name={`gesture-${k + 1}`}
                  value="on"
                  aria-label={c.announce}
                />
                {c.chip}
              </label>
            </div>
          </fieldset>
        ))}
      </div>
      <div className="gesture-notes">
        {controls.map((c, k) => (
          <div className={`gesture-${k + 1}-notes`} role="status" key={k}>
            <p
              {...{ [`data-gesture-${k + 1}-note`]: "on" }}
              className="gw-note"
              style={{ ...regs.body, margin: 0 }}
            >
              {c.note}
            </p>
          </div>
        ))}
      </div>

      {unit ? (
        <p
          className="chart-unit"
          style={{ ...regs.axis, margin: "4px 0 2px" }}
        >{`${unit} · ${wholeLabel}`}</p>
      ) : null}
      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: "0px",
          ["--x-axis-h" as string]: `${xAxisRowPx}px`,
          aspectRatio: `${W} / ${H + xAxisRowPx}`,
        }}
      >
        {drawn.flatMap(drawPlate)}
        {mosaic ? (
          <div className="x-axis">
            {columns.map((c, i) => (
              <span
                key={c.k}
                className="axis-label x"
                data-row={String(axisPlaced.get(c.k)?.row ?? i % 2)}
                data-need={axisPlaced.get(c.k)?.need}
                style={{
                  ...regs.axis,
                  ["--cx" as string]: String(c.x + c.w / 2),
                  ["--lw" as string]: String(
                    Math.ceil(
                      Math.max(
                        measure(c.name, axisFont),
                        measure(format(c.total), axisFont),
                      ) * 1.1,
                    ),
                  ),
                }}
              >
                {c.name}
                <br />
                <span style={{ opacity: 0.8 }}>
                  {format(c.total)}
                </span>
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>
        {source}
      </p>
    </figure>
  );
}
