/**
 * An XY beat (scatter, bubbles or connected scatter) whose staging is the story's own `gestures`, delivered as an
 * interactive page. Forked from the per-type web pages (`web/scatter-and-bubble/DirectedScatterWeb.tsx`,
 * `web/connected-scatter/DirectedConnectedScatterWeb.tsx`): two fitted axes, the y gutter and the x axis row of the
 * shared chart-web stylesheet, every point a `.pt` that answers a pointer, tap or key with its own two values
 * (ask-a-mark), the hit resolved by cell (`data-hit="cell"`).
 *
 * ONE PLATE PER STATE, as the bar gesture page draws them: the RESTING plate (every resting gesture at once) and, per
 * further gesture, a plate of the resting picture plus that gesture, revealed by its radio (`:checked` / `:has()`, no
 * script). A plate per state rather than one plate moved by transforms: `interaction.mjs` reads the hit points' cx/cy
 * once at init, which a transform never changes. Under JavaScript off nothing differs.
 *
 * WHAT EACH CONTROL'S PLATE DRAWS: compare — both points ringed, the two legs between them; filter — only the kept
 * points, where they stood; zoom — the plot on the zoomed window, its ticks redrawn, the factor in the chip; trace —
 * the path in ink, each step's key written.
 *
 * Colours: one accent (the subject's mark, its whole path; with no subject, the argument's rule), one neutral at the
 * non-text floor, rings in ink. Every word is set on the ground.
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
import { ticksOf } from "./gesture-family-xy.mjs";

const { controlChromeCss } = await import(
  skillScriptFrom(
    import.meta.dirname,
    "chart-web",
    "assets",
    "control-chrome.ts",
  )
);

export const FRAME = { width: 880, height: 440, xAxisRowPx: 30, gutterPx: 44 };
const SCOPE = ".chart-figure";
const R = 4;
const R_MAX = 20;
const R_FLOOR = 2;

const pct = (v: number, extent: number) => (v / extent) * 100;

export function GestureXYWeb({
  variant,
  xy,
  scheduled,
  details,
  format,
  xFormat,
  xTick,
  xName,
  yName,
  restLabel,
  restNotes,
  restLine,
  title,
  eyebrow,
  caveat,
  source,
  alt,
  direction,
  ground,
  accent,
  ink,
  muted,
  grid,
}: {
  variant: string;
  xy: any;
  scheduled: any;
  details: Record<string, string>;
  format: (v: number) => string;
  xFormat: (v: number) => string;
  xTick: (v: number) => string;
  xName: string;
  yName: string;
  restLabel: string;
  restNotes: string[];
  restLine: string | null;
  title: string;
  eyebrow: string;
  caveat: string;
  source: string;
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
  const H = FRAME.height;
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
  const marks: any[] = xy.marks;
  const keyOf = new Map(marks.map((m, i) => [m.name, `m${i + 1}`]));
  const labelOf = (n: string) => xy.byName.get(n).series ?? n;
  const sized =
    variant === "scatter-and-bubble" &&
    marks.every((m) => m.size !== undefined);
  const maxSize = sized ? Math.max(...marks.map((m) => m.size)) : 1;
  const radius = (m: any) =>
    sized ? Math.max(R_FLOOR, R_MAX * Math.sqrt(m.size / maxSize)) : R;
  const hollow = (m: any) =>
    sized && R_MAX * Math.sqrt(m.size / maxSize) < R_FLOOR;
  const ruleAccent = scheduled.accentMark === null;

  type Plate = { id: number; picture: any; control: any | null };
  const plates: Plate[] = [
    { id: 0, picture: scheduled.resting, control: null },
    ...scheduled.controls.map((c: any, k: number) => ({
      id: k + 1,
      picture: c.picture,
      control: c,
    })),
  ];
  const restingNotes = new Set(scheduled.restingIdx);

  const drawPlate = (p: Plate) => {
    const pic = p.picture;
    const dom = pic.dom;
    const U = (n: string) => xy.u(xy.byName.get(n).x, dom) * W;
    const V = (n: string) => (1 - xy.v(xy.byName.get(n).value, dom)) * H;
    const inside = (n: string) => {
      const u = xy.u(xy.byName.get(n).x, dom);
      const v = xy.v(xy.byName.get(n).value, dom);
      return u >= -0.001 && u <= 1.001 && v >= -0.001 && v <= 1.001;
    };
    const kept =
      p.control?.do === "filter"
        ? new Set(
            p.control.picture.back
              ? marks
                  .filter((m) => !((pic.back.get(m.name) ?? 0) > 0.5))
                  .map((m) => m.name)
              : [],
          )
        : null;
    const shown = marks.filter(
      (m) => inside(m.name) && (!kept || kept.has(m.name)),
    );
    const isAccent = (n: string) => (pic.accent.get(n) ?? 0) > 0.5;
    const isRing = (n: string) =>
      (pic.ring.get(n) ?? 0) > 0.5 ||
      (p.control?.do === "compare" &&
        (n === p.control.picture.compares.at(-1)?.a ||
          n === p.control.picture.compares.at(-1)?.b));
    const faded = (n: string) => !kept && (pic.back.get(n) ?? 0) > 0.5;
    const ticks = ticksOf(xy, dom);
    const tx = ticks.x.filter(
      (t: number) => xy.u(t, dom) >= 0 && xy.u(t, dom) <= 1,
    );
    const ty = ticks.y.filter(
      (t: number) => xy.v(t, dom) >= 0 && xy.v(t, dom) <= 1,
    );
    const key = (n: string) => `p${p.id}-${keyOf.get(n)}`;
    const traced = new Set(pic.traced.map((t: any) => t.series));
    const paths =
      variant === "connected-scatter" ? [...xy.paths.entries()] : [];
    const layerClass = p.id === 0 ? "overlay" : "gesture-layer";

    // Labels: every note the resting gestures write on a mark, and the names of accented or ringed marks.
    const labels: { text: string; u: number; v: number; accent: boolean }[] =
      [];
    const named = new Set<string>();
    // A note's words are written in the header (a phone's plot holds no sentence); the plot names its mark.
    for (const n of pic.notes) {
      if (!restingNotes.has(n.k) || !n.mark) continue;
      const head = xy.pathOf(n.mark).at(-1);
      if (named.has(head) || !shown.some((m) => m.name === head)) continue;
      labels.push({ text: labelOf(head), u: U(head), v: V(head), accent: isAccent(head) });
      named.add(head);
    }
    for (const m of shown) {
      const head = xy.pathOf(m.name).at(-1);
      if (
        m.name !== head ||
        named.has(head) ||
        !(isAccent(m.name) || isRing(m.name))
      )
        continue;
      labels.push({
        text: labelOf(m.name),
        u: U(m.name),
        v: V(m.name),
        accent: isAccent(m.name),
      });
    }
    if (p.control?.do === "trace")
      for (const s of traced) {
        const names = xy.paths.get(s);
        for (const n of [names[0], names.at(-1)])
          labels.push({
            text: String(xy.byName.get(n).key),
            u: U(n),
            v: V(n) + 16,
            accent: false,
          });
      }
    const ruleLabels = pic.rules
      // A rule is named by its value on the plot; its note is written in the header (it never fits a phone's plot).
      .filter((r: any, i: number, all: any[]) => all.findIndex((q: any) => q.axis === r.axis && q.value === r.value) === i)
      .map((r: any) => ({ r, text: r.axis === "x" ? xTick(r.value) : format(r.value) }));

    return [
      <div
        className="y-axis"
        data-plate={p.id}
        key={`y${p.id}`}
        style={{ pointerEvents: "none" }}
      >
        {ruleLabels
          .filter(({ r }: any) => r.axis === "y")
          .map(({ r, text }: any, i: number) => (
            <span key={`ry${i}`} className="axis-label y" style={{ ...regs.axis, top: `${pct((1 - xy.v(r.value, dom)) * H, H)}%`, color: ruleAccent ? accentInk : labelInk, fontWeight: 700 }}>
              {text}
            </span>
          ))}
        {ty.filter((t: number) => !ruleLabels.some(({ r }: any) => r.axis === "y" && Math.abs(xy.v(t, dom) - xy.v(r.value, dom)) < 0.05)).map((t: number) => (
          <span
            key={t}
            className="axis-label y"
            style={{ ...regs.axis, top: `${pct((1 - xy.v(t, dom)) * H, H)}%` }}
          >
            {format(t)}
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
        {ty.map((t: number) => (
          <line
            key={`h${t}`}
            x1={0}
            x2={W}
            y1={(1 - xy.v(t, dom)) * H}
            y2={(1 - xy.v(t, dom)) * H}
            stroke={grid}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {tx.map((t: number) => (
          <line
            key={`v${t}`}
            x1={xy.u(t, dom) * W}
            x2={xy.u(t, dom) * W}
            y1={0}
            y2={H}
            stroke={grid}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {pic.rules.map((r: any, i: number) =>
          r.axis === "x" ? (
            <line
              key={`r${i}`}
              x1={xy.u(r.value, dom) * W}
              x2={xy.u(r.value, dom) * W}
              y1={0}
              y2={H}
              stroke={ruleAccent ? accentInk : labelInk}
              strokeWidth={1.6}
              strokeDasharray="5 4"
              vectorEffect="non-scaling-stroke"
            />
          ) : (
            <line
              key={`r${i}`}
              x1={0}
              x2={W}
              y1={(1 - xy.v(r.value, dom)) * H}
              y2={(1 - xy.v(r.value, dom)) * H}
              stroke={ruleAccent ? accentInk : labelInk}
              strokeWidth={1.6}
              strokeDasharray="5 4"
              vectorEffect="non-scaling-stroke"
            />
          ),
        )}
        {paths.map(([series, names]: [string, string[]]) => {
          const head = names.at(-1)!;
          if (!shown.some((m) => m.name === head)) return null;
          const on = isAccent(head);
          const ink_ = on ? accent : traced.has(series) ? labelInk : neutral;
          return (
            <polyline
              key={`path-${series}`}
              points={names
                .filter(inside)
                .map((n) => `${U(n)},${V(n)}`)
                .join(" ")}
              fill="none"
              stroke={ink_}
              strokeOpacity={faded(head) ? 0.25 : 1}
              strokeWidth={on || traced.has(series) ? 2.4 : 1.2}
              strokeDasharray={on || traced.has(series) ? undefined : "3 3"}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
        {pic.compares.map((c: any) =>
          shown.some((m) => m.name === c.a) &&
          shown.some((m) => m.name === c.b) ? (
            <g key={`c${c.k}`}>
              <line
                x1={U(c.a)}
                x2={U(c.b)}
                y1={V(c.a)}
                y2={V(c.a)}
                stroke={labelInk}
                strokeWidth={1.2}
                strokeDasharray="2 3"
                vectorEffect="non-scaling-stroke"
              />
              <line
                x1={U(c.b)}
                x2={U(c.b)}
                y1={V(c.a)}
                y2={V(c.b)}
                stroke={labelInk}
                strokeWidth={1.2}
                strokeDasharray="2 3"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          ) : null,
        )}
        {shown
          .slice()
          .sort(
            (a, b) =>
              Number(isAccent(a.name)) - Number(isAccent(b.name)) ||
              (b.size ?? 0) - (a.size ?? 0),
          )
          .map((m) => {
            const head = xy.pathOf(m.name).at(-1) === m.name;
            const start = variant === "connected-scatter" && !head;
            const fill = isAccent(m.name) ? accent : neutral;
            return (
              <circle
                key={m.name}
                className="pt"
                data-mark={key(m.name)}
                cx={U(m.name)}
                cy={V(m.name)}
                r={radius(m)}
                fill={start || hollow(m) ? ground : fill}
                fillOpacity={
                  faded(m.name) ? 0.2 : sized && !isAccent(m.name) ? 0.45 : 1
                }
                stroke={
                  isRing(m.name)
                    ? labelInk
                    : start || hollow(m) || sized
                      ? fill
                      : "none"
                }
                strokeWidth={isRing(m.name) ? 2 : 1.2}
                strokeOpacity={faded(m.name) ? 0.25 : 1}
                vectorEffect="non-scaling-stroke"
                tabIndex={0}
                role="img"
                aria-label={details[m.name]}
                data-detail={details[m.name]}
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
        {labels.map((l, i) => {
          const right = l.u > W * 0.62;
          // Near the plot's top edge a label hangs below its point, so it never leaves the plot.
          const below = l.v < H * 0.16;
          return (
            <span
              key={i}
              className="note"
              style={{
                ...regs.annot,
                color: l.accent ? accentInk : labelInk,
                left: `${pct(l.u, W).toFixed(3)}%`,
                top: `${pct(l.v, H).toFixed(3)}%`,
                transform: `translate(${right ? "calc(-100% - 8px)" : "8px"}, ${below ? "10%" : "-110%"})`,
                whiteSpace: "nowrap",
              }}
            >
              {l.text}
            </span>
          );
        })}
      </div>,
      <div
        className="x-axis"
        data-plate={p.id}
        key={`x${p.id}`}
        style={{ pointerEvents: "none" }}
      >
        {ruleLabels
          .filter(({ r }: any) => r.axis === "x")
          .map(({ r, text }: any, i: number) => (
            <span key={`rx${i}`} className="axis-label x" style={{ ...regs.axis, left: `${pct(xy.u(r.value, dom) * W, W)}%`, color: ruleAccent ? accentInk : labelInk, fontWeight: 700 }}>
              {text}
            </span>
          ))}
        {tx.filter((t: number) => !ruleLabels.some(({ r }: any) => r.axis === "x" && Math.abs(xy.u(t, dom) - xy.u(r.value, dom)) < 0.05)).map((t: number, i: number) => {
          const centre = pct(xy.u(t, dom) * W, W);
          const anchor =
            centre > 96
              ? { right: "0%", transform: "translateX(0)" }
              : centre < 4
                ? { left: "0%", transform: "translateX(0)" }
                : { left: `${centre}%` };
          return (
            <span
              key={t}
              className={i % 2 ? "axis-label x minor" : "axis-label x"}
              style={{ ...regs.axis, ...anchor }}
            >
              {xTick(t)}
            </span>
          );
        })}
      </div>,
    ];
  };

  const controls = scheduled.controls;
  const plateCss = [
    `${SCOPE} [data-plate]:not([data-plate="0"]) { display: none; }`,
    `${SCOPE} .chart-plot .gesture-layer { position: relative; pointer-events: none; }`,
    `${SCOPE} .gesture-controls { flex: 0 0 auto; display: flex; flex-wrap: wrap; align-items: center; gap: 0 28px; margin-top: 4px; }`,
    `${SCOPE} .gesture-controls > fieldset { flex: 0 1 auto; max-width: 100%; }`,
    `${SCOPE} .gesture-notes { flex: 0 0 auto; display: grid; }`,
    `${SCOPE} .gesture-notes > div { grid-area: 1 / 1; align-self: start; }`,
    `${SCOPE} .gw-note { visibility: hidden; }`,
    `${SCOPE} .chart-rest-notes { margin: 4px 0 0; }`,
    // Every other x tick leaves a narrow plot, where their labels would touch.
    `@container (max-width: 560px) { ${SCOPE} .chart-plot .axis-label.x.minor { display: none; } }`,
    ...controls.flatMap((_: any, k: number) => {
      const on = `${SCOPE}:has(#gesture-${k + 1}-on:checked)`;
      return [
        `${on} [data-plate] { display: none; }`,
        `${on} [data-plate="${k + 1}"] { display: block; }`,
        `${on} .gw-note { visibility: hidden; }`,
        `${on} [data-gesture-${k + 1}-note="on"] { visibility: visible; }`,
      ];
    }),
    ...controls.map((_: any, k: number) =>
      controlChromeCss({
        scope: SCOPE,
        name: `gesture-${k + 1}`,
        margin: "2px 0 0",
      }),
    ),
  ].join("\n");

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
        {controls.map((c: any, k: number) => (
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
        {controls.map((c: any, k: number) => (
          <div className={`gesture-${k + 1}-notes`} role="status" key={k}>
            <p
              {...{ [`data-gesture-${k + 1}-note`]: "on" }}
              className="gw-note"
              style={{ ...regs.body, margin: 0 }}
            >
              {c.text}
            </p>
          </div>
        ))}
      </div>

      <p className="chart-unit" style={{ ...regs.axis, margin: "4px 0 2px" }}>
        {yName}
      </p>
      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: `${FRAME.gutterPx}px`,
          ["--x-axis-h" as string]: `${FRAME.xAxisRowPx}px`,
          aspectRatio: `${W + FRAME.gutterPx} / ${H + FRAME.xAxisRowPx}`,
        }}
      >
        {plates.flatMap(drawPlate)}
      </div>
      <p className="chart-reading" style={{ ...regs.axis, margin: "6px 0 0" }}>
        {xName}
      </p>
      {restLine ? (
        <p
          className="chart-reading"
          style={{ ...regs.body, margin: "4px 0 0" }}
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
