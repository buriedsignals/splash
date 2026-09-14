/**
 * Sixteen European countries' low-carbon share in 2000 and in 2024, drawn as a slopegraph THROUGH
 * the design base and delivered as an interactive page.
 *
 * `the-slope-carries-direction-and-the-number-carries-magnitude` — the angle says which way and how
 * fast; the two printed numbers say how much. Neither is asked to do the other's job, which is why
 * a slopegraph can afford exactly two rails and no axis between them.
 *
 * A CROSSING IS THE ONE THING A SLOPEGRAPH EXISTS TO SHOW, so it is the one thing that must not be
 * believed on sight: the crossings are derived — a pair crosses when the sign of their gap flips
 * between the rails — and the subject's own crossing is ringed AT THE POINT THE TWO LINES ACTUALLY
 * MEET, which is the parameter `t` the runner solves for and hands over.
 *
 * WHAT THE WEB ADDS, AND IT IS THE PIVOT ITSELF. The plate can hold one pivot and it is the
 * author's: every line is read against France because France is what the headline names. This page
 * gives the pivot to the reader — `chart-web/assets/level.ts` lays a chosen country's OWN two
 * levels flat across both rails, so the fifteen others are read against it, and the sentence
 * underneath carries the crossings that choice implies in both directions. And every connector
 * answers for itself: what LINKS its two ends, which is the one reading a per-endpoint tooltip
 * cannot give.
 *
 * NOTHING HERE EMITS A TRANSFORM. Every option's two rules are drawn once at their own height and
 * hidden; the stylesheet only reveals them.
 */

