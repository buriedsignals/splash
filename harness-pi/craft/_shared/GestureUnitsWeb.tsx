/**
 * A Units-family beat (histogram or pictogram, prop `variant`) whose staging is the story's own `gestures`, delivered
 * as an interactive page. One row per group of the beat's fixed partition: the group's name in the left gutter, its
 * mark — a histogram's bar, its length the count; a pictogram's squares, one per counted thing, one size for every
 * block — and its count written after it.
 *
 * ONE PLATE PER STATE, as `GestureBarWeb.tsx` draws them (the reason is `reorder.ts`'s: a pointer is resolved off hit
 * points read once, which a transform never moves). The page the reader lands on is the RESTING plate (every gesture
 * that can rest together, as the still draws them); each further gesture owns one plate of its own — the resting
 * picture plus that gesture — revealed by its radio (`:checked` / `:has()`, no script):
 *   bracket  the bracketed groups' units gather onto the first group's row; the sum at its end.
 *   compare  a copy of the other count laid in the subject's row, from the same baseline (dashed bar / hollow squares).
 *   filter   only the kept groups, at the places they hold on the resting plate.
 * Every plate shares one count scale (one cell size), whose top holds the longest any control lays.
 *
 * Colours: one accent, one neutral at the non-text floor, the pointer's step toward the ink measured.
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
import { layoutRows } from "./gesture-family-units.mjs";
const { controlChromeCss } = await import(
  skillScriptFrom(
    import.meta.dirname,
    "chart-web",
    "assets",
    "control-chrome.ts",
  )
);

export const FRAME = { width: 900, minHeight: 280, pitch: 30 };
const SCOPE = ".chart-figure";
const MARK_ACTIVE_STEP = 0.3;
const LABEL_OFFSET_PX = 6;

export type WebGroup = {
  name: string;
  count: number;
  label: string;
  detail: string;
};
export type WebControl = {
  index: number;
  do: string;
  atom: string;
  legend: string;
  chip: string;
  announce: string;
  note: string;
  base?: string;
  gathered?: string[];
  total?: number;
  totalLabel?: string;
  subject?: string;
  value?: number;
  valueLabel?: string;
  kept?: string[];
};

type Shape = {
  key: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  hollow?: boolean;
  ring?: boolean;
};
type Label = { text: string; x: number; y: number; accent?: boolean };
const pct = (v: number, extent: number) => (v / extent) * 100;

export function GestureUnitsWeb({
  variant,
  groups,
  resting,
  controls,
  laid,
  restLabel,
  restNotes,
  gutterPx,
  wrapNames,
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
}: {
  variant: "histogram" | "pictogram-isotype";
  groups: WebGroup[];
  resting: {
    accent: string[];
    rings: string[];
    references: { at: number; between: [number, number] }[];
  };
  controls: WebControl[];
  laid: number[];
  restLabel: string;
  restNotes: string[];
  gutterPx: number;
  wrapNames: boolean;
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
}) {
  const regs = webRegisters(direction, { ink: { ink, muted, accent } });
  const W = FRAME.width;
  const H = Math.max(groups.length * FRAME.pitch, FRAME.minHeight);
  const names = groups.map((g) => g.name);
  const countOf = new Map(groups.map((g) => [g.name, g.count]));
  const keyOf = new Map(groups.map((g, i) => [g.name, `g${i + 1}`]));
  // Room after the longest mark for its figure: the geometry stops short of the plot's end.
  const geo = layoutRows({
    groups: groups as any,
    variant,
    box: { x: 0, y: 0, width: W * 0.86, height: H },
    gutter: 0,
    laid,
  });
  const rowOf = (name: string) => geo.rows[names.indexOf(name)];

  assertLegible(accent, ground, {
    role: "mark",
    where: `${direction.id ?? "this direction"}'s accent`,
  });
  const accentInk =
    contrast(accent, ground) >= TEXT_CONTRAST_MIN
      ? accent
      : (adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink);
  let neutral = mix(ground, ink, 0.42);
  neutral = adjustToContrast(neutral, ground, NON_TEXT_CONTRAST_MIN) ?? neutral;
  const labelInk = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const ruleInk = mix(ground, ink, 0.75);
  const activeFor = new Map(
    [accent, neutral].map((fill) => [fill, mix(fill, ink, MARK_ACTIVE_STEP)]),
  );
  const accentSet = new Set(resting.accent);
  const ringSet = new Set(resting.rings);
  const fillOf = (name: string) => (accentSet.has(name) ? accent : neutral);

  /** The shapes a run of `n` units draws in a row, starting after `from` units already there. */
  const unitsIn = (
    name: string,
    row: (typeof geo.rows)[number],
    from: number,
    n: number,
    fill: string,
    extra: Partial<Shape> = {},
  ): Shape[] => {
    if (variant === "histogram") {
      const a = row.end(from);
      const b = row.end(from + n);
      return n > 0
        ? [
            {
              key: name,
              x: a,
              y: row.top,
              w: b - a,
              h: row.band,
              fill,
              ...extra,
            },
          ]
        : [];
    }
    return Array.from({ length: n }, (_, k) => {
      const c = row.cellAt(from + k);
      return {
        key: name,
        x: c.x + c.size * 0.07,
        y: c.y + c.size * 0.07,
        w: c.size * 0.86,
        h: c.size * 0.86,
        fill,
        ...extra,
      };
    });
  };
  const middleOf = (
    row: (typeof geo.rows)[number],
    from: number,
    n: number,
  ) => {
    if (variant === "histogram")
      return { cx: (row.end(from) + row.end(from + n)) / 2 || 4, cy: row.mid };
    const c = row.cellAt(from + Math.max(0, Math.floor((n - 1) / 2)));
    return { cx: c.x + c.size / 2, cy: c.y + c.size / 2 };
  };
  const endOf = (row: (typeof geo.rows)[number], n: number) =>
    variant === "histogram" ? row.end(n) : row.end(Math.min(n, geo.perLine));

  type Plate = {
    id: number;
    named: string[];
    shapes: Shape[];
    labels: Label[];
    rules: number[];
    hitAt: Map<string, { cx: number; cy: number }>;
  };
  function restPlate(id: number, keep: string[] | null = null): Plate {
    const shown = names.filter((n) => !keep || keep.includes(n));
    const shapes: Shape[] = [];
    const labels: Label[] = [];
    const hitAt = new Map<string, { cx: number; cy: number }>();
    for (const n of shown) {
      const row = rowOf(n);
      const c = countOf.get(n)!;
      shapes.push(
        ...unitsIn(n, row, 0, c, fillOf(n), { ring: ringSet.has(n) }),
      );
      labels.push({
        text: groups[names.indexOf(n)].label,
        x: endOf(row, c),
        y: row.mid,
        accent: accentSet.has(n),
      });
      hitAt.set(n, middleOf(row, 0, c));
    }
    const rules = resting.references.map((r) => {
      const a = geo.rows[r.between[0]];
      const b = geo.rows[r.between[1]];
      return (a.top + a.band + b.top) / 2;
    });
    return { id, named: shown, shapes, labels, rules, hitAt };
  }

  const plates: Plate[] = [restPlate(0)];
  controls.forEach((c, k) => {
    const id = k + 1;
    if (c.do === "bracket") {
      const p = restPlate(id);
      const moved = new Set(c.gathered);
      p.shapes = p.shapes.filter((s) => !moved.has(s.key));
      p.labels = p.labels.filter(
        (l) =>
          l.y !== rowOf(c.base!).mid &&
          !c.gathered!.some((m) => rowOf(m).mid === l.y),
      );
      const row = rowOf(c.base!);
      let run = countOf.get(c.base!)!;
      for (const m of c.gathered!) {
        const v = countOf.get(m)!;
        p.shapes.push(...unitsIn(m, row, run, v, fillOf(m)));
        p.hitAt.set(m, middleOf(row, run, v));
        run += v;
      }
      p.labels.push({
        text: c.totalLabel!,
        x: endOf(row, run),
        y: row.mid,
        accent: true,
      });
      plates.push(p);
    } else if (c.do === "compare") {
      const p = restPlate(id);
      const row = rowOf(c.subject!);
      if (variant === "histogram") {
        p.shapes = p.shapes.map((s) =>
          s.key === c.subject ? { ...s, h: row.band * 0.5 } : s,
        );
        p.shapes.push({
          key: c.subject!,
          x: row.end(0),
          y: row.top + row.band * 0.55,
          w: row.end(c.value!) - row.end(0),
          h: row.band * 0.45,
          fill: mix(ground, ink, 0.18),
          hollow: true,
        });
      } else
        p.shapes.push(
          ...unitsIn(c.subject!, row, 0, c.value!, "none", { hollow: true }),
        );
      p.labels = p.labels.filter((l) => l.y !== row.mid);
      p.labels.push({
        text: `${groups[names.indexOf(c.subject!)].label} / ${c.valueLabel}`,
        x: Math.max(endOf(row, countOf.get(c.subject!)!), endOf(row, c.value!)),
        y: row.mid,
        accent: accentSet.has(c.subject!),
      });
      plates.push(p);
    } else plates.push(restPlate(id, c.kept ?? null));
  });

  const plateCss = [
    `${SCOPE} [data-plate]:not([data-plate="0"]) { display: none; }`,
    `${SCOPE} .chart-plot { --y-gutter: ${gutterPx}px; }`,
    `${SCOPE} .chart-plot .gesture-layer { position: relative; pointer-events: none; }`,
    `${SCOPE} .gesture-controls { flex: 0 0 auto; display: flex; flex-wrap: wrap; align-items: center; gap: 0 28px; margin-top: 4px; }`,
    `${SCOPE} .gesture-controls > fieldset { flex: 0 1 auto; max-width: 100%; }`,
    `${SCOPE} .gesture-notes { flex: 0 0 auto; display: grid; }`,
    `${SCOPE} .gesture-notes > div { grid-area: 1 / 1; align-self: start; }`,
    `${SCOPE} .gw-note { visibility: hidden; }`,
    `${SCOPE} .chart-rest-notes { margin: 4px 0 0; }`,
    ...(wrapNames
      ? [
          `${SCOPE} .chart-plot .axis-label.y { white-space: normal; width: ${gutterPx - 14}px; text-align: right; line-height: 1.1; }`,
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

  const drawPlate = (p: Plate) => {
    const key = (name: string) => `p${p.id}-${keyOf.get(name)}`;
    return [
      <div className="y-axis" data-plate={p.id} key={`y${p.id}`}>
        {p.named.map((n) => (
          <span
            key={n}
            className="axis-label y"
            style={{
              ...regs.axis,
              color: accentSet.has(n) ? accentInk : (regs.axis.color as string),
              fontWeight:
                accentSet.has(n) || ringSet.has(n) ? 700 : regs.axis.fontWeight,
              top: `${pct(rowOf(n).mid, H)}%`,
            }}
          >
            {n}
          </span>
        ))}
      </div>,
      <svg
        key={`s${p.id}`}
        role="group"
        aria-label={title}
        xmlns="http://www.w3.org/2000/svg"
        className="chart"
        data-hit="cell"
        data-plate={p.id}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
      >
        <desc>{alt}</desc>
        <rect x={0} y={0} width={W} height={H} fill={ground} />
        {p.shapes.map((s, i) => (
          <rect
            key={`${s.key}-${i}`}
            data-mark={s.hollow ? undefined : key(s.key)}
            x={s.x}
            y={s.y}
            width={Math.max(s.w, 0.01)}
            height={s.h}
            fill={s.fill}
            stroke={s.hollow ? labelInk : s.ring ? accentInk : "none"}
            strokeWidth={s.hollow || s.ring ? 1.4 : 0}
            strokeDasharray={
              s.hollow && variant === "histogram" ? "3 2" : undefined
            }
            vectorEffect="non-scaling-stroke"
            style={
              s.hollow
                ? undefined
                : { ["--mark-active" as string]: activeFor.get(s.fill) }
            }
          />
        ))}
        <line
          x1={0}
          x2={0}
          y1={0}
          y2={H}
          stroke={ruleInk}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
        {p.rules.map((y, i) => (
          <line
            key={`rule${i}`}
            x1={0}
            x2={W}
            y1={y}
            y2={y}
            stroke={accentInk}
            strokeWidth={1.2}
            strokeDasharray="5 3"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {p.named.map((n) => {
          const g = groups[names.indexOf(n)];
          const at = p.hitAt.get(n) ?? { cx: 4, cy: rowOf(n).mid };
          return (
            <circle
              key={n}
              className="pt"
              cx={at.cx}
              cy={at.cy}
              r={6}
              fill="transparent"
              stroke="none"
              tabIndex={0}
              role="img"
              data-mark-ref={key(n)}
              aria-label={g.detail}
              data-detail={g.detail}
            />
          );
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
        className={p.id === 0 ? "overlay" : "gesture-layer"}
        aria-hidden="true"
        data-plate={p.id}
        key={`l${p.id}`}
      >
        {p.labels.map((l, i) => (
          <span
            key={i}
            className="end-label"
            style={{
              ...regs.value,
              color: l.accent ? accentInk : labelInk,
              left: `${pct(l.x, W).toFixed(3)}%`,
              top: `${pct(l.y, H).toFixed(3)}%`,
              transform: `translate(${LABEL_OFFSET_PX}px, -50%)`,
            }}
          >
            {l.text}
          </span>
        ))}
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
      <style dangerouslySetInnerHTML={{ __html: plateCss }} />
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
                  aria-label={restLabel}
                  defaultChecked
                />
                {restLabel}
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
        <p className="chart-unit" style={{ ...regs.axis, margin: "4px 0 2px" }}>
          {unit}
        </p>
      ) : null}
      <div
        className="chart-plot"
        style={{
          ["--x-axis-h" as string]: "0px",
          aspectRatio: `${W + gutterPx} / ${H}`,
        }}
      >
        {plates.flatMap(drawPlate)}
      </div>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>
        {source}
      </p>
    </figure>
  );
}
