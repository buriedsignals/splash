/**
 * How far every point of Europe is from the sea, as a LIVE MapTiler map — the field, its bands and
 * its isolines are MapLibre layers over MapTiler's own tiles, with MapTiler's own zoom, pan and
 * keyboard, and THE READER CHOOSES THE STEP BETWEEN THE LINES.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * THE GESTURE, ARGUED — and it is this type's own.
 *
 * An isoline map turns a continuous surface into a set of CHOSEN levels, so the STEP between the
 * lines is the whole argument: it decides how much of the surface survives into the picture. Too
 * fine and the map draws detail the field cannot support — this field is measured on a 7 km mesh in
 * an equal-area projection whose scale error reaches 3 % across the frame, so at a 50 km step the
 * lines are drawn to a precision the measurement does not have and the reader reads texture as
 * information. Too coarse and the thing the story is about is swallowed: at 400 km the headline's
 * own 133 km median falls inside the first band, and a map whose finest distinction is "nearer than
 * 400 km" cannot show what the sentence claims. Every other decision on this page is visible to the
 * reader — the camera, the ramp, the numbers printed on the lines — but the step is not: they see
 * ten bands and read ten facts, never that somebody picked ten. So the step becomes the control, the
 * page states what each one costs in the field's own units, and the answer a pointer gets keeps its
 * MEASURED distance beside the band the chosen step put it in, so the same point reads "entre 100 et
 * 150 km" under one step and "entre 0 et 400 km" under another without moving a pixel. A still, a
 * video and a scrolly must each pick one step and can only say that they did.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * WHAT THE ARCHITECTURE COST IT, STATED RATHER THAN DISCOVERED.
 *
 * No stylesheet can reach a MapLibre fill layer, so the MAP's half of the gesture is script: one
 * `setPaintProperty` per step over an expression built at build time from the same quantised field
 * the page's own derivation carries, plus one `setFilter` that picks the lines the step draws out of
 * the lines the page already carries. What a reader with JavaScript off loses is the map re-cutting.
 * What they keep is the frozen picture of the live map at the opening step, the chip row that gains
 * and loses bands with the step in pure CSS, the sentence each step owes them, and a table of every
 * traceable level in which the levels the chosen step does NOT draw are dimmed on the spot — also
 * pure CSS. The gesture did not go away without script; it moved from the picture to the chips, the
 * sentence and the table, and they say so.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * WEB MERCATOR, AND WHAT IT COSTS THIS SUBJECT — MEASURED, NOT ASSERTED. The owner chose a flat
 * MapLibre map; a flat MapLibre map is Web Mercator, which stretches the north. This beat's field is
 * MEASURED on an equal-area grid (`camera.ts`, LAEA / EPSG:3035) and only DRAWN on Mercator, so no
 * printed number moves — but the PICTURE does, and a contour map is read as a picture of how much
 * land is far from the sea. The runner prints the cost on every render and the caveat carries it in
 * the reader's own words.
 *
 * `the-key-prints-its-breaks-in-the-data-s-units` — the interval is stated once, in kilometres, and
 * every drawn isoline carries its own break printed ON the line as a MapLibre marker in the page's
 * own embedded faces (a symbol layer would fetch glyphs from a second host, in a typeface nobody
 * here chose). A contour set's value only exists if the reader knows what one band represents.
 *
 * WHAT ANSWERS A POINTER IS THE BAND, NEVER A DOT ON IT — the owner's second arbitration, held by
 * MapLibre rather than by a hit test of ours. The class the current step put the pointed-at cell in
 * lights up WHOLE, across the continent, which is the step's own width made visible.
 */

import {
  mix,
  adjustToContrast,
  contrast,
  TEXT_CONTRAST_MIN,
  NON_TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars } from "#shared/design-base/web.mjs";
import { controlChromeCss } from "../../skills/chart-web/assets/control-chrome.ts";
import { liveContourCss } from "../../skills/map-web/assets/live-contour.ts";

/** The scope every generated rule is written inside. */
export const SCOPE = ".chart-figure";
/** The prefix every radio id carries. `chart-stack-` is the FORMAT'S DISCOVERY CONTRACT for a
 *  control that changes the picture and owes the reader a sentence. */
export const STEP_ID_PREFIX = "chart-stack";
/** How long the field takes to cross from one cut to the next, in ms. The same number the live map
 *  is given, so the chips, the rows and the map cross together rather than on three clocks. */
