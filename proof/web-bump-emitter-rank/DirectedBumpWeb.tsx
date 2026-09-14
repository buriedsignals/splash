/**
 * The world ranking of annual CO₂ emitters, 1990 to 2024, drawn as a bump chart THROUGH the design
 * base and delivered as an interactive page.
 *
 * `rank-is-printed-on-the-entry` — a bump's vertical position IS a rank, and a rank is a number, so
 * every entry carries it in words at both ends rather than leaving the reader to count rows.
 *
 * BOTH ENDS CARRY A NAME, and that is collision-free BY CONSTRUCTION rather than by luck: in any one
 * year the drawn countries hold DISTINCT ranks, so no two labels in one column can share a row. The
 * component asserts it on the real ranks at both ends and throws otherwise.
 *
 * WHAT THE WEB ADDS, AND IT IS NOT THE VALUE ALONE. Two controls, and they do not overlap:
 *
 *   1. ONE MARK PER YEAR — never one per country per year, which would make a pointer resolving by x
 *      ambiguous between six lines stacked in one column — answers with the subject's own rank that
 *      year, its emissions in that year, and who sat immediately above and below it.
 *   2. THE FIELD THIS CHART DOES NOT DRAW. Ten rows are ten places in the world and this plate draws
 *      six lines on them, so four rows are held at every step by countries with no line here. A line
 *      that falls is a line falling past nobody the reader can name — Germany goes 5th to 10th and
 *      the picture never says it was Iran, Saudi Arabia, Indonesia and South Korea. Following a line
 *      (`chart-web/assets/follow.ts`) names them, rings every crossing on its own line, and states
 *      the whole walk run by run. The subject is NOT among the options: its line is the claim, and
 *      `assertFollowDeclaration` is handed its key and refuses any option that names it.
 *
 * NOTHING HERE EMITS A TRANSFORM FOR THE CONTROL. Every ring is drawn once at its own crossing and
 * hidden; the stylesheet only reveals it.
 *
 * THE LABELS GET A COLUMN OF THEIR OWN, AND IT IS MEASURED. The committed render put the finishing
 * labels inside the plot cell at `left: 75 %` with `max-width: 25 %` of the plot — 310 px at 1400 and
 * 54 px at 375, so they wrapped to three lines and overlapped each other by up to 36 px. A label that
 * names a line needs room that is a property of the STRING and of the direction's own register, not a
 * share of whatever the plot happens to be, so both gutters are measured here in the face the page
 * will actually draw in and the plot is what is left.
 */