import { mix, adjustToContrast, contrast, TEXT_CONTRAST_MIN, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { measureText, measureTextBand, requestedFamily } from "#shared/chart-beat/render-still.mjs";
import { webRegisters, figureVars } from "#shared/design-base/web.mjs";
import {
  assertLevelDeclaration,
  levelCss,
  levelChromeCss,
  levelOptionsForMarkup,
  levelNotesForMarkup,
  levelRulesForMarkup,
  type LevelDeclaration,
} from "../../skills/chart-web/assets/level.ts";

export const FRAME = { width: 900, height: 460 };

/** The rails' own top and bottom, in geometry units. TOP leaves the rail HEADING somewhere to be
 *  drawn: at 30 it did not, and "2000" / "2024" were rendered with their ascenders cut off by the
 *  viewBox in all three directions — the first thing visible in the committed render. */
const TOP = 52;
const BOT = 428;
/** The floor a seated label may not pass, and it is THE RAIL'S OWN END rather than the frame's.
 *  A gutter label names a point ON a rail; one seated below where the rail stops is beside nothing,
 *  which is the state the committed render shipped — Pologne's label sat 13 units under the end of
 *  the 2000 rail. Bounded here, the same block ends flush with the rail in all three directions. */
const FLOOR = BOT;
/** The gap between a rail and the gutter beside it, in geometry units. */
const LABEL_GAP = 10;
const SCOPE = ".chart-figure";
const LEVEL_ID_PREFIX = "chart-level";
const REVEAL_MS = 220;
const RING_PX = 1.6;
const RULE_PX = 1.4;
const RULE_CASING_PX = 4;
const RULE_DASH = "6 5";
/** The transparent twin's stroke width, in CSS pixels — the 24px touch-target floor applied to a
 *  target a reader aims at along its length, half either side of the line they can see. */
const LINE_HIT_WIDTH = 24;

/** The ONE scale on this beat, called with the same arguments by the runner (which places the
 *  yardstick's rules) and by the composition (which draws the lines) — so a rule can never be laid
 *  at a height no line uses. */
export function slopeY(lo: number, hi: number): (v: number) => number {
  return (v) => BOT - ((v - lo) / (hi - lo)) * (BOT - TOP);
}

export type Line = {
  code: string;
  name: string;
  before: number;
  after: number;
  beforeLabel: string;
  afterLabel: string;
  highlight: boolean;
  detail: string;
};

export function DirectedSlopeWeb({
  lines,
  railLabels,
  yTicks,
  crossings,
  levels,
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
  lines: Line[];
  railLabels: { left: string; right: string };
  yTicks: number[];
  /** `t` is where along the connector the pair actually meets, 0 at the left rail and 1 at the
   *  right. Solved from the two gaps in the runner and asserted there; the ring is drawn there and
   *  nowhere else. */
  crossings: { at: number; t: number; text: string }[];
  levels: LevelDeclaration;
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

  // ── THE INKS, EACH MEASURED AT THE VALUE THE PAGE ACTUALLY PAINTS ──────────────────────────
  //
  // THE DEFECT THIS REPLACES, measured on the committed render. `thread` was lifted to the 3:1
  // non-text floor and then every context line was drawn at `strokeOpacity={0.75}` — so what
  // reached the reader was 2,188:1 in creme, 2,193:1 in rapport and 2,233:1 in nocturne. Fourteen
  // of the sixteen lines on a plate whose whole claim is "all sixteen rose" were under the floor.
  // A colour is measured where it lands, so the opacity is gone and the neutral is the neutral.
  let thread = mix(ground, ink, 0.34);
  if (contrast(thread, ground) < NON_TEXT_CONTRAST_MIN)
    thread = adjustToContrast(thread, ground, NON_TEXT_CONTRAST_MIN) ?? thread;
  const lit = adjustToContrast(accent, ground, NON_TEXT_CONTRAST_MIN) ?? accent;
  // The accent also writes two gutter labels, which are TEXT and answer to the text floor, not the
  // non-text one. Measured here rather than assumed: all three directions already clear it
  // (6,852 / 7,309 / 10,926 against their own grounds), so this resolves to the same string — but
  // a direction that stopped clearing it would now be caught instead of shipped.
  const litText = adjustToContrast(accent, ground, TEXT_CONTRAST_MIN) ?? accent;
  if (contrast(litText, ground) < TEXT_CONTRAST_MIN)
    throw new Error(
      `the two lines the headline names write their gutter labels in ${litText}, which measures ` +
        `${contrast(litText, ground).toFixed(3)}:1 against the ground ${ground} — under the ` +
        `${TEXT_CONTRAST_MIN}:1 TEXT floor. A slopegraph has no axis, so a gutter label IS the ` +
        `value; one a reader cannot read deletes the number`,
    );
  const label = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const dimmed = adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? muted;
  const rail = mix(ground, ink, 0.5);
  const casing = ground;

  // ── THE GUTTER IS SIZED TO THE LABEL, NOT THE LABEL TO THE GUTTER ──────────────────────────
  //
  // `references/types/slope.md` states the rule and the price of breaking it: a fixed gutter sized
  // for a typical short name has previously forced the pipeline to TRUNCATE the category text to
  // make it fit, "which is not a labelling inconvenience, it's mutilating the data itself to solve
  // a layout problem". So the rails move instead. The widest of the thirty-two strings is measured
  // in the face and size this direction will really draw it in, and the rails stand that far in.
  const labelSize = Number.parseFloat(regs.axis.fontSize as string);
  const labelWeight = regs.axis.fontWeight as number;
  const labelFamily = requestedFamily(String(regs.axis.fontFamily));
  /**
   * THE STACK WITH ITS QUOTES OFF, AND IT IS NOT COSMETIC.
   *
   * A register's family arrives as `"Open Sans", Helvetica, Arial, sans-serif`. Written into an SVG
   * presentation attribute it is escaped to `font-family="&quot;Open Sans&quot;, …"`, and BOTH of
   * the format's font scanners read an attribute by stopping at the first quote — so a value that
   * OPENS with one is read as the empty string and the element is invisible to them. Measured on
   * this beat, where thirty-four of the page's forty font declarations are on `<text>`: rapport's
   * dominant stack came out Merriweather on a count of 4 against 2, the page inherited a serif, and
   * `Open Sans 400` — the face the thirty-two gutter labels are actually drawn in — was never
   * embedded at all. The reader got Helvetica for every country name and every value on the plate.
   *
   * `Open Sans, Helvetica, Arial, sans-serif` is the same stack and legal CSS: a family name made of
   * identifiers needs no quotes. It is used for the attributes only; the HTML furniture keeps the
   * register's own string.
   */
  const plainStack = (stack: unknown) => String(stack).replace(/"/g, "");
  const gutterTexts = lines.flatMap((l) => [`${l.name} ${l.beforeLabel}`, `${l.afterLabel} ${l.name}`]);
  const font = { fontSize: labelSize, fontWeight: labelWeight, fontFamily: labelFamily };
  const widest = Math.max(...gutterTexts.map((t) => measureText(t, font)));
  const gutter = Math.ceil(widest) + LABEL_GAP;
  const left = gutter;
  const right = FRAME.width - gutter;
  if (right - left < FRAME.width * 0.35)
    throw new Error(
      `the widest gutter label (${Math.ceil(widest)} units) leaves the two rails only ` +
        `${Math.round(right - left)} of ${FRAME.width} units apart — at that separation the slope ` +
        `IS the chart and there is none left. Shorten the labels' own words, or draw fewer lines`,
    );

  const lo = yTicks[0];
  const hi = yTicks[yTicks.length - 1];
  const y = slopeY(lo, hi);

  // ── THE PITCH IS MEASURED, NEVER TYPED ────────────────────────────────────────────────────
  //
  // It was 15, a literal, and the label it had to hold apart was 12 units of Open Sans — whose ink
  // band at that size is 11,79 units. The number was in the right neighbourhood by luck, and it is
  // the wrong KIND of number: nothing tied it to the face or the size the direction chose, so
  // nocturne's Montserrat and creme's Open Sans were separated by the same constant. `measureTextBand`
  // returns the real ink band of the real string in the real face, and the widest one is the floor
  // under the pitch: two labels exactly that far apart have their ink edge to edge, which is "spread
  // them apart just enough to stop overlapping" with nothing left over.
  const inkBand = Math.max(
    ...gutterTexts.map((t) => {
      const band = measureTextBand(t, font);
      return band.ascent + band.descent;
    }),
  );
  // TWO FLOORS, AND THE PITCH IS WHICHEVER IS LARGER. The ink band is what stops two labels
  // TOUCHING; the direction's own leading is what stops them looking cramped when they do not. The
  // second is read off the register rather than invented, because the interline of this beat's
  // furniture belongs to the direction and to nothing else.
  const pitch = Math.max(inkBand, Number(regs.axis.lineHeight) * labelSize);
  if ((lines.length - 1) * pitch > FLOOR - TOP)
    throw new Error(
      `${lines.length} gutter labels need ${((lines.length - 1) * pitch).toFixed(1)} units of ` +
        `pitch and the rail's own span is ${FLOOR - TOP} — at this size they cannot all be seated ` +
        `inside the frame, and the type sheet forbids buying the room back by truncating a name`,
    );

  /**
   * WHERE A GUTTER LABEL SITS, AND WHY IT IS TWO PASSES AND NOT ONE.
   *
   * The pass this replaces went TOP DOWN only, on the argument — written in its own comment — that
   * pushing down "cannot leave the frame: sixteen labels 15 units apart are 240 units in a plot
   * 400 tall". The arithmetic is right and the conclusion is wrong, because the block does not
   * start at the top of the plot: it starts at the topmost label's own VALUE. Measured on the
   * committed render, Pologne's label was seated 21 units below its own dot and 13 units BELOW THE
   * END OF THE RAIL, pointing at nothing — the exact mirror of the overflow that pass was written
   * to fix, one edge down.
   *
   * So the down pass is followed by an up pass from the floor, which is what actually bounds the
   * block. Both are deterministic and neither moves a MARK: a label may move, a dot never does.
   */
  const seat = (values: { code: string; v: number }[]) => {
    const ordered = [...values].sort((a, b) => b.v - a.v);
    const placed: number[] = [];
    let last = Number.NEGATIVE_INFINITY;
    for (const item of ordered) {
      const p = Math.max(y(item.v), last + pitch);
      placed.push(p);
      last = p;
    }
    let next = FLOOR + pitch;
    for (let i = placed.length - 1; i >= 0; i--) {
      placed[i] = Math.min(placed[i], next - pitch);
      next = placed[i];
    }
    const out = new Map<string, number>();
    ordered.forEach((item, i) => out.set(item.code, placed[i]));
    if (placed[0] < TOP - pitch)
      throw new Error(
        `seating ${values.length} labels pushed the topmost to y=${placed[0].toFixed(1)}, above the ` +
          `rail's own top at ${TOP} — the block no longer fits between the two passes`,
      );
    return out;
  };
  const leftSeat = seat(lines.map((l) => ({ code: l.code, v: l.before })));
  const rightSeat = seat(lines.map((l) => ({ code: l.code, v: l.after })));
  /** A label the placer MOVED owes the reader a leader line back to its own mark — the type sheet's
   *  own words. Half a pitch is the threshold because at that distance the label's ink no longer
   *  overlaps its dot's row at all, so the eye has stopped pairing them. */
  const strayed = (seated: number, value: number) => Math.abs(seated - y(value)) > pitch / 2;

  // ── THE YARDSTICK, REFUSED BEFORE IT IS DRAWN ─────────────────────────────────────────────
  // Handed the sixteen countries and the two rails, so an option reading its levels off a country
  // the beat does not draw, or laying a rule on only one of the two rails, is caught here.
  assertLevelDeclaration(levels, {
    drawnKeys: lines.map((l) => l.code),
    drawnSeries: [railLabels.left, railLabels.right],
    height: FRAME.height,
  });
  const levelOptions = levelOptionsForMarkup(levels, LEVEL_ID_PREFIX);
  const levelNotes = levelNotesForMarkup(levels);
  const levelRules = levelRulesForMarkup(levels);

  /**
   * THE CASING UNDER A YARDSTICK, MEASURED AGAINST EVERY INK IT CROSSES.
   *
   * A rule spans the whole plot, so it crosses the two rails and every one of the sixteen
   * connectors — and where it crosses is exactly where it is read. Drawn in one ink alone it would
   * vanish into whatever it lies over, so it is drawn twice: wider in the GROUND, then at full
   * width in the ink, both on the same dash pattern, so the halo shows only under the dashes and
   * the lines are not cut by a continuous band.
   */
  for (const crossed of [
    { ink: thread, where: "a context line" },
    { ink: lit, where: "one of the two lines the headline names" },
    { ink: rail, where: "a rail" },
  ]) {
    const behind = contrast(casing, crossed.ink);
    if (behind < NON_TEXT_CONTRAST_MIN)
      throw new Error(
        `a yardstick's casing ${casing} measures ${behind.toFixed(3)}:1 against ${crossed.where} ` +
          `(${crossed.ink}) — under the ${NON_TEXT_CONTRAST_MIN}:1 non-text floor. A yardstick is ` +
          `laid down to be read WHERE IT CROSSES A LINE`,
      );
  }
  if (contrast(label, casing) < NON_TEXT_CONTRAST_MIN)
    throw new Error(
      `a yardstick is drawn ${label} on a casing of ${casing}, which measure ` +
        `${contrast(label, casing).toFixed(3)}:1 — a rule that cannot be told from its own halo is ` +
        `a rule the reader cannot follow across the plot`,
    );

  // The rail heading's own size comes from the value register, and it is checked against the room
  // TOP leaves above the rails — the clipping the committed render shipped, turned into a refusal.
  const headSize = Number.parseFloat(regs.value.fontSize as string);
  const headFamily = requestedFamily(String(regs.value.fontFamily));
  const headBand = measureTextBand(railLabels.right, {
    fontSize: headSize,
    fontWeight: regs.value.fontWeight as number,
    fontFamily: headFamily,
  });
  const headBaseline = TOP - LABEL_GAP;
  if (headBaseline - headBand.ascent < 0)
    throw new Error(
      `the rail heading "${railLabels.right}" is drawn at ${headSize} units on a baseline of ` +
        `${headBaseline}, so its ascenders reach y=${(headBaseline - headBand.ascent).toFixed(1)} — ` +
        `above the viewBox, where they are cut off. Raise TOP or lower the heading`,
    );

  /**
   * THE DEFAULT STATE OF A GUTTER LABEL AS TWO RULES, NOT AN INLINE FILL.
   *
   * An inline `fill` beats every generated selector there is, so with the ink spread onto each
   * `<text>` the yardstick's own option rules could light nothing. The labels take `currentColor`
   * and the ink arrives as a custom property, which is what lets `levelCss` clear it by an id.
   */
  const css = [
    `${SCOPE} [data-axis] { color: var(--axis-ink); font-weight: var(--axis-weight); }`,
    ...lines
      .filter((l) => l.highlight)
      .map((l) => `${SCOPE} [data-axis="${l.code}"] { color: var(--accent-text); font-weight: 700; }`),
    `${SCOPE} [data-col] { stroke: none; }`,
    levelChromeCss({ scope: SCOPE }),
    // ── SEVENTEEN CHIPS ON ONE ROW, AND THE ROW SCROLLS ──────────────────────────────────────
    //
    // The shared chrome wraps its options, which is right for the six a grouped bar offers and
    // wrong for sixteen countries plus the untouched option: measured at 375 x 812, the wrapped
    // fieldset is 156 px tall, and with the plot already on its 120 px floor the figure overflowed
    // its own 100dvh by 76 px in creme, 49 in rapport and 182 in nocturne. Nothing is removed and
    // no option is hidden from the keyboard — the row becomes one line the reader can scroll, which
    // is 30 px. Unconditional rather than behind a width breakpoint: which width the seventeen stop
    // fitting at is a function of the direction's own body size and of sixteen country names, so a
    // typed pixel there would be a number that survives exactly one direction.
    // `min-inline-size: 0` on the fieldset and `min-width: 0` on the row are the load-bearing half,
    // and leaving them out cost a pass: a `<fieldset>`'s default `min-inline-size` is `min-content`
    // and a flex item's default `min-width` is `auto`, so the row simply grew to its content and
    // took the DOCUMENT with it — measured at 1351 px wide in a 375 px window, a horizontally
    // scrolling page rather than a scrolling strip.
    `${SCOPE} .chart-level { min-inline-size: 0; min-width: 0; }`,
    `${SCOPE} .chart-level .options { flex-wrap: nowrap; overflow-x: auto; min-width: 0; flex: 1 1 auto; overscroll-behavior-x: contain; }`,
    levelCss(levels, {
      scope: SCOPE,
      idPrefix: LEVEL_ID_PREFIX,
      lit: { ink: "var(--ink)", weight: "700", ring: "var(--ink)", ringWidth: RING_PX },
      dim: { ink: "var(--dim-ink)", weight: "var(--axis-weight)" },
      revealMs: REVEAL_MS,
    }),
  ].join("\n\n");

  const gutterLabel = (l: Line, side: "left" | "right") => {
    const seated = (side === "left" ? leftSeat : rightSeat).get(l.code)!;
    const value = side === "left" ? l.before : l.after;
    const anchorX = side === "left" ? left - LABEL_GAP : right + LABEL_GAP;
    return (
      <text
        pointerEvents="none"
        key={`${side}-${l.code}`}
        data-axis={l.code}
        x={anchorX}
        y={seated}
        fill="currentColor"
        fontFamily={plainStack(regs.axis.fontFamily)}
        fontSize={labelSize}
        letterSpacing={String(regs.axis.letterSpacing)}
        textAnchor={side === "left" ? "end" : "start"}
        dominantBaseline="middle"
      >
        {side === "left" ? `${l.name} ${l.beforeLabel}` : `${l.afterLabel} ${l.name}`}
      </text>
    );
  };

  const leader = (l: Line, side: "left" | "right") => {
    const seated = (side === "left" ? leftSeat : rightSeat).get(l.code)!;
    const value = side === "left" ? l.before : l.after;
    if (!strayed(seated, value)) return null;
    const from = side === "left" ? left - LABEL_GAP + 2 : right + LABEL_GAP - 2;
    const to = side === "left" ? left - 4 : right + 4;
    return (
      <line
        key={`lead-${side}-${l.code}`}
        pointerEvents="none"
        x1={from}
        y1={seated}
        x2={to}
        y2={y(value)}
        stroke={l.highlight ? lit : thread}
        strokeWidth={0.8}
        vectorEffect="non-scaling-stroke"
      />
    );
  };

  return (
    <figure
      className="chart-figure"
      style={{
        ["--ground" as string]: ground,
        ["--accent" as string]: accent,
        ["--accent-text" as string]: litText,
        ["--ink" as string]: ink,
        ["--muted" as string]: muted,
        ["--grid" as string]: grid,
        ["--axis-ink" as string]: label,
        ["--dim-ink" as string]: dimmed,
        ["--axis-weight" as string]: String(labelWeight),
        ...figureVars(regs),
      }}
    >
      {/* This beat's own stylesheet, carried inside the figure it styles. The format's shared
          `buildCss` emits the chrome for a FILTER, which this beat does not declare and must not:
          nothing may leave this picture, because "all sixteen rose" is the claim. */}
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div className="chart-header">
        <p className="chart-eyebrow" style={{ ...regs.eyebrow, margin: "0 0 6px" }}>{eyebrow}</p>
        <h2 className="chart-title" style={{ ...regs.display, margin: "0 0 6px" }}>{title}</h2>
        <p className="chart-caveat" style={{ ...regs.body, margin: 0 }}>{caveat}</p>
      </div>

      {/* THE CONTROL. Native radios in a real `<fieldset>` with a `<legend>` — a radio group to the
          keyboard and to a screen reader before this page's stylesheet does anything to it. Each
          accessible name CONTAINS its visible one, or `assertLevelDeclaration` refuses the
          declaration (WCAG 2.5.3). */}
      <fieldset className="chart-level">
        <legend>{levels.label}</legend>
        <div className="options">
          {levelOptions.map((option) => (
            <label key={option.id}>
              <input
                id={option.id}
                type="radio"
                name="chart-level"
                value={option.slug}
                aria-label={option.announce}
                defaultChecked={option.isNone}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* THE SENTENCE THE YARDSTICK OWES THE READER — the rank among the sixteen gains and the
          crossings the choice implies, in both directions. The rules answer the reader who is
          looking at the picture; this answers the one who is not, and it is where the derived
          readings live. Its row is reserved whether or not an option is chosen, so the plot never
          jumps. The untouched option reveals none: it is not a comparison, it is the claim. */}
      <div className="level-notes" role="status">
        {levelNotes.map((note) => (
          <p data-level-note={note.slug} key={note.slug}>{note.text}</p>
        ))}
      </div>

      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: "0px",
          ["--x-axis-h" as string]: "0px",
          aspectRatio: `${FRAME.width} / ${FRAME.height}`,
          margin: "10px 0 0",
        }}
      >
        <div className="y-axis" />
        <svg
          role="group"
          aria-label={title}
          xmlns="http://www.w3.org/2000/svg"
          className="chart"
          viewBox={`0 0 ${FRAME.width} ${FRAME.height}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <desc>{alt}</desc>
          <rect x={0} y={0} width={FRAME.width} height={FRAME.height} fill={ground} />

          <line x1={left} x2={left} y1={y(hi)} y2={y(lo)} stroke={rail} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          <line x1={right} x2={right} y1={y(hi)} y2={y(lo)} stroke={rail} strokeWidth={1} vectorEffect="non-scaling-stroke" />

          {/* The sixteen connectors, the two the headline names painted LAST so neither is buried
              under a neighbour. No opacity anywhere: see the ink block above for what that cost. */}
          {[...lines].sort((a, b) => Number(a.highlight) - Number(b.highlight)).map((l) => (
            <line
              key={l.code}
              x1={left}
              y1={y(l.before)}
              x2={right}
              y2={y(l.after)}
              stroke={l.highlight ? lit : thread}
              strokeWidth={l.highlight ? 2.4 : 1.2}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* EVERY OPTION'S TWO REFERENCES, DRAWN ONCE AT THEIR OWN HEIGHT AND HIDDEN, AND DRAWN
              AFTER THE CONNECTORS so a yardstick the reader laid down is never eaten by a line.

              RAIL TO RAIL, NOT FRAME TO FRAME. Drawn across the whole viewBox it ran straight
              THROUGH the gutter labels either side — measured with Danemark parked, where its own
              two names ("Danemark 16 %", "89 % Danemark") and four of their neighbours were struck
              out by the very rule the reader had just laid down. The plot is where the lines are
              and where a crossing can be read; the gutters are words.
              Each is TWO elements on the same `data-level-rule`, so one generated `opacity: 1`
              reveals both: the ground-coloured casing, then the ink on top of it. */}
          {levelRules.map((rule) => (
            <g key={rule.key}>
              <line
                data-level-rule={rule.key}
                x1={left}
                x2={right}
                y1={rule.y}
                y2={rule.y}
                stroke={casing}
                strokeWidth={RULE_CASING_PX}
                strokeDasharray={RULE_DASH}
                vectorEffect="non-scaling-stroke"
              />
              <line
                data-level-rule={rule.key}
                x1={left}
                x2={right}
                y1={rule.y}
                y2={rule.y}
                stroke={label}
                strokeWidth={RULE_PX}
                strokeDasharray={RULE_DASH}
                vectorEffect="non-scaling-stroke"
              />
            </g>
          ))}

          {/* The end dots ARE the marks a yardstick rings: they are filled shapes with no stroke of
              their own, so `the-subject-is-ringed-not-recoloured` costs them nothing. The
              connectors deliberately carry no `data-col` — `levelCss` takes the ring off everything
              before it lights one, and a line's ring IS its stroke. */}
          {lines.flatMap((l) => [
            <circle key={`a-${l.code}`} data-col={l.code} cx={left} cy={y(l.before)} r={3.4} fill={l.highlight ? lit : thread} vectorEffect="non-scaling-stroke" />,
            <circle key={`b-${l.code}`} data-col={l.code} cx={right} cy={y(l.after)} r={3.4} fill={l.highlight ? lit : thread} vectorEffect="non-scaling-stroke" />,
          ])}

          {/* THE CROSSING, RINGED WHERE IT HAPPENS. `t` is solved in the runner from the two gaps;
              the ring used to be drawn at the plot's own midpoint, which on this data is 98,4 % of
              the span away from the place the two lines actually meet — a ring around empty air on
              a plate whose whole subject is that crossing. */}
          {crossings.map((c) => (
            <circle
              key={c.text}
              cx={left + c.t * (right - left)}
              cy={y(c.at)}
              r={9}
              fill="none"
              stroke={lit}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* THE READING THAT BELONGS TO A LINE IS REACHABLE ON THE LINE. A transparent twin over
              each connector, `pointer-events: stroke` (the format's own `.line-hit` rule) so the
              hit region is the stroke and not a diagonal's mostly-empty bounding box, and
              `initLines` resolves a pointer to the NEAREST stroke rather than to whichever twin
              caught the event — which is what this very beat measured wrong before that rule
              existed (21 of 60 probes answered with a different country at 375px). */}
          {lines.map((l) => (
            <path
              key={`hit-${l.code}`}
              className="line-hit"
              d={`M ${left} ${y(l.before)} L ${right} ${y(l.after)}`}
              fill="none"
              stroke="transparent"
              strokeWidth={LINE_HIT_WIDTH}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              tabIndex={0}
              role="img"
              aria-label={l.detail}
              data-detail={l.detail}
            />
          ))}

          {/* Words inside the viewBox: this beat letterboxes rather than stretching, so an HTML
              overlay in percentages of the grid cell would not land on the rails. */}
          <text pointerEvents="none" x={left} y={headBaseline} fill={label} fontFamily={plainStack(regs.value.fontFamily)} fontSize={headSize} fontWeight={regs.value.fontWeight as number} textAnchor="middle">
            {railLabels.left}
          </text>
          <text pointerEvents="none" x={right} y={headBaseline} fill={label} fontFamily={plainStack(regs.value.fontFamily)} fontSize={headSize} fontWeight={regs.value.fontWeight as number} textAnchor="middle">
            {railLabels.right}
          </text>

          {lines.flatMap((l) => [leader(l, "left"), leader(l, "right")])}
          {lines.map((l) => gutterLabel(l, "left"))}
          {lines.map((l) => gutterLabel(l, "right"))}
        </svg>
        <div className="overlay" aria-hidden="true" />
        <div className="x-axis" />
      </div>

      {crossings.map((c) => (
        <p key={c.text} className="chart-reading" style={{ ...regs.annot, margin: "8px 0 0" }}>{c.text}</p>
      ))}
      <p className="chart-reading" style={{ ...regs.body, margin: "6px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>{source}</p>
    </figure>
  );
}
