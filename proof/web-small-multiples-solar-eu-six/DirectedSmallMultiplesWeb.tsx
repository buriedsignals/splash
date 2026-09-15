/**
 * Six European countries' solar share, one panel each, 2010 to 2024 — drawn as small multiples
 * THROUGH the design base and delivered as an interactive page.
 *
 * THE TYPE, AND THE ONE THING IT IS NOT ALLOWED TO GIVE UP.
 *
 * `panels-share-one-scale-or-they-are-not-multiples` — every panel runs 0 to the SAME ceiling on the
 * same years. The moment one panel is fitted to its own data the grid stops being a comparison and
 * becomes six unrelated charts sharing a caption. The component throws rather than draw a panel on a
 * scale of its own, and the cost is stated: on a shared scale the smallest country's curve is nearly
 * flat, and that flatness is the true reading, not a defect.
 *
 * `what-is-shared-is-stated-once-and-what-varies-is-repeated` — the scale, the span and the unit are
 * said ONCE above the grid; the country's name, its last value and (under a carry) its verdict are
 * repeated in every panel.
 *
 * WHAT THE WEB ADDS, AND WHY IT IS THE GRID'S OWN GESTURE AND NOT A TOOLTIP.
 *
 * Faceting buys honesty with a frame, and a frame is a wall. The panels are directly comparable and
 * every comparison is out of reach: two curves in two boxes NEVER MEET, so everything that lives at
 * a meeting — who was ahead, for how long, the year the order changed — is structurally absent from
 * a facet grid. Six panels hide fifteen pairs; drawing them all on a plate is thirty-six panels,
 * which is the blow-up that made anyone reach for a grid in the first place.
 *
 * So the reader carries ONE of the six into ALL SIX FRAMES at once (`chart-web/assets/carry.ts`),
 * as a filled silhouette on the grid's own shared scale, unchanged. The grid stays a grid — six
 * frames, one scale, the same years, the same names, nothing moved — and every crossing the wall was
 * hiding becomes a place where a line enters or leaves a mountain. The carried country is itself one
 * of the six, so its own panel shows the silhouette lying exactly under its own line: the reader can
 * SEE that the shape they are reading in five frames is the shape they are reading in the sixth.
 *
 * AND THE SECOND CHANNEL. A 240-unit panel cannot carry fifteen years of numbers, so every panel
 * answers a pointer with its two ends, the factor it grew by, its rank and the year it first passed
 * one per cent. What responds is the panel's own LINE, lifted off its own ink — never a ring or a
 * dot laid on top of it, and never by a fixed dose: the step is searched until it is measurable on
 * the direction actually being rendered.
 *
 * COLOUR, AND THE TRAP THIS BEAT WALKED INTO FIRST. Two greys calibrated independently on the same
 * floor against the same ground come out the SAME GREY: the neutral line at the non-text floor and
 * the carried silhouette at the non-text floor stand 1,068:1 apart on `creme`, 1,067:1 on `rapport`
 * and 1,200:1 on `nocturne`. So the neutral line is mixed deeper and held to a 5:1 FLOOR rather
 * than to the 3:1 one — it lands at 9,21:1 on creme, 9,44 on rapport and 9,58 on nocturne, well
 * clear of the floor, which is the point: a floor two colours are both calibrated ONTO is a floor
 * that makes them equal. And because the accent line still reads only 2,04:1 against the silhouette
 * on `creme`, EVERY LINE IS CASED IN THE PANEL'S OWN GROUND, 2,6 units wider than itself.
 * The colour immediately adjacent to any line is then always the panel ground and never the
 * mountain, which is what the sixth ruling actually asks: measure a colour against the thing the
 * page really paints behind it.
 *
 * THE FRAME DOES NOT STRETCH, AND THAT IS DELIBERATE HERE. This component writes
 * `preserveAspectRatio="xMidYMid meet"`, not the `none` the format's wide beats use, so the grid is
 * letterboxed rather than squeezed. A facet grid's whole premise is that panels are visually
 * swappable — "panel size, aspect ratio, and the position of the axis inside the panel stay
 * identical" — and a viewBox stretched 1,41x horizontally would keep them swappable but would make
 * every slope a lie about its own rate. No shape on this page needs a counter-scale, because nothing
 * on it is drawn as a shape: the marks are lines and areas, which are distances in the plane.
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
import {
  assertCarryDeclaration,
  carryChromeCss,
  carryCss,
  carryNotesForMarkup,
  carryOptionsForMarkup,
  carryShapes,
  carryVerdicts,
  type CarryDeclaration,
} from "../../skills/chart-web/assets/carry.ts";

/** The scope every generated rule is written inside. */
const SCOPE = ".chart-figure";