export const CHANGE_MS = 260;
/** How much darker than its own fill a pointed-at band has to be before it counts as answering. A
 *  DOSE IS SEARCHED, NEVER SET: a fixed dose was refused at 1,104:1 on nocturne. */
const MARK_SEPARATION = 1.4;

export type StepOption = {
  slug: string;
  km: number;
  label: string;
  announce: string;
  note: string;
  isDefault: boolean;
  /** How many classes this step cuts the field into. */
  classes: number;
};

export type LevelRow = {
  level: number;
  /** The share of the study area beyond this contour, as the table prints it. */
  beyond: string;
  /** The area beyond it, which the table does NOT print — the reading the answer adds. */
  detail: string;
};

/**
 * THE RAMP, DERIVED ONCE AND READ BY BOTH HALVES OF THE PAGE.
 *
 * Exported because the RENDERER needs the same colours the markup is drawn in: the live plan's
 * per-step fill expressions are built from them, and a second derivation is exactly the "half the
 * beat re-cuts and the other half keeps the step before it" defect this beat's guard refuses.
 *
 * THE FLOOR IS THE LAND, NOT THE PAGE. What sits behind a band is `plateLand`, a step off the
 * direction's ground toward its ink — measuring the lightest band against the GROUND reports a
 * contrast a reader never sees.
 *
 * AND IT IS A CONTINUOUS RAMP WALKED AT N STOPS, not a ladder of separately-cleared rungs. The
 * choropleth one beat over refuses a rung that stands under 1,2:1 from its neighbour, because two
 * of its classes may be a thousand kilometres apart and must be told apart across the page. Here
 * they never are: two neighbouring bands SHARE AN EDGE by construction, and that edge is a drawn
 * isoline carrying its own printed break. So the ramp's job is order, not separation — and the
 * separation it does reach at each offered step is measured and PRINTED by the runner rather than
 * asserted, because "at 50 km two neighbouring bands stand 1,0x:1 apart" is not a defect to hide,
 * it is half the argument the control exists to make.
 */
export function contourRamp({
  ground,
  accent,
  ink,
  plateLand,
  tones,
}: {
  ground: string;
  accent: string;
  ink: string;
  plateLand: string;
  tones: number;
}): { ramp: string[]; activeRamp: string[] } {
  const floor = (() => {
    for (let step = 0; step <= 400; step += 1) {
      const candidate = mix(ground, accent, step / 400);
      if (contrast(candidate, plateLand) >= NON_TEXT_CONTRAST_MIN)
        return candidate;
    }
    throw new Error(
      `no tint of the accent ${accent} stands ${NON_TEXT_CONTRAST_MIN}:1 off the land ${plateLand} ` +
        `the plate is baked in — the nearest-the-sea band would be indistinguishable from land the ` +
        `field does not cover, which is the one thing a contour map may never let happen`,
    );
  })();
  const lo = contrast(floor, ground);
  const hi = contrast(accent, ground);
  const ramp = Array.from({ length: tones }, (_, i) => {
    const target = tones === 1 ? hi : lo * Math.pow(hi / lo, i / (tones - 1));
    for (let step = 0; step <= 400; step += 1) {
      const candidate = mix(ground, accent, step / 400);
      if (contrast(candidate, ground) >= target) return candidate;
    }
    return accent;
  });

  /** WHAT A POINTED-AT BAND BECOMES, SEARCHED OFF ITS OWN FILL — not a fixed dose and not a filter:
   *  `brightness()` lightens on a light ground and on a dark one alike, and a fixed mix measured
   *  1,104:1 on nocturne one beat over. */
  const activeFor = (fill: string) => {
    for (let dose = 0.06; dose <= 0.94; dose += 0.02) {
      const candidate = mix(fill, ink, dose);
      if (
        contrast(candidate, fill) >= MARK_SEPARATION &&
        contrast(candidate, plateLand) >= NON_TEXT_CONTRAST_MIN
      )
        return candidate;
    }
    throw new Error(
      `no dose of ink separates a pointed-at band from its own fill ${fill} by ` +
        `${MARK_SEPARATION}:1 while staying ${NON_TEXT_CONTRAST_MIN}:1 above the land ${plateLand}. ` +
        `A band that answers by becoming a colour the reader cannot tell from the one beside it has ` +
        `not answered.`,
    );
  };
  return { ramp, activeRamp: ramp.map(activeFor) };
}

