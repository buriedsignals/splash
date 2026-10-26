/**
 * A bar-and-column beat whose staging is the story's own `gestures`, delivered as an interactive page. Bars in
 * rows (names in the left gutter, each value written after its bar), one value scale from a zero baseline.
 *
 * ONE PLATE PER STATE. The page the reader lands on is the RESTING plate: every gesture that can rest together
 * (`WEB_RESTING`) drawn at once, as the static plate draws them. Each further gesture is one reader control and
 * owns one plate of its own — the resting picture plus that gesture — drawn whole at build time and revealed by its
 * radio (`:checked` / `:has()`, no script). A plate per state rather than one plate moved by transforms, for the
 * reason `reorder.ts` draws one plate per order: `interaction.mjs` resolves a pointer off the hit points' `cx`/`cy`
 * read once at init, which a transform never changes, so a moved bar would answer as the row whose slot it landed
 * in. On its own plate every row is answered by the bar it is drawn as. Under JavaScript off nothing differs: the
 * radios and the stylesheet are the whole mechanism.
 *
 * Every plate shares the resting plate's scale — whose top holds the tallest state any control reaches (a bracket's
 * stacked whole, a compare's copy) — except the plate of a rescale or a zoom, whose whole point is to move it.
 *
 * WHAT EACH CONTROL'S PLATE DRAWS:
 *   bracket  the bracketed rows leave their bands and stack onto the first of them (`stack.ts`'s gesture); a bracket
 *            of one row of the whole stacks every other row onto it, so the bar IS the whole; the sum at its end.
 *   compare  the subject's band splits: its own length above, a copy of the other length below, from the same zero
 *            (`level.ts`: measured against), each figure at its end.
 *   filter   only the kept rows, at the places they hold on the resting plate (`filter.ts`: the frame does not move).
 *   reorder  the same rows, names with them, in the order asked for.
 *   rescale  the same rows on a scale that runs to the gesture's top.
 *   zoom     the same rows on a scale enlarged onto the zoomed rows; a longer bar runs to the plot's end.
 *
 * Colours: one accent (the resting highlight), one neutral taken to the non-text floor against the ground, the
 * pointer's step toward the ink measured as the per-type kit measures it. Every word is set on the ground.
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
// The one drawing of a directed control (fieldset, pill rail, reserved note row), reached through the shared
// resolver: a beat sits at stories/<slug>/beats/<id>/, and an installed root has no skills/ at all.
const { controlChromeCss } = await import(
  skillScriptFrom(
    import.meta.dirname,
    "chart-web",
    "assets",
    "control-chrome.ts",
  )
);

export const FRAME = { width: 900, minHeight: 280, pitch: 24, maxBar: 22 };

const SCOPE = ".chart-figure";
const MARK_ACTIVE_STEP = 0.3;
const MARK_ACTIVE_MIN_STEP = 1.12;
/** How far a figure stands off its bar's end, in CSS px. */
const LABEL_OFFSET_PX = 6;
/** Two tips closer than this (geometry units) print one combined figure instead of two. */
const NEAR_UNITS = 70;

export type Row = {
  name: string;
  value: number;
  label: string;
  detail: string;
};

export type Control = {
  index: number;
  do: string;
  atom: string;
  legend: string;
  chip: string;
  announce: string;
  note: string;
  // the scheduler's own fields (gesture-web.mjs)
  base?: string;
  stacked?: string[];
  restStacked?: number;
  total?: number;
  totalLabel?: string;
  subject?: string;
  value?: number;
  valueLabel?: string;
  kept?: string[];
  order?: string[];
  top?: number;
};

type Bar = {
  key: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  ring: boolean;
  seam: boolean;
};
type Label = {
  text: string;
  x: number;
  slot: number;
  dy?: number;
  before?: boolean;
  accent?: boolean;
  /** Centred on `x` (a figure printed on its own segment), not after it. */
  centre?: boolean;
};

const pct = (value: number, extent: number) => (value / extent) * 100;

