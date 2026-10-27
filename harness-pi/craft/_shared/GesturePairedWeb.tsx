/**
 * The paired family's web page, every type as a variant (`variant`): lollipop, grouped-bar, bullet, diverging-bar,
 * population-pyramid, drawn in ROWS on the adapter's geometry (`layoutPaired`, `./gesture-family-paired.mjs`) — one
 * band per key, names in the left gutter, one value scale from zero (the pyramid: two halves from a spine on one
 * magnitude scale; the diverging bar: a zero inside the plot).
 *
 * ONE PLATE PER STATE, as GestureBarWeb.tsx draws them: plate 0 is the RESTING state (every gesture that can rest,
 * folded), each further gesture owns a plate of its own — resting plus that gesture — revealed by its radio
 * (`:checked` / `:has()`, no script). A pointer is answered by the mark it is over on every plate: each mark carries
 * its own hit point at its own centre (`data-hit="cell"`), never moved by a transform.
 *
 * WHAT EACH CONTROL'S PLATE DRAWS:
 *   compare  a dashed copy of the other length laid over the subject's mark from the same zero; "own / copy" at its end
 *   filter   only the kept keys, at the places they hold on the resting plate (the frame does not move)
 *   reorder  the same keys, names with them, in the order asked for
 *   bracket  (pyramid) the bracketed bands in the accent, a bracket at the plot's right edge, the sum beside it
 *
 * Colours: one accent (the subject, or the highlighted marks), a neutral for every other mark, each at the variant's
 * two tones (SERIES_TONE: pale and full) held to the non-text floor against the ground; furniture (the bullet's track,
 * the zero rules) derived from the ground. Every word is set on the ground. A lollipop's head is drawn in the HTML
 * layer, so the stretched plot never makes it an ellipse.
 */

