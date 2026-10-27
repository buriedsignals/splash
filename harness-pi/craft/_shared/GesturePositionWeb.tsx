/**
 * The Position family delivered as an interactive page (dumbbell, slope, dot strip, beeswarm, box plot as variants).
 *
 * ONE PLATE PER STATE, as the bar gesture page draws them: the page the reader lands on is the RESTING plate — every
 * gesture that can rest together drawn at once — and each further gesture owns one plate of its own (the resting
 * picture plus that gesture), drawn whole at build time and revealed by its radio (`:checked` / `:has()`, no script).
 * A plate per state because `interaction.mjs` resolves a pointer off the hit points' `cx`/`cy` read once at init. Under
 * JavaScript off nothing differs: the radios and the stylesheet are the whole mechanism.
 *
 * Every plate is the family's scene (`sceneOf`) of its state: marks at their value on one fitted axis, the subject in
 * the accent, a ring on a row a gesture names. Words are HTML laid over the stretched plot (type stays a fixed CSS
 * size): a dumbbell's names in the page's own gutter, the marked rows' labels and the axis ticks over the plot; a
 * gesture's words in the header (resting) or under its control.
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
import { sceneOf } from "./gesture-family-position.mjs";

const { controlChromeCss } = await import(
  skillScriptFrom(
    import.meta.dirname,
    "chart-web",
    "assets",
    "control-chrome.ts",
  )
);

export const WEB_FRAME = { width: 900, pitch: 30, minHeight: 300, height: 380 };
const SCOPE = ".chart-figure";
const MARK_ACTIVE_STEP = 0.3;

const pct = (v: number, extent: number) => (v / extent) * 100;

export type WebControl = {
  index: number;
  do: string;
  atom: string;
  legend: string;
  chip: string;
  announce: string;
  note: string;
  state: any;
};

export function GesturePositionWeb({
  variant,
  model,
  resting,
  controls,
  details,
  restLabel,
  restNotes,
  restLine,
  gutterPx,
  title,
  eyebrow,
  caveat,
  source,
  unit,
  alt,
  text,
  direction,
  ground,
  accent,
  ink,
  muted,
  grid,
}: {
  variant: string;
  model: any;
  resting: any;
  controls: WebControl[];
  details: Record<string, string>;
  restLabel: string;
  restNotes: string[];
  restLine: string | null;
  gutterPx: number;
  title: string;
  eyebrow: string;
  caveat: string;
  source: string;
  unit: string;
  alt: string;
  text: any;
  direction: any;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
}) {
  const regs = webRegisters(direction, { ink: { ink, muted, accent } });
  const W = WEB_FRAME.width;
  const H =
    variant === "dumbbell-range-plot"
      ? Math.max(model.rows.length * WEB_FRAME.pitch + 40, WEB_FRAME.minHeight)
      : WEB_FRAME.height;
  assertLegible(accent, ground, {
    role: "mark",
    where: `${direction.id ?? "this direction"}'s accent`,
  });
  const accentInk =
    contrast(accent, ground) >= TEXT_CONTRAST_MIN
      ? accent
      : (adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink);
  const neutral =
    adjustToContrast(mix(ground, ink, 0.42), ground, NON_TEXT_CONTRAST_MIN) ??
    mix(ground, ink, 0.5);
  const colours: Record<string, string> = {
    ground,
    accent,
    ink,
    muted,
    neutral,
    early: ground,
    copy:
      adjustToContrast(mix(ground, ink, 0.7), ground, NON_TEXT_CONTRAST_MIN) ??
      ink,
    rule: mix(ground, ink, 0.55),
    grid: mix(ground, ink, 0.12),
  };
  const labelInk = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const mutedInk = adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? muted;
  const activeOf = (fill: string) => mix(fill, ink, MARK_ACTIVE_STEP);
  const keyOf = new Map(
    model.rows.map((r: any, i: number) => [r.name, `r${i + 1}`]),
  );
  const names: string[] = model.rows.map((r: any) => r.name);

  const states = [resting, ...controls.map((c) => c.state)];
  const plates = states.map((state, id) => {
    const scene = sceneOf({
      model,
      state,
      frame: { x: 0, y: 0, width: W, height: H },
      text: { ...text, web: true, namesOutside: variant === "dumbbell-range-plot" },
    });
    return { id, state, scene };
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
    `${SCOPE} .chart-plot .axis-label.y { white-space: nowrap; }`,
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

  // The words a plate lays over its plot: ticks, the moments' key, and the labels of rows a gesture marks.
  const overlayText = (p: any) =>
    p.kind === "text" && p.o > 0.001 && !p.id.startsWith("note-");
  const regOf = (reg: string) =>
    reg === "value" ? regs.value : reg === "annot" ? regs.annot : regs.axis;
  const inkOf = (role: string) =>
    role === "accent" ? accentInk : role === "ink" ? labelInk : mutedInk;

  const drawPlate = ({ id, state, scene }: any) => {
    const key = (name: string) => `p${id}-${keyOf.get(name)}`;
    const layerClass = id === 0 ? "overlay" : "gesture-layer";
    const marks = scene.prims.filter(
      (p: any) => p.kind !== "text" && p.o > 0.001,
    );
    // The mark a row's key names: its link (dumbbell, slope, dot strip), else its point or its box.
    const markOf = new Map<string, string>();
    for (const p of marks) {
      const m = p.id.match(/^(link|p1|box)-(.+)$/);
      if (m && !markOf.has(m[2])) markOf.set(m[2], p.id);
    }
    const shownNames = names.filter((n) => !state.hidden.includes(n));
    const yOfRow = (n: string) => scene.anchors.get(n)?.rowY ?? H / 2;
    return [
      <div className="y-axis" data-plate={id} key={`y${id}`}>
        {variant === "dumbbell-range-plot"
          ? shownNames.map((n) => {
              const strong =
                state.accent.includes(n) || state.rings.includes(n);
              return (
                <span
                  key={n}
                  className="axis-label y"
                  style={{
                    ...regs.axis,
                    color: state.accent.includes(n)
                      ? accentInk
                      : (regs.axis.color as string),
                    fontWeight: strong ? 700 : regs.axis.fontWeight,
                    top: `${pct(yOfRow(n), H)}%`,
                  }}
                >
                  {n}
                </span>
              );
            })
          : null}
      </div>,
      <svg
        key={`s${id}`}
        role="group"
        aria-label={title}
        xmlns="http://www.w3.org/2000/svg"
        className="chart"
        data-hit="cell"
        data-plate={id}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
      >
        <desc>{alt}</desc>
        <rect x={0} y={0} width={W} height={H} fill={ground} />
        {marks.map((p: any) => {
          const row = p.id.match(
            /^(?:link|p0|p1|box|whisker|median|ring|copy\w*|leader|pt)-(.+?)(?:-\d+)?$/,
          )?.[1];
          const isMark = row && markOf.get(row) === p.id;
          const common = {
            opacity: p.o,
            vectorEffect: "non-scaling-stroke" as any,
            ...(isMark ? { "data-mark": key(row!) } : {}),
          };
          const fill = colours[p.role] ?? ink;
          if (p.kind === "line")
            return (
              <line
                key={p.id}
                {...common}
                x1={p.x1}
                y1={p.y1}
                x2={p.x2}
                y2={p.y2}
                stroke={fill}
                strokeWidth={p.w ?? 1}
                strokeDasharray={p.dash ? "5 4" : undefined}
                strokeLinecap="round"
                style={
                  isMark
                    ? { ["--mark-active" as string]: activeOf(fill) }
                    : undefined
                }
              />
            );
          if (p.kind === "circle") {
            if (p.stroke)
              return (
                <circle
                  key={p.id}
                {...common}
                  cx={p.cx}
                  cy={p.cy}
                  r={p.r}
                  fill="none"
                  stroke={labelInk}
                  strokeWidth={1.2}
                />
              );
            if (p.role === "early" || p.hollow)
              return (
                <circle
                  key={p.id}
                {...common}
                  cx={p.cx}
                  cy={p.cy}
                  r={p.r}
                  fill={ground}
                  stroke={colours[p.ring ?? p.role] ?? neutral}
                  strokeWidth={1.6}
                />
              );
            return (
              <circle
                key={p.id}
                {...common}
                cx={p.cx}
                cy={p.cy}
                r={p.r}
                fill={fill}
                stroke="none"
                strokeWidth={p.edge ? 0.6 : 0}
                style={
                  isMark
                    ? { ["--mark-active" as string]: activeOf(fill) }
                    : undefined
                }
              />
            );
          }
          if (p.kind === "rect") {
            if (p.stroke)
              return (
                <rect
                  key={p.id}
                {...common}
                  x={p.x}
                  y={p.y}
                  width={Math.max(0, p.width)}
                  height={Math.max(0, p.height)}
                  fill="none"
                  stroke={labelInk}
                  strokeWidth={1.2}
                />
              );
            return (
              <rect
                key={p.id}
                {...common}
                x={p.x}
                y={p.y}
                width={Math.max(0.5, p.width)}
                height={Math.max(0.5, p.height)}
                fill={fill}
                style={
                  isMark
                    ? { ["--mark-active" as string]: activeOf(fill) }
                    : undefined
                }
              />
            );
          }
          return null;
        })}
        {shownNames.map((n) => {
          const a = scene.anchors.get(n);
          if (!a) return null;
          return (
            <circle
              key={`pt-${n}`}
              className="pt"
              cx={a.x}
              cy={a.y}
              r={6}
              fill="transparent"
              stroke="none"
              tabIndex={0}
              role="img"
              data-mark-ref={key(n)}
              aria-label={details[n]}
              data-detail={details[n]}
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
        data-plate={id}
        key={`l${id}`}
      >
        {scene.prims.filter(overlayText).map((p: any) => (
          <span
            key={p.id}
            className="end-label"
            style={{
              ...regOf(p.reg),
              color: inkOf(p.role),
              fontWeight: p.bold ? 700 : (regOf(p.reg).fontWeight as any),
              whiteSpace: "nowrap",
              left: `${pct(p.x, W).toFixed(3)}%`,
              top: `${pct(p.y, H).toFixed(3)}%`,
              transform:
                p.anchor === "middle"
                  ? "translate(-50%, -50%)"
                  : p.anchor === "end"
                    ? "translate(-100%, -50%)"
                    : "translate(0, -50%)",
            }}
          >
            {p.text}
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