export function GestureBarWeb({
  rows,
  resting,
  controls,
  lo,
  hi,
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
}: {
  rows: Row[];
  resting: {
    accent: string[];
    rings: string[];
    references: { value: number }[];
  };
  controls: Control[];
  lo: number;
  hi: number;
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
}) {
  const regs = webRegisters(direction, { ink: { ink, muted, accent } });
  const W = FRAME.width;
  const H = Math.max(rows.length * FRAME.pitch, FRAME.minHeight);
  const ROW = H / rows.length;
  const barH = Math.min(ROW * 0.62, FRAME.maxBar);
  const names = rows.map((r) => r.name);
  const valueOf = new Map(rows.map((r) => [r.name, r.value]));
  const labelOf = new Map(rows.map((r) => [r.name, r.label]));
  const keyOf = new Map(rows.map((r, i) => [r.name, `r${i + 1}`]));

  // The accent is a fill here AND the ink of a highlighted row's name: a mark is held to 3:1, type to 4.5:1.
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
  const copyFill =
    adjustToContrast(mix(ground, ink, 0.72), ground, NON_TEXT_CONTRAST_MIN) ??
    mix(ground, ink, 0.72);
  const labelInk = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const ruleInk = mix(ground, ink, 0.75);
  const activeOf = (fill: string, what: string) => {
    const lifted = mix(fill, ink, MARK_ACTIVE_STEP);
    assertLegible(lifted, ground, {
      role: "mark",
      where: `${direction.id ?? "this direction"}'s ${what} under the pointer`,
    });
    const step = contrast(lifted, fill);
    if (step < MARK_ACTIVE_MIN_STEP)
      throw new Error(
        `${direction.id ?? "this direction"}'s ${what} steps only ${step.toFixed(3)}:1 when a reader points at it (${fill} → ${lifted}), under the ${MARK_ACTIVE_MIN_STEP}:1 this beat holds`,
      );
    return lifted;
  };
  const activeFor = new Map([
    [accent, activeOf(accent, "accent")],
    [neutral, activeOf(neutral, "neutral")],
    [copyFill, activeOf(copyFill, "copy")],
  ]);

  const accentSet = new Set(resting.accent);
  const fillOf = (name: string) => (accentSet.has(name) ? accent : neutral);
  const ringSet = new Set(resting.rings);

  // ── the plates ──────────────────────────────────────────────────────────────────────────────────
  const scaleTop = (top: number) => top * headroom;
  const xOn = (top: number) => (v: number) =>
    ((v - lo) / (scaleTop(top) - lo)) * W;

  type Plate = {
    id: number;
    slotOf: Map<string, number>;
    named: string[];
    bars: Bar[];
    labels: Label[];
    copies: Bar[];
    rules: number[];
    asked: string[];
    top: number;
    /** Where a row's hit point sits when it is not on its own band (a segment of a stacked bar). */
    hitAt: Map<string, { cx: number; cy: number }>;
  };

  const rowTop = (slot: number) => slot * ROW + (ROW - barH) / 2;
  const barOf = (
    name: string,
    slot: number,
    x: (v: number) => number,
    extra: Partial<Bar> = {},
  ): Bar => {
    const [a, b] = [x(0), x(valueOf.get(name)!)];
    return {
      key: name,
      x: Math.min(a, b),
      y: rowTop(slot),
      w: Math.abs(b - a),
      h: barH,
      fill: fillOf(name),
      ring: ringSet.has(name),
      seam: false,
      ...extra,
    };
  };
  const labelAt = (
    name: string,
    slot: number,
    x: (v: number) => number,
  ): Label => {
    const v = valueOf.get(name)!;
    return {
      text: labelOf.get(name)!,
      // A negative bar's figure stands just past the zero, on the side no bar of its row draws into: inside the plot.
      x: x(Math.max(v, 0)),
      slot,
      accent: accentSet.has(name),
    };
  };

  function restPlate(
    id: number,
    top = hi,
    order = names,
    keep: string[] | null = null,
    clip = false,
  ): Plate {
    const x = xOn(top);
    const slotOf = new Map(
      order.map((n, i) => [n, keep ? names.indexOf(n) : i]),
    );
    const shown = order.filter((n) => !keep || keep.includes(n));
    const bars: Bar[] = [];
    const labels: Label[] = [];
    for (const n of shown) {
      const bar = barOf(n, slotOf.get(n)!, x);
      const clipped = clip && bar.x + bar.w > W;
      if (clipped) bar.w = W - bar.x;
      bars.push(bar);
      // A bar a zoom runs off the plot's end keeps its figure, written just inside that end.
      labels.push(
        clipped
          ? { ...labelAt(n, slotOf.get(n)!, x), x: W, before: true }
          : labelAt(n, slotOf.get(n)!, x),
      );
    }
    const rules = resting.references
      .map((r) => x(r.value))
      .filter((u) => u >= 0 && u <= W);
    return {
      id,
      slotOf,
      named: shown,
      bars,
      labels,
      copies: [],
      rules,
      asked: shown,
      hitAt: new Map(),
      top,
    };
  }

  const plates: Plate[] = [restPlate(0)];
  controls.forEach((c, k) => {
    const id = k + 1;
    const x = xOn(hi);
    if (c.do === "bracket") {
      const p = restPlate(id);
      const moved = new Set(c.stacked);
      p.bars = p.bars.filter((b) => !moved.has(b.key));
      p.labels = p.labels.filter(
        (l) => !moved.has(names[l.slot]) && names[l.slot] !== c.base,
      );
      const slot = p.slotOf.get(c.base!)!;
      let run = valueOf.get(c.base!)!;
      // Every segment answers for its own row: its hit point sits on the segment, so a pointer on the stacked bar is
      // answered by the row it is over (resolved by cell, x and y).
      const cy = slot * ROW + ROW / 2;
      p.hitAt.set(c.base!, { cx: (x(0) + x(run)) / 2, cy });
      // The first row keeps its own figure, printed on its own segment when the segment is long enough to hold it.
      if (Math.abs(x(run) - x(0)) >= NEAR_UNITS)
        p.labels.push({
          text: labelOf.get(c.base!)!,
          x: (x(0) + x(run)) / 2,
          slot,
          centre: true,
          accent: accentSet.has(c.base!),
        });
      for (const m of c.stacked!) {
        const v = valueOf.get(m)!;
        const [a, b] = [x(run), x(run + v)];
        p.bars.push({
          key: m,
          x: Math.min(a, b),
          y: rowTop(slot),
          w: Math.abs(b - a),
          h: barH,
          fill: fillOf(m),
          ring: false,
          seam: true,
        });
        p.hitAt.set(m, { cx: (a + b) / 2, cy });
        run += v;
      }
      if (c.restStacked) {
        const [a, b] = [x(run), x(run + c.restStacked)];
        p.copies.push({
          key: "rest",
          x: Math.min(a, b),
          y: rowTop(slot),
          w: Math.abs(b - a),
          h: barH,
          fill: neutral,
          ring: false,
          seam: true,
        });
        run += c.restStacked;
      }
      p.labels.push({
        text: c.totalLabel!,
        x: x(Math.max(run, 0)),
        slot,
        accent: true,
      });
      plates.push(p);
    } else if (c.do === "compare") {
      const p = restPlate(id);
      const slot = p.slotOf.get(c.subject!)!;
      const half = barH / 2;
      p.bars = p.bars.map((b) =>
        b.key === c.subject ? { ...b, h: half - 0.5 } : b,
      );
      const [a, b] = [x(0), x(c.value!)];
      p.copies.push({
        key: c.subject!,
        x: Math.min(a, b),
        y: rowTop(slot) + half + 0.5,
        w: Math.abs(b - a),
        h: half - 0.5,
        fill: copyFill,
        ring: false,
        seam: false,
      });
      const own = x(Math.max(valueOf.get(c.subject!)!, 0));
      const copy = x(Math.max(c.value!, 0));
      p.labels = p.labels.filter((l) => !(l.slot === slot));
      if (Math.abs(own - copy) < NEAR_UNITS)
        p.labels.push({
          text: `${labelOf.get(c.subject!)} / ${c.valueLabel}`,
          x: Math.max(own, copy),
          slot,
          accent: accentSet.has(c.subject!),
        });
      else {
        p.labels.push({
          text: labelOf.get(c.subject!)!,
          x: own,
          slot,
          dy: -half / 2,
          accent: accentSet.has(c.subject!),
        });
        p.labels.push({
          text: c.valueLabel!,
          x: copy,
          slot,
          dy: half / 2,
        });
      }
      plates.push(p);
    } else if (c.do === "filter")
      plates.push(restPlate(id, hi, names, c.kept!));
    else if (c.do === "reorder") plates.push(restPlate(id, hi, c.order!));
    else plates.push(restPlate(id, c.top!, names, null, c.do === "zoom"));
  });

  // ── the stylesheet: which plate shows, which sentence shows, the controls' own chrome ──────────────────
  const plateCss = [
    `${SCOPE} [data-plate]:not([data-plate="0"]) { display: none; }`,
    `${SCOPE} .chart-plot { --y-gutter: ${gutterPx}px; }`,
    `${SCOPE} .chart-plot .gesture-layer { position: relative; pointer-events: none; }`,
    `${SCOPE} .gesture-controls { flex: 0 0 auto; display: flex; flex-wrap: wrap; align-items: center; gap: 0 28px; margin-top: 4px; }`,
    // A control keeps its legend beside its pills: the fieldset shrinks to the row it has, and its legend and pill rail
    // wrap inside it (never past the window). A scrolling rail was refused: a pill scrolled out of view is a pill no
    // pointer reaches (measured at 375 px on a chip of two long names).
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
    // Later controls are written later: when a reader turns on two, the later gesture's plate and sentence show.
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

  const nameStyle = (name: string) => ({
    ...regs.axis,
    color: accentSet.has(name) ? accentInk : (regs.axis.color as string),
    fontWeight:
      accentSet.has(name) || ringSet.has(name) ? 700 : regs.axis.fontWeight,
  });

  const drawPlate = (p: Plate) => {
    const key = (name: string) => `p${p.id}-${keyOf.get(name)}`;
    const layerClass = p.id === 0 ? "overlay" : "gesture-layer";
    return [
      <div className="y-axis" data-plate={p.id} key={`y${p.id}`}>
        {p.named.map((n) => (
          <span
            key={n}
            className="axis-label y"
            style={{
              ...nameStyle(n),
              top: `${pct(p.slotOf.get(n)! * ROW + ROW / 2, H)}%`,
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
        {[...p.bars, ...p.copies].map((b, i) => (
          <rect
            key={`${b.key}-${i}`}
            data-mark={b.key === "rest" ? undefined : key(b.key)}
            x={b.x}
            y={b.y}
            width={Math.max(b.w, 0.01)}
            height={b.h}
            fill={b.fill}
            stroke={b.ring ? labelInk : b.seam ? ground : "none"}
            strokeWidth={b.ring ? 1.5 : b.seam ? 2 : 0}
            vectorEffect="non-scaling-stroke"
            style={{ ["--mark-active" as string]: activeFor.get(b.fill) }}
          />
        ))}
        <line
          x1={xOn(p.top)(0)}
          x2={xOn(p.top)(0)}
          y1={0}
          y2={H}
          stroke={ruleInk}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
        {p.rules.map((u, i) => (
          <line
            key={`rule${i}`}
            x1={u}
            x2={u}
            y1={0}
            y2={H}
            stroke={labelInk}
            strokeWidth={1}
            strokeDasharray="4 3"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {p.asked.map((n) => {
          const row = rows[names.indexOf(n)];
          return (
            <circle
              key={n}
              className="pt"
              cx={p.hitAt.get(n)?.cx ?? W / 2}
              cy={p.hitAt.get(n)?.cy ?? p.slotOf.get(n)! * ROW + ROW / 2}
              r={6}
              fill="transparent"
              stroke="none"
              tabIndex={0}
              role="img"
              data-mark-ref={key(n)}
              aria-label={row.detail}
              data-detail={row.detail}
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
        {p.labels.map((l, i) => (
          <span
            key={i}
            className="end-label"
            style={{
              ...regs.value,
              color: l.accent ? accentInk : labelInk,
              left: `${pct(l.x, W).toFixed(3)}%`,
              top: `${pct(l.slot * ROW + ROW / 2 + (l.dy ?? 0), H).toFixed(3)}%`,
              transform: l.centre
                ? "translate(-50%, -50%)"
                : l.before
                  ? `translate(calc(-100% - ${LABEL_OFFSET_PX}px), -50%)`
                  : `translate(${LABEL_OFFSET_PX}px, -50%)`,
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

      {/* ONE CONTROL PER GESTURE BEYOND THE RESTING STATE. Native radios in a real fieldset each: the resting
          picture first and checked, the gesture's picture second. Each accessible name contains its visible one. */}
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

      {/* THE SENTENCE EACH CONTROL OWES THE READER: the gesture's note and the readings no plate prints. All rows
          share one cell, each reserved at its own depth, so choosing never moves the plot. */}
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