/** THE THREE HALVES OF THE GESTURE THAT ARE NOT SCRIPT, generated from one derivation: the chip row
 *  that gains and loses bands with the step, the sentence each step owes the reader, and the table
 *  rows a step dims because it does not draw them. */
function steppingCss({
  steps,
  chips,
  rampOf,
  levels,
  dimInk,
  rowInk,
}: {
  steps: StepOption[];
  chips: number;
  rampOf: (slug: string) => string[];
  levels: number[];
  dimInk: string;
  rowInk: string;
}): string {
  const out: string[] = [];
  // The chips and the rows both settle on the OPENING step first, as ordinary rules, so the cascade
  // has only rules to compare: an inline style would beat every generated rule, which is how a
  // sibling beat painted one partition under all four of its controls.
  const rules = (slug: string, on: string) => {
    const ramp = rampOf(slug);
    for (let i = 0; i < chips; i += 1)
      out.push(
        i < ramp.length
          ? `${on} [data-band="${i}"] { background: ${ramp[i]}; display: inline-block; }`
          : `${on} [data-band="${i}"] { display: none; }`,
      );
    // EVERY STEP RESETS BEFORE IT CUTS. The opening step's rules are ordinary ones and a later
    // `:has()` rule outranks them, but only where it SAYS something: a row the opening step dimmed
    // and this one draws had no rule to take it back, so choosing the finest step left seven rows
    // greyed under a step that draws all thirteen, and two sentences showing at once. Measured in a
    // real browser on the written page, which is the only place the cascade is real.
    out.push(`${on} tr[data-mark] { opacity: 1; color: ${rowInk}; }`);
    out.push(`${on} [data-stack-note] { visibility: hidden; }`);
    const km = steps.find((s) => s.slug === slug)!.km;
    for (const level of levels)
      if (level % km !== 0)
        out.push(
          `${on} tr[data-mark="${level}"] { opacity: 0.42; color: ${dimInk}; }`,
        );
    out.push(`${on} [data-stack-note="${slug}"] { visibility: visible; }`);
  };
  const opening = steps.find((s) => s.isDefault)!;
  rules(opening.slug, SCOPE);
  for (const step of steps)
    rules(step.slug, `${SCOPE}:has(#${STEP_ID_PREFIX}-${step.slug}:checked)`);
  return out.join("\n");
}