/** The id prefix, and it is `chart-level-` on purpose — `interaction-plan.ts` discovers a control of
 *  this shape by exactly this prefix and by `data-level-note`, the way `aim.ts` emits `chart-stack-`.
 *  Those two strings are the format's discovery channel, not a claim about which file drew the
 *  rules; `carry.ts`'s own header says so at length. */
const CARRY_ID_PREFIX = "chart-level-";

const PANEL = { w: 240, h: 130 };
const GAP = { x: 18, y: 56 };
/** Room above the first row for the names, and below the last for the verdicts. `GAP.y` is 56 and
 *  not 46: at 46 the verdict under one row sat 21 units from the NAME of the row below it and 17
 *  from its own panel, so it read as a caption for the wrong grid row — seen in the nocturne
 *  capture, where the axis register is the largest of the three. It is 29 units from the name now. */
const MARGIN = { top: 22, bottom: 24 };

/** How long a silhouette takes to arrive, and the panels' own washes to step aside. Honoured only
 *  under `prefers-reduced-motion: no-preference` — `carry.ts` puts the whole transition inside the
 *  query rather than overriding it back. */
const FADE_MS = 520;

/** How much of the panel's own ground a line is cased in, in geometry units, total. This is the one
 *  number that makes every mark on the page measurable against the colour actually touching it. */
const CASING = 2.6;

/** How far a line is lifted toward the ink when a reader points at its panel, and how different that
 *  has to make it. The dose is SEARCHED from the first, not fixed: a fixed dose was refused at
 *  1,104:1 on `nocturne` elsewhere in this tree, and the three filed directions do not leave the
 *  same headroom as each other. */
const MARK_ACTIVE_FIRST_STEP = 0.22;
const MARK_ACTIVE_MAX_STEP = 0.72;
const MARK_ACTIVE_MIN_STEP = 1.12;

export type Panel = {
  code: string;
  name: string;
  series: { year: number; value: number }[];
  endLabel: string;
  detail: string;
  highlight: boolean;
};