import { mix, adjustToContrast, contrast, TEXT_CONTRAST_MIN, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { measureText } from "#shared/chart-beat/render-still.mjs";
import { webRegisters, figureVars, noteAnchor } from "#shared/design-base/web.mjs";
import { registerOf, leadOf } from "#shared/design-base/register.mjs";
import {
  assertFollowDeclaration,
  followChromeCss,
  followCss,
  followNotesForMarkup,
  followOptionsForMarkup,
  followRingsForMarkup,
  type FollowDeclaration,
} from "../../skills/chart-web/assets/follow.ts";

export const FRAME = { width: 1000, height: 330 };
/** The gap the shared stylesheet puts between the plot and an x-axis label's own box
 *  (`.axis-label.x { top: 6px }`). Named here because the row below is measured from it. */
const X_AXIS_OFFSET_PX = 6;

const SCOPE = ".chart-figure";
const FOLLOW_ID_PREFIX = "chart-follow";
const REVEAL_MS = 220;
/** The gap between a label column and the plot it names, in CSS pixels. */
const LABEL_GAP = 10;
/** A ring's stroke, in reader pixels, drawn `non-scaling-stroke` so it is one hairline at every width. */
const RING_PX = 2;

export type Line = {
  code: string;
  name: string;
  ranks: number[];
  startLabel: string;
  endLabel: string;
};

export type Crossing = { year: number; rank: number; text: string };

const pct = (value: number, extent: number) => (value / extent) * 100;

export function DirectedBumpWeb({
  lines,
  years,
  marks,
  subject,
  maxRank,
  crossings,
  follow,
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
  years: number[];
  marks: { year: number; rank: number; detail: string }[];
  subject: string;
  maxRank: number;
  crossings: Crossing[];
  follow: FollowDeclaration;
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

  /**
   * THE FIELD'S OWN INK, AND THE STEP BACK IT TAKES, BOTH MEASURED AGAINST THIS DIRECTION'S GROUND.
   *
   * Two values rather than one, because "the others recede" has to be a real change and must still
   * leave a line a reader can see. `dimmed` sits ON the non-text floor and `other` a clear step above
   * it; neither is an opacity, which is the shape of the defect `proof/web-slope-europe-lowcarbon`
   * measured — a neutral lifted to 3:1 and then drawn at 0,75 opacity reaches the reader at 2,19:1.
   */
  let other = mix(ground, ink, 0.34);
  if (contrast(other, ground) < 4.5) other = adjustToContrast(other, ground, 4.5) ?? other;
  const dimmed = adjustToContrast(mix(ground, ink, 0.2), ground, NON_TEXT_CONTRAST_MIN) ?? other;
  if (contrast(dimmed, ground) < NON_TEXT_CONTRAST_MIN)
    throw new Error(
      `the field steps back to ${dimmed}, which measures ${contrast(dimmed, ground).toFixed(3)}:1 ` +
        `against the ground — under the ${NON_TEXT_CONTRAST_MIN}:1 non-text floor. A line a reader ` +
        `can no longer see is not a line that stepped back, it is a line that left`,
    );
  /** The page's own text ink, floor-adjusted. EVERY name on this plate is drawn in it — see below. */
  const labelInk = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;

  // Collision-free by construction, and proven rather than trusted.
  for (const column of [0, years.length - 1]) {
    const seen = new Set(lines.map((l) => l.ranks[column]));
    if (seen.size !== lines.length)
      throw new Error(
        `two labels would share a row in the ${years[column]} column: ranks ` +
          `${lines.map((l) => l.ranks[column]).join(", ")}`,
      );
  }

  /**
   * THE TWO GUTTERS, MEASURED IN THE FACE THE PAGE WILL DRAW IN.
   *
   * `registerOf` rather than the CSS strings, for the reason `measurable` states: a gutter is
   * measured in the size the page DRAWS at, which is the cap-height-resolved one, and measuring the
   * filed size while drawing the resolved one is the same class of defect as measuring one face and
   * drawing another.
   */
  const axisReg = registerOf(direction, "axis", { family: "chart" });
  const valueReg = registerOf(direction, "value", { family: "chart" });
  // The subject's own two names are drawn at 700 and every other at the register's own weight, so the
  // widest string is measured at the weight IT will be set in rather than at one weight for all six.
  const measureAll = (pick: (l: Line) => string, reg: any) =>
    Math.max(
      ...lines.map((l) =>
        measureText(pick(l), {
          fontSize: reg.fontSize,
          fontWeight: l.code === subject ? 700 : (reg.fontWeight as number),
          fontFamily: reg.fontFamily,
        }),
      ),
    );
  /** The subject's decorative swatch and the space after it, in CSS pixels — see the swatch below. */
  const SWATCH_PX = Math.round(axisReg.fontSize * 0.55) + 6;
  const startGutter = Math.ceil(measureAll((l) => l.startLabel, axisReg) + SWATCH_PX + LABEL_GAP);
  const endGutter = Math.ceil(measureAll((l) => l.endLabel, valueReg) + SWATCH_PX + LABEL_GAP);

  /**
   * THE RANK PITCH'S OWN FLOOR, AND IT IS THE REGISTER'S LEADING RATHER THAN A TYPED NUMBER.
   *
   * Ten rank rows inside an aspect-ratio box are 7,7 px apart at a 375 px viewport, against a label
   * 12,6 px tall — so the rows collide however tightly the labels are led, and the two `lineHeight:
   * 1.15` literals this file used to carry were tightening a block that was overlapping by three
   * times its own height. The rows need ROOM, and how much is a property of the direction's own type:
   * one line of the taller of the two label registers, per rank.
   */
  const pitchFloor = Math.max(leadOf(axisReg), leadOf(valueReg));
  const plotFloor = Math.ceil(pitchFloor * maxRank);
  /** The year row's own height: one line of the axis register plus the offset the shared stylesheet
   *  drops it by. It was the literal 28, which is two lines of nocturne's 10 px axis and one and a
   *  half of creme's — height taken off the plot in every direction to fit a row nothing fills. */
  const xAxisRowPx = Math.ceil(leadOf(axisReg) + X_AXIS_OFFSET_PX);

  /**
   * WHERE THE CROSSING CAPTIONS STOP FITTING, ASKED OF THE GRAPHIC RATHER THAN OF THE WINDOW.
   *
   * The captions are the argument — each names a country the subject passed and the year — so they
   * are drawn in every state of this page. What is NOT fixed is where: anchored beside their own
   * rings while the plot can hold them, and printed as one sentence under the plot when it cannot.
   * At 375 px the plot is 126 px wide and the three captions measure 247 px between them, so all
   * three printed through each other and through the lines.
   *
   * The threshold is MEASURED, in the direction's own annot register, on the real strings: the plot
   * must be at least as wide as the three captions laid end to end. And it is asked with
   * `@container` of the FIGURE rather than with a media query of the window, because this figure is
   * embedded as often as it is opened on its own, and the window's width is not its width.
   */
  const annotReg = registerOf(direction, "annot", { family: "chart" });
  const captionRoom = Math.ceil(
    crossings.reduce(
      (total, c) =>
        total +
        measureText(c.text, {
          fontSize: annotReg.fontSize,
          fontWeight: annotReg.fontWeight as number,
          fontFamily: annotReg.fontFamily,
          fontStyle: annotReg.fontStyle,
        }),
      0,
    ),
  );
  const anchoredFrom = startGutter + endGutter + captionRoom;
  /** The air between two stacked captions in the narrow state — a quarter of the annot register's
   *  own line, never a typed number: nocturne's annot leads at 14,0 and creme's at 18,2. */
  const captionGap = Math.max(2, Math.round(leadOf(annotReg) / 4));

  const x = (i: number) => (i / (years.length - 1)) * FRAME.width;
  const y = (rank: number) => ((rank - 0.5) / maxRank) * FRAME.height;
  /** `null` is a rank the country did not hold that year, and it BREAKS the path rather than being
   *  bridged — `types/bump.md`'s own rule. None of the six needs it on this file; the path is written
   *  to honour it so a file that did would break the line rather than invent a rank. */
  const path = (ranks: (number | null)[]) => {
    const parts: string[] = [];
    let open = false;
    ranks.forEach((r, i) => {
      if (r === null) {
        open = false;
        return;
      }
      parts.push(`${open ? "L" : "M"} ${x(i)} ${y(r)}`);
      open = true;
    });
    return parts.join(" ");
  };

  // ── THE FOLLOW, REFUSED BEFORE IT IS DRAWN ────────────────────────────────────────────────────
  // Handed the six lines and the key the plate accents, so an option lighting a line that is not
  // there, or one that could take the argument off its accent, is caught here.
  assertFollowDeclaration(follow, { drawnKeys: lines.map((l) => l.code), protect: subject });
  const followOptions = followOptionsForMarkup(follow, FOLLOW_ID_PREFIX);
  const followNotes = followNotesForMarkup(follow);
  const followRings = followRingsForMarkup(follow);

  /**
   * TWO EVENTS CAN LAND ON ONE POINT, and drawing them as one circle twice says one thing happened.
   * Germany's own file does it: in 2022 it passed Saudi Arabia and was passed by Indonesia in the
   * same step, so its rank did not move and both rings sit at (2022, 8th). Each later one is drawn
   * CONCENTRIC to the first rather than on top of it, so the picture says two and each still carries
   * its own words.
   */
  const ringRadius = (i: number) =>
    5 +
    3 *
      followRings
        .slice(0, i)
        .filter(
          (other) =>
            other.slug === followRings[i].slug &&
            other.stepIndex === followRings[i].stepIndex &&
            other.position === followRings[i].position,
        ).length;

  /**
   * THE DEFAULT STATE OF A NAME AS A RULE, NOT AN INLINE COLOUR.
   *
   * An inline `color` beats every generated selector there is, so with the ink spread onto each span
   * the follow's own option rules could light nothing — the defect `proof/web-slope-europe-lowcarbon`
   * records at `[data-axis]`. The names take `currentColor` from a class rule and the ink arrives as
   * a custom property.
   */
  const css = [
    `${SCOPE} .bump-name { color: var(--label-ink); }`,
    // THE THIRD COLUMN. The shared stylesheet lays the plot out in two (gutter, chart); the
    // finishing labels live in a third, so they are inside the figure and have room measured from
    // their own strings. Nothing else about the grid changes.
    `${SCOPE} .chart-plot .end-axis { grid-column: 3; grid-row: 1; position: relative; }`,
    `${SCOPE} .chart-plot .end-axis .end-label { background: none; padding: 0; }`,
    `${SCOPE} { container-type: inline-size; }`,
    // ── WHERE A CAPTION GOES WHEN IT CANNOT STAND BESIDE ITS OWN RING ────────────────────────
    //
    // It does NOT go away. `verify-web.mjs` checks that every word inside `.chart-plot .overlay` is
    // drawn with opacity 1 and not hidden, at every viewport it drives, and it is right to: these
    // three captions name the countries the claim is about. A first pass here hid them at phone
    // width and put the same crossings in a sentence under the plot; all three directions failed
    // that check, which is the guard doing exactly its job.
    //
    // So they move instead. Below the measured threshold they stop being anchored to their rings —
    // which is what `noteAnchor`'s `max-width: min(46%, 24em)` makes impossible anyway, 58 px of a
    // 126 px plot, three captions wrapped to two lines each in a 19 px rank pitch — and stack in the
    // plot's own empty bottom band, each on the opaque chip `.note` already carries, in the order
    // they happen. The overlay becomes a bottom-aligned column and the captions FLOW in it rather
    // than being seated at typed offsets: seated, they were one line each and 140 px of nocturne's
    // tracked uppercase ran straight through "10e Allemagne" in a 126 px plot. Flowing, they wrap
    // inside the plot and cannot leave it. Every word is still drawn and still inside the plot.
    //
    // `!important` on the positional properties and nowhere else: the anchored position is an INLINE
    // style computed from the mark's own x, which beats any generated rule (the defect this format
    // records as "a `regs.*` spread inline beats every generated rule"). The font, the colour and
    // the chip stay the register's.
    `@container (max-width: ${anchoredFrom - 1}px) {`,
    `  ${SCOPE} .chart-plot .overlay { display: flex; flex-direction: column; justify-content: flex-end; align-items: flex-start; }`,
    `  ${SCOPE} .chart-plot .overlay .note {`,
    `    position: static !important; left: auto !important; right: auto !important; top: auto !important;`,
    `    transform: none !important; max-width: 100% !important; margin-bottom: ${captionGap}px;`,
    `  }`,
    `}`,
    followChromeCss({ scope: SCOPE }),
    followCss(follow, {
      scope: SCOPE,
      idPrefix: FOLLOW_ID_PREFIX,
      lit: {
        stroke: "var(--label-ink)",
        width: 2.6,
        ink: "var(--label-ink)",
        weight: "700",
        ring: "var(--label-ink)",
        ringWidth: RING_PX,
      },
      dim: { stroke: "var(--dim-ink)", ink: "var(--muted)", weight: String(valueReg.fontWeight) },
      revealMs: REVEAL_MS,
    }),
  ].join("\n\n");

  /**
   * THE SUBJECT IS TOLD APART BY WEIGHT AND BY A SWATCH, NEVER BY PAINTING ITS NAME IN ITS OWN HUE.
   *
   * `chart-beat/references/types/bump.md` names this failure for this exact type, after a shipped one
   * measured under the 4.5:1 text floor — and the committed render of this page did it, in all three
   * directions: `color: l.code === subject ? accent : ink` on both the start and the end label. The
   * sheet's own fix is carried here: the name is in the page's text ink, and the colour association
   * travels on a small DECORATIVE mark beside it, which is exempt from the text-contrast rule in a
   * way a name never is. The swatch is `aria-hidden` for the same reason it is exempt.
   */
  const swatch = (code: string) =>
    code === subject ? (
      <span
        aria-hidden="true"
        style={{
          display: "inline-block",
          width: `${Math.round(axisReg.fontSize * 0.55)}px`,
          height: `${Math.round(axisReg.fontSize * 0.55)}px`,
          borderRadius: "50%",
          background: accent,
          marginRight: "6px",
          verticalAlign: "baseline",
        }}
      />
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
        ["--label-ink" as string]: labelInk,
        ["--dim-ink" as string]: dimmed,
        ...figureVars(regs),
      }}
    >
      {/* This beat's own stylesheet, carried inside the figure it styles. The format's shared
          `buildCss` emits the chrome for a FILTER, which this beat does not declare and must not:
          nothing may leave this picture, because the tangle a reader follows a line THROUGH is the
          comparison. */}
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div className="chart-header">
        <p className="chart-eyebrow" style={{ ...regs.eyebrow, margin: "0 0 6px" }}>{eyebrow}</p>
        <h2 className="chart-title" style={{ ...regs.display, margin: "0 0 6px" }}>{title}</h2>
        <p className="chart-caveat" style={{ ...regs.body, margin: 0 }}>{caveat}</p>
      </div>

      {/* THE CONTROL. Native radios in a real `<fieldset>` with a `<legend>` — a radio group to the
          keyboard and to a screen reader before this page's stylesheet does anything to it. Each
          accessible name CONTAINS its visible one, or `assertFollowDeclaration` refuses the
          declaration (WCAG 2.5.3). */}
      <fieldset className="chart-follow">
        <legend>{follow.label}</legend>
        <div className="options">
          {followOptions.map((option) => (
            <label key={option.id}>
              <input
                id={option.id}
                type="radio"
                name="chart-follow"
                value={option.slug}
                aria-label={option.announce}
                defaultChecked={option.isNone}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* THE SENTENCE THE FOLLOW OWES THE READER — the walk run by run, the net displacement, and
          every country it passed or was passed by WITH THE YEAR, including the ones this chart does
          not draw. The rings answer the reader who is looking at the picture; this answers the one
          who is not, and it is where the derived readings live. The untouched option reveals none:
          it is not a trajectory, it is the claim. */}
      <div className="follow-notes" role="status">
        {followNotes.map((note) => (
          <p data-follow-note={note.slug} key={note.slug}>{note.text}</p>
        ))}
      </div>

      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: `${startGutter}px`,
          ["--end-gutter" as string]: `${endGutter}px`,
          ["--x-axis-h" as string]: `${xAxisRowPx}px`,
          // A THIRD COLUMN, so the finishing labels are inside the box the lines are drawn in and
          // have room that is a property of the strings rather than of the plot's width.
          gridTemplateColumns: `var(--y-gutter) 1fr var(--end-gutter)`,
          aspectRatio: `${FRAME.width + startGutter + endGutter} / ${FRAME.height + xAxisRowPx}`,
          // The rank rows' own floor — see `plotFloor` above. It is a minimum, not a height: in a
          // window with room the aspect ratio is still exactly what it was.
          minHeight: `${plotFloor + xAxisRowPx}px`,
        }}
      >
        <div className="y-axis">
          {lines.map((l) => (
            <span
              key={l.code}
              className="axis-label y bump-name"
              data-follow-label={l.code === subject ? undefined : l.code}
              style={{
                ...regs.axis,
                color: undefined,
                fontWeight: l.code === subject ? 700 : regs.axis.fontWeight,
                top: `${pct(y(l.ranks[0]), FRAME.height)}%`,
              }}
            >
              {swatch(l.code)}
              {l.startLabel}
            </span>
          ))}
        </div>

        <svg
          role="group"
          aria-label={title}
          xmlns="http://www.w3.org/2000/svg"
          className="chart"
          viewBox={`0 0 ${FRAME.width} ${FRAME.height}`}
          preserveAspectRatio="none"
        >
          <desc>{alt}</desc>
          <rect x={0} y={0} width={FRAME.width} height={FRAME.height} fill={ground} />

          {Array.from({ length: maxRank }, (_, i) => i + 1).map((r) => (
            <line key={r} x1={0} x2={FRAME.width} y1={y(r)} y2={y(r)} stroke={grid} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          ))}

          {/* The field. `data-follow-line` is what the control reaches; the subject's own path below
              deliberately carries none, which is why no state of this page can dim the claim. */}
          {lines.filter((l) => l.code !== subject).map((l) => (
            <path
              key={l.code}
              data-follow-line={l.code}
              d={path(l.ranks)}
              fill="none"
              stroke={other}
              strokeWidth={direction.stroke?.rule ? direction.stroke.rule * 2 : 1.6}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {lines.filter((l) => l.code === subject).map((l) => (
            <path key={l.code} d={path(l.ranks)} fill="none" stroke={accent} strokeWidth={direction.stroke?.series ?? 2.4} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          ))}

          {/* Each crossing the argument rests on, ringed on the subject's own line. Drawn
              unconditionally: it is the claim, not a reading behind a control. */}
          {crossings.map((c) => (
            <circle
              key={c.year}
              cx={x(years.indexOf(c.year))}
              cy={y(c.rank)}
              r={5}
              fill={ground}
              stroke={accent}
              strokeWidth={RING_PX}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* EVERY FOLLOWED LINE'S CROSSINGS, DRAWN ONCE AT THEIR OWN STEP AND HIDDEN, and drawn
              AFTER the lines so a ring the reader asked for is never buried under one. The `<title>`
              is the ring's own words: a native tooltip, revealed and never printed, which is why
              `defaultPrintedText` excludes it and why it costs the census nothing. */}
          {followRings.map((ring, i) => (
            <circle
              key={ring.key}
              data-follow-ring={ring.key}
              cx={x(ring.stepIndex)}
              cy={y(ring.position)}
              r={ringRadius(i)}
              fill={ground}
              stroke="none"
              vectorEffect="non-scaling-stroke"
            >
              <title>{ring.text}</title>
            </circle>
          ))}

          {marks.map((m) => (
            <circle
              key={m.year}
              className="pt"
              cx={x(years.indexOf(m.year))}
              cy={y(m.rank)}
              r={5}
              fill="transparent"
              stroke="none"
              tabIndex={0}
              role="img"
              aria-label={m.detail}
              data-detail={m.detail}
            />
          ))}
          <rect className="hit-area" x={0} y={0} width={FRAME.width} height={FRAME.height} fill="transparent" pointerEvents="all" />
        </svg>

        {/* The crossing captions sit OVER the plot, where the crossings are. The finishing labels do
            not: they have a column of their own, below. */}
        <div className="overlay" aria-hidden="true">
          {crossings.map((c) => (
            <span
              key={c.year}
              className="note"
              style={{
                ...regs.annot,
                ...noteAnchor(pct(x(years.indexOf(c.year)), FRAME.width)),
                top: `${pct(y(c.rank) - FRAME.height / (maxRank * 2), FRAME.height)}%`,
                transform: `${noteAnchor(pct(x(years.indexOf(c.year)), FRAME.width)).transform} translateY(-100%)`,
              }}
            >
              {c.text}
            </span>
          ))}
        </div>

        <div className="end-axis">
          {lines.map((l) => (
            <span
              key={l.code}
              className="end-label bump-name"
              data-follow-label={l.code === subject ? undefined : l.code}
              style={{
                ...regs.value,
                color: undefined,
                fontWeight: l.code === subject ? 700 : regs.value.fontWeight,
                left: `${LABEL_GAP}px`,
                top: `${pct(y(l.ranks[l.ranks.length - 1]), FRAME.height)}%`,
                transform: "translateY(-50%)",
              }}
            >
              {swatch(l.code)}
              {l.endLabel}
            </span>
          ))}
        </div>

        <div className="x-axis">
          {[years[0], years[Math.floor(years.length / 2)], years[years.length - 1]].map((yr) => (
            <span key={yr} className="axis-label x" style={{ ...regs.axis, left: `${pct(x(years.indexOf(yr)), FRAME.width)}%` }}>
              {yr}
            </span>
          ))}
        </div>
      </div>

      <p className="chart-reading" style={{ ...regs.body, margin: "10px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>{source}</p>
    </figure>
  );
}