export function DirectedContourWeb({
  plate,
  plateLand,
  steps,
  levelRows,
  chips,
  rampOf,
  livePlan,
  liveScript,
  liveHint,
  maplibreCss,
  maplibreJs,
  stepLegendLabel,
  nearLabel,
  farLabel,
  tableCaption,
  columns,
  aspect,
  size,
  title,
  eyebrow,
  caveat,
  source,
  alt,
  reading,
  claimNote,
  limitNote,
  interaction,
  direction,
  ground,
  accent,
  ink,
  muted,
  grid,
}: {
  plate: string;
  plateLand: string;
  steps: StepOption[];
  levelRows: LevelRow[];
  /** How many chips the legend row holds — the finest step's own class count. */
  chips: number;
  rampOf: (slug: string) => string[];
  livePlan: Record<string, unknown>;
  liveScript: string;
  liveHint: string;
  maplibreCss: string;
  maplibreJs: string;
  stepLegendLabel: string;
  nearLabel: string;
  farLabel: string;
  tableCaption: string;
  columns: string[];
  aspect: number;
  size: number;
  title: string;
  eyebrow: string;
  caveat: string;
  source: string;
  alt: string;
  reading: string;
  claimNote: string;
  limitNote: string;
  interaction: unknown;
  direction: any;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
}) {
  const regs = webRegisters(direction, { ink: { ink, muted, accent } });
  const width = aspect >= 1 ? size : size * aspect;
  const height = aspect >= 1 ? size / aspect : size;
  const dimInk = adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? muted;

  const css = [
    controlChromeCss({
      scope: SCOPE,
      name: "stack",
    }),
    steppingCss({
      steps,
      chips,
      rampOf,
      levels: levelRows.map((r) => r.level),
      dimInk,
      rowInk: ink,
    }),
    liveContourCss({ scope: SCOPE }),
    // THE CHIP ROW KEEPS ITS HEIGHT whatever the step. Its WIDTH is meant to change — that is the
    // re-cut, and the reader asked for it — but a row that also changed height would push the map
    // down, which is the owner's first arbitration wearing this page's face.
    `${SCOPE} .mw-chips { display: flex; align-items: center; gap: 0; margin: 6px 0 2px; flex: 0 0 auto; min-height: 20px; }`,
    `${SCOPE} .mw-chips .sw { width: 22px; height: 14px; border: 1px solid ${grid}; border-right-width: 0; transition: background-color ${CHANGE_MS}ms linear; }`,
    `${SCOPE} .mw-chips .sw:last-of-type { border-right-width: 1px; }`,
    `${SCOPE} .mw-chips .edge { color: ${dimInk}; }`,
    `${SCOPE} .mw-chips .edge.near { margin-right: 8px; }`,
    `${SCOPE} .mw-chips .edge.far { margin-left: 8px; }`,
    // The answer is three readings long and the format's tooltip is 220 px wide.
    `#tooltip { max-width: 340px; }`,
    `${SCOPE} .mw-table { width: 100%; border-collapse: collapse; margin: 6px 0 0; }`,
    `${SCOPE} .mw-table th, ${SCOPE} .mw-table td { text-align: left; padding: 2px 10px 2px 0; border-bottom: 1px solid ${grid}; white-space: nowrap; }`,
    `${SCOPE} .mw-table td.num, ${SCOPE} .mw-table th.num { text-align: right; }`,
    // A ROW HEADING IS STILL A HEADING to a screen reader and still a plain cell to the eye. Named
    // literally, because the font machine cannot resolve `inherit` into a weight to cut.
    `${SCOPE} .mw-table th.rowhead { font-weight: ${regs.axis.fontWeight}; }`,
    `${SCOPE} details.mw-readings { margin: 8px 0 0; }`,
    `${SCOPE} details.mw-readings > summary { cursor: pointer; }`,
    `${SCOPE} .mw-scroll { max-height: 40vh; overflow: auto; }`,
  ].join("\n\n");

  return (
    <figure
      className="chart-figure"
      style={{
        ["--ground" as string]: ground,
        ["--accent" as string]: accent,
        ["--ink" as string]: ink,
        ["--muted" as string]: muted,
        ["--grid" as string]: grid,
        ["--value-family" as string]: String(regs.value.fontFamily),
        ...figureVars(regs),
      }}
    >
      {/* MapLibre's own stylesheet, INLINED rather than linked: a `<link>` would trade the payload
          for a SECOND third-party host, and the honest reading of the live-map ruling keeps the
          count at one — api.maptiler.com. */}
      <style dangerouslySetInnerHTML={{ __html: maplibreCss }} />
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
      </div>

      {/* THE KEY IS THE BANDS THEMSELVES, and it gains and loses bands with the step — in pure CSS,
          so it is the half of the gesture a reader with no script still operates. It carries no
          break of its own: every drawn isoline prints its own number ON the line, which is what
          `the-key-prints-its-breaks-in-the-data-s-units` asks of this form. */}
      <div className="mw-chips" style={{ ...regs.axis }} aria-hidden="true">
        <span className="edge near">{nearLabel}</span>
        {Array.from({ length: chips }, (_, i) => (
          <span key={i} className="sw" data-band={i} />
        ))}
        <span className="edge far">{farLabel}</span>
      </div>

      {/* THE CONTROL. Native radios in a real `<fieldset>` with a `<legend>`: a radio group to the
          keyboard and to a screen reader before this page's stylesheet does anything to it. */}
      <fieldset className="chart-stack">
        <legend>{stepLegendLabel}</legend>
        <div className="options">
          {steps.map((step) => (
            <label key={step.slug}>
              <input
                id={`${STEP_ID_PREFIX}-${step.slug}`}
                type="radio"
                name={STEP_ID_PREFIX}
                value={step.slug}
                aria-label={step.announce}
                defaultChecked={step.isDefault}
              />
              {step.label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* WHAT THE CHOSEN STEP COSTS, IN THE FIELD'S OWN UNITS. Every sentence sits in one grid cell,
          so the row is always as tall as the longest of them and choosing a step never moves the
          map. `visibility` and not `display`: a hidden sentence still sizes its cell, which is what
          keeps the row from changing height when the reader changes their mind. */}
      <div className="stack-notes" role="status">
        {steps.map((step) => (
          <p
            data-stack-note={step.slug}
            key={step.slug}
            style={{ ...regs.annot, margin: 0 }}
          >
            {step.note}
          </p>
        ))}
      </div>

      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: "0px",
          ["--x-axis-h" as string]: "0px",
          // The aspect-ratio is the box's BASIS, not its law: the format makes `.chart-plot` the one
          // shrinkable item under the figure's `max-height: 100dvh`, so this box takes the width it
          // is given and the height the window leaves. The two layers then COVER it; neither is
          // stretched.
          aspectRatio: `${width} / ${height}`,
        }}
      >
        <div className="y-axis" />
        {/* THE FALLBACK — one `<svg class="chart">` carrying the frozen picture of this page's own
            live map at the opening step. It is the format's cell contract (the cell carries this
            box's ratio, so nothing is ever stretched) and it is the whole picture when the live map
            cannot be shown: no script, no key, no network, no tiles. MapTiler invalidates ALL of an
            account's keys at 100 % of its spending limit, so every published map going blank at once
            is not a hypothetical. */}
        <svg
          role="img"
          aria-label={title}
          xmlns="http://www.w3.org/2000/svg"
          className="chart"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid slice"
          data-plate=""
        >
          <desc>{alt}</desc>
          <image
            href={plate}
            x={0}
            y={0}
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        </svg>
        {/* THE LIVE MAP'S BOX — empty and invisible until MapLibre says it has drawn. It takes the
            plot's whole track rather than the cell, which IS the owner's ruling: a live map has no
            viewBox to be bound by, so it fills the width the figure has. */}
        <div className="map-layer" aria-hidden="true" />
        <div className="x-axis" />
      </div>

      <p className="chart-reading" style={{ ...regs.annot, margin: "8px 0 0" }}>
        {claimNote}
      </p>
      {/* SHOWN ONLY WHEN THE LIVE MAP IS UP. With no script, no key or no tiles, a sentence about
          dragging a map that cannot be dragged is a dead control. */}
      <p
        className="live-hint"
        hidden
        style={{ ...regs.annot, margin: "4px 0 0" }}
      >
        {liveHint}
      </p>
      <p className="chart-reading" style={{ ...regs.body, margin: "6px 0 0" }}>
        {reading}
      </p>

      {/* EVERY TRACEABLE LEVEL, AS TEXT, WITH AND WITHOUT SCRIPT — and the gesture with it. A level
          the chosen step does not draw is DIMMED rather than removed, in pure CSS: the reader is
          meant to see exactly which levels a coarser step throws away, and that is the half of the
          argument the map cannot make when it cannot re-cut. */}
      <details className="mw-readings">
        <summary style={{ ...regs.axis }}>{tableCaption}</summary>
        {/* HOW THE FIELD WAS MEASURED, beside the levels it produced rather than standing over the
            map. This format gives the plot whatever the furniture leaves, and the furniture is what
            the owner's full-width ruling is measured against: with this paragraph above the plot the
            live box measured 404 px tall at 1512x860, against the 520 the validated pattern gets.
            The claim and the caveat keep what a reader needs to read the picture; the method note is
            what a reader goes looking for, so it sits where they go. */}
        <p className="chart-reading" style={{ ...regs.annot, margin: "4px 0 6px" }}>
          {limitNote}
        </p>
        <div className="mw-scroll">
          <table className="mw-table" style={{ ...regs.axis }}>
            <thead>
              <tr>
                {columns.map((column, i) => (
                  <th
                    key={column}
                    scope="col"
                    className={i > 0 ? "num" : undefined}
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {levelRows.map((row) => (
                <tr
                  key={row.level}
                  data-mark={row.level}
                  data-detail={row.detail}
                >
                  <th scope="row" className="rowhead">
                    {row.level}
                  </th>
                  <td className="num">{row.beyond}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>
        {source}
      </p>

      {/* THE PLAN THE LIVE LAYER READS, as `application/json` — which is also what the font machine
          reads when it decides which characters this page can display, so every answer and every
          level's own break is cut into the embedded faces like any other word. */}
      <script
        id="mw-live-plan"
        type="application/json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(livePlan) }}
      />
      <script dangerouslySetInnerHTML={{ __html: maplibreJs }} />
      <script dangerouslySetInnerHTML={{ __html: liveScript }} />
    </figure>
  );
}