import {
  adjustToContrast,
  contrast,
  mix,
  NON_TEXT_CONTRAST_MIN,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";
import { figureVars, webRegisters } from "#shared/design-base/web.mjs";
import { skillScriptFrom } from "#shared/design-base/skill-script.mjs";
import { layoutPaired, SERIES_TONE } from "./gesture-family-paired.mjs";

const { controlChromeCss } = await import(
  skillScriptFrom(
    import.meta.dirname,
    "chart-web",
    "assets",
    "control-chrome.ts",
  )
);

export const FRAME = { width: 900, minHeight: 280 };
/** Geometry units a key's band takes, per variant: two marks a band need the height of two figures. */
export const PITCH: Record<string, number> = {
  lollipop: 40,
  "grouped-bar": 40,
  bullet: 30,
  "diverging-bar": 24,
  "population-pyramid": 22,
};

const SCOPE = ".chart-figure";
const LABEL_OFFSET_PX = 6;
const pct = (value: number, extent: number) => (value / extent) * 100;

export type Mark = {
  name: string;
  key: string;
  series?: string;
  j: number;
  value: number;
  label: string;
  detail: string;
};
type State = {
  order: string[];
  emphasis: Record<string, string>;
  stepBack: string[];
  copies: { onto: string; value: number }[];
  brackets: { keys: string[]; marks: string[]; sum: number }[];
  references: { value: number }[];
  notes?: { keys?: string[] }[];
};
export type Control = {
  index: number;
  do: string;
  atom: string;
  legend: string;
  chip: string;
  announce: string;
  note: string;
  state: State;
  totalLabel?: string;
  valueLabel?: string;
};

export function GesturePairedWeb({
  variant,
  keys,
  marks,
  series,
  resting,
  controls,
  domain,
  headroom,
  restLabel,
  restNotes,
  restLine,
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
  format,
}: {
  variant: string;
  keys: { name: string; values: (number | null)[] }[];
  marks: Mark[];
  series: string[];
  resting: State;
  controls: Control[];
  domain: [number, number];
  headroom: number;
  restLabel: string;
  restNotes: string[];
  restLine: string | null;
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
  format: (v: number) => string;
}) {
  ink = ink ?? "#111111";
  const regs = webRegisters(direction, { ink: { ink, muted, accent } });
  const W = FRAME.width;
  const H = Math.max(keys.length * (PITCH[variant] ?? 30), FRAME.minHeight);
  const pyramid = variant === "population-pyramid";
  const byName = new Map(marks.map((m) => [m.name, m]));
  const keyIndex = new Map(keys.map((k, i) => [k.name, i]));

  // ── the inks: one accent, one neutral, each at two tones, every mark at the non-text floor ────────
  const floor = (c: string) =>
    adjustToContrast(c, ground, NON_TEXT_CONTRAST_MIN) ?? c;
  const accentInk =
    contrast(accent, ground) >= TEXT_CONTRAST_MIN
      ? accent
      : (adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink);
  const labelInk = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const ruleInk = mix(ground, ink, 0.75);
  const trackFill = mix(ground, ink, 0.09);
  const tones = SERIES_TONE[variant] ?? [1, 1];
  const toneOf = (base: string, j: number, from: number) =>
    tones[j] >= 1
      ? floor(base)
      : floor(mix(ground, base, Math.max(from, tones[j])));
  const fills = {
    accent: tones.map((_, j) => toneOf(accent, j, 0.55)),
    neutral: tones.map((_, j) =>
      tones[j] >= 1
        ? floor(mix(ground, ink, 0.62))
        : floor(mix(ground, ink, 0.34)),
    ),
  };
  const lift = (fill: string) => {
    const toward = mix(fill, ink, 0.3);
    return contrast(toward, fill) >= 1.12 ? toward : mix(fill, ground, 0.45);
  };
  const fillOf = (state: State, m: Mark, inBracket: boolean) =>
    (state.emphasis[m.name] === "accent" || inBracket
      ? fills.accent
      : fills.neutral)[m.j] ?? fills.neutral[0];
  const isAccent = (state: State, m: Mark) =>
    state.emphasis[m.name] === "accent";

  // The plot frame in geometry units: room after every mark for its figure (headroom); the pyramid keeps room each side.
  const frame = pyramid
    ? { x: W * 0.2, y: 0, width: W * 0.6, height: H, gutter: W * 0.02 }
    : { x: 0, y: 0, width: W / (variant === "bullet" ? headroom * 1.1 : headroom), height: H };
  /** Keys whose marks carry the accent: a whole highlighted series is not a key's emphasis. */
  const accentKeys = (state: State) => new Set(marks.filter((m) => state.emphasis[m.name] === "accent").map((m) => m.key));

  type Label = {
    text: string;
    x: number;
    y: number;
    before?: boolean;
    accent?: boolean;
  };

  const plateOf = (id: number, state: State) => {
    const geo = layoutPaired({
      variant,
      keys,
      marks,
      series,
      state,
      frame,
      domain,
    });
    const gone = new Set(state.stepBack);
    const bracketed = new Set(state.brackets.flatMap((b) => b.marks));
    const shown = marks.filter(
      (m) => geo.marks.has(m.name) && !gone.has(m.key),
    );
    const labels: Label[] = [];
    const dots: { x: number; y: number; fill: string; ring: boolean }[] = [];
    const copied = new Map(state.copies.map((c) => [c.onto, c.value]));
    const fewAccents = accentKeys(state).size <= 3;
    const noted = new Set((state.notes ?? []).flatMap((n) => n.keys ?? []));
    const labelled = (m: Mark) =>
      !pyramid ||
      state.emphasis[m.name] === "ring" ||
      noted.has(m.key) ||
      (state.emphasis[m.name] === "accent" && fewAccents) ||
      bracketed.has(m.name) ||
      copied.has(m.name);
    for (const m of shown) {
      const g = geo.marks.get(m.name)!;
      const y = g.y + g.h / 2;
      if (variant === "bullet") {
        if (m.j !== 1) continue;
        const pair = marks.filter((x) => x.key === m.key);
        labels.push({
          text: m.label,
          x: geo.xOf(domain[1]),
          y,
          accent: isAccent(state, m),
        });
        continue;
      }
      if (!labelled(m)) continue;
      const copy = copied.get(m.name);
      const text =
        copy !== undefined ? `${m.label} / ${format(copy)}` : m.label;
      if (pyramid) {
        const far =
          copy !== undefined
            ? geo.xOf(Math.max(Math.abs(m.value), Math.abs(copy)), g.side)
            : g.tip.x;
        labels.push({
          text,
          x: far,
          y,
          before: g.side < 0,
          accent: isAccent(state, m),
        });
      } else {
        const far =
          copy !== undefined
            ? geo.xOf(Math.max(m.value, copy, 0))
            : geo.xOf(Math.max(m.value, 0));
        labels.push({ text, x: far, y, accent: isAccent(state, m) });
      }
      if (variant === "lollipop")
        dots.push({
          x: g.tip.x,
          y,
          fill: fillOf(state, m, false),
          ring: state.emphasis[m.name] === "ring",
        });
    }
    // A gap is said on its band, never drawn as a zero.
    for (const k of keys) {
      if (gone.has(k.name)) continue;
      const band = geo.bands.get(k.name);
      if (!band) continue;
      k.values.forEach((v, j) => {
        if (v !== null) return;
        const n = k.values.length;
        const y = band.y + band.h * ((j + 0.5) / n);
        labels.push({
          text: "n/a",
          x: pyramid ? geo.spine![j === 0 ? 0 : 1] : geo.xOf(0),
          y,
          before: pyramid && j === 0,
        });
      });
    }
    return { id, state, geo, shown, labels, dots, gone, bracketed, copied };
  };

  const plates = [
    plateOf(0, resting),
    ...controls.map((c, k) => plateOf(k + 1, c.state)),
  ];

  // ── the stylesheet ──────────────────────────────────────────────────────────────────────────────
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
    `${SCOPE} .pw-dot { position: absolute; width: 9px; height: 9px; border-radius: 50%; transform: translate(-50%, -50%); }`,
    `${SCOPE} .chart-legend { display: flex; flex-wrap: wrap; gap: 0 16px; margin: 4px 0 0; }`,
    `${SCOPE} .chart-legend .sw { display: inline-block; width: 12px; height: 10px; margin-right: 6px; vertical-align: baseline; }`,
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

  const nameStyle = (state: State, key: string) => {
    const ms = marks.filter((m) => m.key === key);
    const acc = ms.every((m) => state.emphasis[m.name] === "accent") && accentKeys(state).size < keys.length;
    const ring = ms.some((m) => state.emphasis[m.name] === "ring");
    return {
      ...regs.axis,
      color: acc ? accentInk : (regs.axis.color as string),
      fontWeight: acc || ring ? 700 : regs.axis.fontWeight,
    };
  };

  const drawPlate = (p: ReturnType<typeof plateOf>) => {
    const keyAttr = (name: string) =>
      `p${p.id}-m${marks.findIndex((m) => m.name === name) + 1}`;
    const layerClass = p.id === 0 ? "overlay" : "gesture-layer";
    const geo = p.geo;
    const zeros = pyramid ? geo.spine! : [geo.zero as number];
    const order = p.state.order.filter(
      (k) => !p.gone.has(k) && geo.bands.has(k),
    );
    const rects = p.shown.map((m) => {
      const g = geo.marks.get(m.name)!;
      const fill = fillOf(p.state, m, p.bracketed.has(m.name));
      const stem = variant === "lollipop";
      const h = stem ? Math.max(g.h * 0.16, 1.5) : g.h;
      const y = stem ? g.y + g.h / 2 - h / 2 : g.y;
      return {
        m,
        x: g.x0,
        y,
        w: Math.max(g.x1 - g.x0, 0.01),
        h,
        fill,
        ring: p.state.emphasis[m.name] === "ring",
      };
    });
    const copies = p.state.copies.flatMap((c) => {
      const g = geo.marks.get(c.onto);
      if (!g) return [];
      const side = pyramid ? g.side : 1;
      const a = g.base;
      const b = geo.xOf(c.value, side);
      return [
        {
          x: Math.min(a, b),
          y: g.y + g.h * 0.12,
          w: Math.max(Math.abs(b - a), 0.01),
          h: g.h * 0.76,
        },
      ];
    });
    const brackets = p.state.brackets.map((b) => {
      const ys = b.keys.map((k) => geo.bands.get(k)).filter(Boolean) as {
        y: number;
        h: number;
      }[];
      return {
        y0: Math.min(...ys.map((r) => r.y)) + 2,
        y1: Math.max(...ys.map((r) => r.y + r.h)) - 2,
        sum: b.sum,
      };
    });
    return [
      <div className="y-axis" data-plate={p.id} key={`y${p.id}`}>
        {order.map((k) => {
          const band = geo.bands.get(k)!;
          return (
            <span
              key={k}
              className="axis-label y"
              style={{
                ...nameStyle(p.state, k),
                top: `${pct(band.y + band.h / 2, H)}%`,
              }}
            >
              {k}
            </span>
          );
        })}
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
        {variant === "bullet"
          ? order.map((k) => {
              const band = geo.bands.get(k)!;
              const x0 = geo.xOf(0);
              return (
                <rect
                  key={`track-${k}`}
                  x={x0}
                  y={band.y + band.h * 0.11}
                  width={geo.xOf(domain[1]) - x0}
                  height={band.h * 0.78}
                  fill={trackFill}
                />
              );
            })
          : null}
        {rects.map((r) => (
          <rect
            key={r.m.name}
            data-mark={keyAttr(r.m.name)}
            x={r.x}
            y={r.y}
            width={r.w}
            height={r.h}
            fill={r.fill}
            stroke={r.ring ? labelInk : "none"}
            strokeWidth={r.ring ? 1.5 : 0}
            vectorEffect="non-scaling-stroke"
            style={{ ["--mark-active" as string]: lift(r.fill) }}
          />
        ))}
        {copies.map((c, i) => (
          <rect
            key={`copy${i}`}
            x={c.x}
            y={c.y}
            width={c.w}
            height={c.h}
            fill="none"
            stroke={labelInk}
            strokeWidth={1.5}
            strokeDasharray="4 3"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {zeros.map((x, i) => (
          <line
            key={`zero${i}`}
            x1={x}
            x2={x}
            y1={0}
            y2={H}
            stroke={ruleInk}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {resting.references.flatMap((r, i) =>
          (pyramid
            ? [geo.xOf(r.value, -1), geo.xOf(r.value, 1)]
            : [geo.xOf(r.value)]
          ).map((x, s) => (
            <line
              key={`rule${i}-${s}`}
              x1={x}
              x2={x}
              y1={0}
              y2={H}
              stroke={labelInk}
              strokeWidth={1}
              strokeDasharray="4 3"
              vectorEffect="non-scaling-stroke"
            />
          )),
        )}
        {brackets.map((b, i) => (
          <path
            key={`br${i}`}
            d={`M${W - 14} ${b.y0} L${W - 6} ${b.y0} L${W - 6} ${b.y1} L${W - 14} ${b.y1}`}
            fill="none"
            stroke={accent}
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {p.shown.map((m) => {
          const g = geo.marks.get(m.name)!;
          return (
            <circle
              key={m.name}
              className="pt"
              cx={(g.x0 + g.x1) / 2}
              cy={g.y + g.h / 2}
              r={6}
              fill="transparent"
              stroke="none"
              tabIndex={0}
              role="img"
              data-mark-ref={keyAttr(m.name)}
              aria-label={m.detail}
              data-detail={m.detail}
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
        className={layerClass}
        aria-hidden="true"
        data-plate={p.id}
        key={`l${p.id}`}
      >
        {p.dots.map((d, i) => (
          <span
            key={`d${i}`}
            className="pw-dot"
            style={{
              left: `${pct(d.x, W).toFixed(3)}%`,
              top: `${pct(d.y, H).toFixed(3)}%`,
              background: d.fill,
              outline: d.ring ? `1.5px solid ${labelInk}` : undefined,
            }}
          />
        ))}
        {[
          ...p.labels,
          ...brackets.map((b) => ({
            text: `= ${format(b.sum)}`,
            x: W - 16,
            y: (b.y0 + b.y1) / 2,
            before: true,
            accent: true,
          })),
        ].map((l, i) => (
          <span
            key={i}
            className="end-label"
            style={{
              ...regs.value,
              color: l.accent ? accentInk : labelInk,
              left: `${pct(l.x, W).toFixed(3)}%`,
              top: `${pct(l.y, H).toFixed(3)}%`,
              transform: l.before
                ? `translate(calc(-100% - ${LABEL_OFFSET_PX}px), -50%)`
                : `translate(${LABEL_OFFSET_PX + (variant === "lollipop" ? 4 : 0)}px, -50%)`,
            }}
          >
            {l.text}
          </span>
        ))}
      </div>,
    ];
  };

  const legend =
    series.length === 2 ? (
      <p className="chart-legend" style={{ ...regs.body }}>
        {series.map((s, j) => (
          <span key={s}>
            <span className="sw" style={{
                background: marks.filter((m) => m.j === j).every((m) => resting.emphasis[m.name] === "accent") ? fills.accent[j] : fills.neutral[j],
              }} />
            {pyramid ? (j === 0 ? `< ${s}` : `${s} >`) : s}
          </span>
        ))}
      </p>
    ) : null;

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
        {legend}
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
      {restLine ? (
        <p
          className="chart-reading"
          style={{ ...regs.body, margin: "6px 0 0" }}
        >
          {restLine}
        </p>
      ) : null}
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>
        {source}
      </p>
    </figure>
  );
}