export function DirectedSmallMultiplesWeb({
  panels,
  columns,
  years,
  ceiling,
  carry,
  sharedNote,
  title,
  eyebrow,
  caveat,
  source,
  alt,
  reading,
  direction,
  ground,
  accent,
  ink,
  muted,
  grid,
}: {
  panels: Panel[];
  columns: number;
  years: number[];
  ceiling: number;
  carry: CarryDeclaration;
  sharedNote: string;
  title: string;
  eyebrow: string;
  caveat: string;
  source: string;
  alt: string;
  reading: string;
  direction: any;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
}) {
  const regs = webRegisters(direction, { ink: { ink, muted, accent } });
  const who = direction.id ?? "this direction";

  // ── THE PAPER UNDER A PANEL, AND EVERY COLOUR MEASURED AGAINST WHAT TOUCHES IT ───────────────
  const panelGround = mix(ground, ink, 0.05);

  // The five neutral lines. NOT taken to the non-text floor, and that is the whole point: the
  // silhouette below is taken to the floor against the same paper, and two colours calibrated
  // independently on one floor against one ground come out identical by construction — measured
  // here at 1,068:1 on creme before this line was deepened. 5:1 is a FLOOR the 0,72 mix already
  // clears (9,21:1 on creme, 9,44 on rapport, 9,58 on nocturne), which is exactly what is wanted:
  // the line is not calibrated ONTO a number the silhouette is also calibrated onto. It is then
  // asserted against the PANEL ground rather than the page ground, because a panel is what a line is
  // actually drawn on.
  const thread = adjustToContrast(mix(ground, ink, 0.72), ground, 5) ?? mix(ground, ink, 0.72);
  assertLegible(thread, panelGround, { role: "mark", where: `${who}'s neutral panel lines` });

  // The subject's line. Rule 5 of `directed-interaction.md`: the accent on the subject is drawn
  // unconditionally and no control on this page can take it away.
  const lit = adjustToContrast(accent, ground, NON_TEXT_CONTRAST_MIN) ?? accent;
  assertLegible(lit, panelGround, { role: "mark", where: `${who}'s subject line` });

  // The carried silhouette. A SOLID fill, never an opacity laid over the paper after the fact: an
  // opacity posed after a calibration has already delivered 1,75:1 twice in this tree, and the
  // colour a contrast is measured on has to be the colour the page paints. The transition uses
  // opacity, so the RESTING state — the only one a measurement means anything about — is this hex.
  const carried =
    adjustToContrast(mix(ground, ink, 0.26), panelGround, NON_TEXT_CONTRAST_MIN) ?? mix(ground, ink, 0.26);
  assertLegible(carried, panelGround, { role: "mark", where: `${who}'s carried silhouette` });

  // Each panel's own wash, under its own line, and it is decorative: the LINE carries the reading,
  // and the wash steps aside entirely the moment a silhouette is laid into the panel. Computed as a
  // solid mix rather than an opacity for the reason above.
  const washOf = (line: string) => mix(panelGround, line, 0.16);

  // WHAT A PANEL'S LINE TAKES UNDER THE READER'S POINTER, off ITS OWN ink and never a ring or a dot
  // on top of it (the owner's second ruling, refused three times). The dose is searched rather than
  // fixed, and the search is asserted in both directions: a step that does not clear the mark floor
  // against the paper hides the line, and a step nobody can see is no answer at all.
  const activeOf = (line: string, what: string) => {
    for (let step = MARK_ACTIVE_FIRST_STEP; step <= MARK_ACTIVE_MAX_STEP + 1e-9; step += 0.02) {
      const lifted = mix(line, ink, step);
      if (contrast(lifted, line) < MARK_ACTIVE_MIN_STEP) continue;
      if (contrast(lifted, panelGround) < NON_TEXT_CONTRAST_MIN) continue;
      return lifted;
    }
    throw new Error(
      `${who}'s ${what} cannot be lifted off its own ink (${line}) by ${MARK_ACTIVE_MIN_STEP}:1 ` +
        `without falling under the ${NON_TEXT_CONTRAST_MIN}:1 mark floor on the panel paper ` +
        `(${panelGround}), at any dose up to ${MARK_ACTIVE_MAX_STEP}. A panel would answer a pointer ` +
        "with a change nobody can see, or with a line nobody can find.",
    );
  };
  const threadActive = activeOf(thread, "neutral panel lines");
  const litActive = activeOf(lit, "subject line");

  const label = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const quiet = adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? muted;

  // THE STACK GOES INTO AN SVG ATTRIBUTE UNQUOTED, AND THAT IS A MEASUREMENT, NOT A STYLE CHOICE.
  //
  // `figureVars` emits a stack that OPENS WITH A QUOTE (`"Open Sans", Helvetica, …`), which is right
  // for a stylesheet and wrong for an attribute. `fontRequestsInHtml` decodes each tag before
  // reading it, so `font-family="&quot;Open Sans&quot;, …"` arrives as `font-family=""Open Sans", …`
  // and its own pattern — deliberately conservative, stopping at the first quote — matches NOTHING.
  // The request then falls through to the page's inherited body family, and the face the SVG
  // actually asks for is never embedded.
  //
  // Measured on this beat before this line existed: `rapport`, whose body family is Merriweather,
  // shipped 40 `<text>` elements set in Open Sans 400 and carried Open Sans 700 only. `assertFontsEmbedded`
  // was satisfied (it had been told Merriweather 400, which IS carried) and `verify-web.mjs` — which
  // asks the BROWSER what it resolved — failed on all 32 characters. `creme` and `nocturne` passed
  // the same build, because their body family is Open Sans and the wrong attribution happened to
  // land on the right face. `ChartWebSeed.tsx` writes this attribute unquoted for the same reason.
  const stackOf = (family: unknown) => String(family).replace(/"/g, "");

  // ── THE GRID ────────────────────────────────────────────────────────────────────────────────
  const rows = Math.ceil(panels.length / columns);
  const width = columns * PANEL.w + (columns - 1) * GAP.x;
  const height = MARGIN.top + rows * PANEL.h + (rows - 1) * GAP.y + MARGIN.bottom;

  const first = years[0];
  const last = years[years.length - 1];
  for (const p of panels) {
    if (p.series.length !== years.length)
      throw new Error(
        `${p.name} draws ${p.series.length} readings and the grid draws ${years.length} — panels that ` +
          "do not cover the same years cannot share an axis at all",
      );
    p.series.forEach((s, i) => {
      if (s.year !== years[i])
        throw new Error(`${p.name} draws ${s.year} where the grid draws ${years[i]} — a hole is not a multiple`);
      if (s.value < 0 || s.value > ceiling)
        throw new Error(`${p.name} draws ${s.value} in ${s.year}, outside the shared scale 0-${ceiling}`);
    });
  }

  // Refused before anything is drawn, against what this component is actually handed.
  assertCarryDeclaration(carry, {
    hosts: panels.map((p) => ({ key: p.code, series: p.series })),
    years,
    ceiling,
  });

  const options = carryOptionsForMarkup(carry, CARRY_ID_PREFIX);
  const notes = carryNotesForMarkup(carry);
  const panelKeys = panels.map((p) => p.code);
  const shapes = carryShapes(carry, panelKeys);
  const verdicts = carryVerdicts(carry, panelKeys);

  const originOf = (i: number) => ({
    x: (i % columns) * (PANEL.w + GAP.x),
    y: MARGIN.top + Math.floor(i / columns) * (PANEL.h + GAP.y),
  });
  const originByCode = new Map(panels.map((p, i) => [p.code, originOf(i)]));
  const px = (year: number) => ((year - first) / (last - first)) * PANEL.w;
  const py = (v: number) => PANEL.h - (v / ceiling) * PANEL.h;

  // ONE PAIR OF PROJECTIONS, USED BY EVERY PANEL AND BY EVERY CARRIED SILHOUETTE. This is the type's
  // non-negotiable expressed as code rather than as a comment: there is no second `py` in this file
  // for a carried shape to be drawn with, so a silhouette refitted to the box it is laid into is not
  // a bug that could be introduced here — it is unsayable.
  const lineOf = (series: { year: number; value: number }[], o: { x: number; y: number }) =>
    series.map((s, k) => `${k === 0 ? "M" : "L"} ${o.x + px(s.year)} ${o.y + py(s.value)}`).join(" ");
  const areaOf = (series: { year: number; value: number }[], o: { x: number; y: number }) =>
    `M ${o.x} ${o.y + PANEL.h} ` +
    series.map((s) => `L ${o.x + px(s.year)} ${o.y + py(s.value)}`).join(" ") +
    ` L ${o.x + PANEL.w} ${o.y + PANEL.h} Z`;

  const css = [
    carryChromeCss({ scope: SCOPE }),
    carryCss(carry, { scope: SCOPE, idPrefix: CARRY_ID_PREFIX, fadeMs: FADE_MS }),
    // THE POINTED-AT LINE, RAISED ABOVE THE PAINT. The format's own `.mark-active { fill: … }` is
    // (0,1,0) and speaks about a fill; what answers here is a STROKE on a path, so this rule at
    // (0,2,1) says it in the right property and outranks the blanket that paints the lines. Nothing
    // `carry.ts` generates sets a stroke at all, deliberately, so the two cannot collide.
    `${SCOPE} path.mark-active[data-mark] { stroke: var(--mark-active); }`,
    // The answer is five readings long and the format's box is 220 px wide. Widening it to two or
    // three lines is the whole fix; bare `#tooltip` because the element is the page's, not this
    // figure's, and this sheet is emitted after the format's own.
    `#tooltip { max-width: 330px; }`,
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
        ...figureVars(regs),
      }}
    >
      {/* This beat's own stylesheet, carried inside the figure it styles. The format's shared
          `buildCss` emits chrome for a FILTER, which this beat does not declare and must not —
          nothing leaves a facet grid, and a grid that hid a panel would be a comparison with a hole
          in it. A carry pays its own way. */}
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div className="chart-header">
        <p className="chart-eyebrow" style={{ ...regs.eyebrow, margin: "0 0 6px" }}>{eyebrow}</p>
        <h2 className="chart-title" style={{ ...regs.display, margin: "0 0 6px" }}>{title}</h2>
        <p className="chart-caveat" style={{ ...regs.body, margin: 0 }}>{caveat}</p>
      </div>

      <p className="chart-caveat" style={{ ...regs.annot, margin: "6px 0 0", flex: "0 0 auto" }}>{sharedNote}</p>

      {/* THE CONTROL. Native radios in a real `<fieldset>` with a `<legend>`: a radio group to the
          keyboard and to a screen reader before this page's stylesheet does anything to it, and
          `aria-label` carries the reading a reader who is not looking at the picture would otherwise
          only get from the shapes. Each accessible name CONTAINS its visible one —
          `assertCarryDeclaration` refuses the declaration otherwise (WCAG 2.5.3). */}
      <fieldset className="chart-carry">
        <legend>{carry.label}</legend>
        <div className="options">
          {options.map((option) => (
            <label key={option.id}>
              <input
                id={option.id}
                type="radio"
                name="chart-carry"
                value={option.slug}
                aria-label={option.announce}
                defaultChecked={option.isNone}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* THE SENTENCE EACH CARRIED COUNTRY OWES THE READER — the crossings, the longest run and the
          counts, none of which any silhouette can draw. Its row is reserved whether or not a country
          is carried, so choosing one never moves the grid underneath it. The untouched option gets
          none, because there the gesture is absent and a caption on a non-event is what `filter.ts`,
          `stack.ts`, `level.ts` and `floor.ts` all refuse. */}
      <div className="carry-notes" role="status">
        {notes.map((note) => (
          <p data-level-note={note.slug} key={note.slug}>{note.text}</p>
        ))}
      </div>

      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: "0px",
          ["--x-axis-h" as string]: "0px",
          aspectRatio: `${width} / ${height}`,
        }}
      >
        <div className="y-axis" />
        <svg
          role="group"
          aria-label={title}
          xmlns="http://www.w3.org/2000/svg"
          className="chart"
          data-hit="cell"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <desc>{alt}</desc>
          <rect x={0} y={0} width={width} height={height} fill={ground} />

          {panels.map((p, i) => {
            const o = originOf(i);
            return <rect key={`bg-${p.code}`} x={o.x} y={o.y} width={PANEL.w} height={PANEL.h} fill={panelGround} />;
          })}

          {/* EVERY SILHOUETTE OF EVERY OPTION, DRAWN ONCE AT ITS OWN PLACE AND REVEALED BY THE
              STYLESHEET. No transform anywhere: `interaction.mjs` resolves the mark under a pointer
              off the `cx`/`cy` it reads ONCE at init, which no CSS transform ever changes, and a
              control that needs no transform does not get to re-open that hole. */}
          <g aria-hidden="true">
            {shapes.map((shape) => {
              const o = originByCode.get(shape.panel) as { x: number; y: number };
              return (
                <path
                  key={`carry-${shape.slug}-${shape.panel}`}
                  data-carry-shape={shape.slug}
                  d={areaOf(shape.series, o)}
                  fill={carried}
                  stroke="none"
                />
              );
            })}
          </g>

          {panels.map((p, i) => {
            const o = originOf(i);
            const line = p.highlight ? lit : thread;
            return (
              <g key={p.code}>
                <path data-carry-own="" d={areaOf(p.series, o)} fill={washOf(line)} stroke="none" />
                <line
                  x1={o.x}
                  x2={o.x + PANEL.w}
                  y1={o.y + PANEL.h}
                  y2={o.y + PANEL.h}
                  stroke={quiet}
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
                {/* THE CASING, AND IT IS WHAT MAKES EVERY LINE MEASURABLE. Drawn in the panel's own
                    paper, 2,6 units wider than the line it carries, so the colour immediately
                    adjacent to any line is the panel ground and never the silhouette it is crossing
                    — on `creme` the accent reads 2,04:1 against the mountain and 6,12:1 against the
                    paper, and it is the paper the casing puts there. */}
                <path
                  d={lineOf(p.series, o)}
                  fill="none"
                  stroke={panelGround}
                  strokeWidth={(p.highlight ? 2.4 : 1.7) + CASING}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                <path
                  data-mark={p.code}
                  style={{ ["--mark-active" as string]: p.highlight ? litActive : threadActive }}
                  d={lineOf(p.series, o)}
                  fill="none"
                  stroke={line}
                  strokeWidth={p.highlight ? 2.4 : 1.7}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </g>
            );
          })}

          {panels.map((p, i) => {
            const o = originOf(i);
            return (
              <circle
                key={`hit-${p.code}`}
                className="pt"
                cx={o.x + PANEL.w / 2}
                cy={o.y + PANEL.h / 2}
                r={6}
                fill="transparent"
                stroke="none"
                tabIndex={0}
                role="img"
                aria-label={p.detail}
                data-detail={p.detail}
                data-mark-ref={p.code}
              />
            );
          })}
          <rect className="hit-area" x={0} y={0} width={width} height={height} fill="transparent" pointerEvents="all" />

          {panels.map((p, i) => {
            const o = originOf(i);
            return (
              <g key={`t-${p.code}`}>
                <text
                  pointerEvents="none"
                  x={o.x}
                  y={o.y - 9}
                  fill={p.highlight ? lit : label}
                  fontFamily={stackOf(regs.axis.fontFamily)}
                  fontSize={15}
                  fontWeight={p.highlight ? 700 : (regs.axis.fontWeight as number)}
                >
                  {p.name}
                </text>
                <text
                  pointerEvents="none"
                  x={o.x + PANEL.w}
                  y={o.y - 9}
                  fill={p.highlight ? lit : label}
                  fontFamily={stackOf(regs.value.fontFamily)}
                  fontSize={15}
                  fontWeight={700}
                  textAnchor="end"
                >
                  {p.endLabel}
                </text>
              </g>
            );
          })}

          {/* THE VERDICT EACH PANEL EARNS AGAINST THE CARRIED COUNTRY. Every option's six are drawn
              at the same place in every state and revealed by opacity, so the row under each panel is
              reserved in the plate and nothing on the page moves when a country is carried in — the
              owner's first ruling, and here it costs nothing. `aria-hidden` because thirty-six
              strings stacked six deep is not a reading for a screen reader; that reader gets the
              sentence under the pills, in a live region, which is where the derived numbers are. */}
          <g aria-hidden="true">
            {verdicts.map((v) => {
              const o = originByCode.get(v.panel) as { x: number; y: number };
              return (
                <text
                  key={`v-${v.slug}-${v.panel}`}
                  data-carry-verdict={v.slug}
                  pointerEvents="none"
                  x={o.x}
                  y={o.y + PANEL.h + 16}
                  fill={quiet}
                  fontFamily={stackOf(regs.axis.fontFamily)}
                  fontSize={13}
                  fontWeight={regs.axis.fontWeight as number}
                >
                  {v.text}
                </text>
              );
            })}
          </g>
        </svg>
        <div className="overlay" aria-hidden="true" />
        <div className="x-axis" />
      </div>

      <p className="chart-reading" style={{ ...regs.body, margin: "6px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "4px 0 0" }}>{source}</p>
    </figure>
  );
}
