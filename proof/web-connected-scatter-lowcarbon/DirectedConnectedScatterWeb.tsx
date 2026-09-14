/**
 * Sixteen European countries between 2000 and 2024, each an ARROW in a plane whose two axes are two
 * INDEPENDENT shares — how clean a country's own electricity is, and how much of the sixteen's
 * low-carbon total it carries. Drawn THROUGH the design base and delivered as an interactive page.
 *
 * THE GESTURE IS THIS TYPE'S OWN, AND IT COMES FROM THE ONE PROPERTY NO OTHER TYPE IN THIS
 * CATALOGUE HAS: HERE THE MARK IS A DISPLACEMENT. A bar has a length, a cell an area, a band a
 * thickness — one number each, read against one axis. This mark is a tail, a head and the direction
 * between them, over two axes measuring two different things, so it carries a reading neither axis
 * carries alone: the bearing. And that bearing is the hypotenuse of a right triangle the plate never
 * draws. France goes right and down, and the reader is asked to decompose that by eye into "+4,2
 * points at home" and "−11,8 points of European weight", at two different scales, across a plate
 * where fifteen other segments cross it. Sixteen hypotenuses, thirty-two legs, none of them drawn.
 *
 * SO THE READER CHOOSES WHICH READING THE HEAD IS AIMED AT (`assets/aim.ts`, a new vocabulary). The
 * tail never moves — it is the country's 2000 position, and it is also the mark the pointer resolves
 * on. Only the head swings, and EVERY head it swings to is a real point of the same plane, so not a
 * tick, not a gridline and not an axis title ever changes meaning:
 *
 *   Le trajet   (default) the full move          Chez eux    the horizontal leg: sixteen arrows,
 *   En Europe   the vertical leg: eleven up,                  every one of them pointing right
 *               five down                        Total figé  the same y against the 2000 total:
 *                                                            not one of the sixteen goes down
 *
 * The first three are the triangle — hypotenuse, then one leg, then the other. The fourth explains
 * the claim instead of restating it: the five that lost weight all produced MORE low-carbon
 * electricity than in 2000, and lost weight because the denominator grew 59,6 %.
 *
 * NOTHING ON THIS PAGE MOVES WITHOUT A REASON THE READER CAN SEE. No word moves at all: the five
 * drawn country names sit at their TAILS, which no option touches, and each option's figure is a
 * separate span at its own head — revealed, never travelled. The static sibling's rule is the
 * opposite ("label the later state only; the ring carries nothing") and is knowingly not kept: there
 * the later state is the only fixed thing about an entity, here it is the only thing that is not.
 *
 * WHAT THE POINTER ADDS. Both axes are SHARES, so neither can state the quantity underneath them.
 * Every country answers with both dates on both axes, the absolute low-carbon generation behind
 * them, its own growth against the sixteen's, and what it would weigh at the 2000 total. What
 * answers is the arrow itself — shaft and head together, lifted from their own ink by a SOUGHT dose
 * — never a circle plated over it.
 */

import {
  adjustToContrast,
  contrast,
  mix,
  NON_TEXT_CONTRAST_MIN,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";
import { figureVars, noteAnchor, webRegisters } from "#shared/design-base/web.mjs";
import {
  aimChromeCss,
  aimCss,
  aimFiguresForMarkup,
  aimNotesForMarkup,
  aimOptionsForMarkup,
  assertAimDeclaration,
  type AimDeclaration,
} from "../../skills/chart-web/assets/aim.ts";

// The x-axis row carries BOTH the graduations and the horizontal axis title, which is why it is
// taller than this format's usual: the title used to hang in the plot's bottom-right corner, and the
// bottom of this plate is where eleven of the sixteen arrows live, so it sat on top of them in every
// state. The vertical title keeps the plot's top-left, which no arrow reaches in any of the four.
export const FRAME = { width: 820, height: 460, xAxisRowPx: 48 };

/** The scope every generated rule is written inside. */
const SCOPE = ".chart-figure";
/**
 * THE RADIO ID PREFIX, AND IT IS `chart-stack-` ON PURPOSE. `interaction-plan.ts` discovers the
 * controls a page ships by READING THE MARKUP, and its "moving or measuring control" branch looks
 * for exactly this prefix and for `data-stack-note`. Those two strings are the format's discovery
 * contract for a control that moves the picture and owes the reader a sentence; `hold.ts` makes the
 * same choice for the same reason. A third spelling would be invisible to the guard written to
 * refuse it.
 */
const AIM_ID_PREFIX = "chart-stack";
/** How long an arrow takes to swing to its new aim. Honoured only under `no-preference`. */
const SWING_MS = 420;
/** The arrowhead's own length, in geometry units. See `aim.ts` for why it is declared and clamped. */
const HEAD_UNITS = 9;
/**
 * WHAT AN ARROW TAKES UNDER THE POINTER, AND THE DOSE IS SOUGHT RATHER THAN TYPED.
 *
 * The owner refused a fixed dose on a beat where it measured 1,104:1 on `nocturne` — a mark
 * answering a pointer with a change nobody can see. A fixed fraction cannot work across three
 * directions, because the same fraction of the distance between a fill and its ink buys a different
 * ratio on a cream ground and on a midnight one. So the dose is WALKED until the step clears this
 * floor against the arrow's OWN ink, with the result still clearing the non-text floor against the
 * ground; and if the walk toward the ink runs out of room, it is retried toward the ground, because
 * on a dark direction a light fill has more room below it than above.
 */
const MARK_ACTIVE_MIN_STEP = 1.28;

/** One arrow of the plate, in the geometry's own units. */
export type Arrow = {
  key: string;
  name: string;
  tail: { x: number; y: number };
  head: { x: number; y: number };
  subject: boolean;
};
/** One anchor of the answering layer: a point its arrow really occupies in one of its states. */
export type Anchor = { key: string; x: number; y: number; detail: string; focusable: boolean };
/** One drawn name, at the tail no option touches. */
export type Name = { key: string; x: number; y: number; text: string; below: boolean };
/** One graduation, already placed in geometry units by the runner. */
export type Tick = { text: string; at: number };

const pct = (value: number, extent: number) => (value / extent) * 100;

export function DirectedConnectedScatterWeb({
  arrows,
  anchors,
  names,
  aim,
  xTicks,
  yTicks,
  xTitle,
  yTitle,
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
  arrows: Arrow[];
  anchors: Anchor[];
  names: Name[];
  aim: AimDeclaration;
  xTicks: Tick[];
  yTicks: Tick[];
  xTitle: string;
  yTitle: string;
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

  // THE ACCENT SETS TYPE HERE — the eyebrow, the subject's own name and the subject's figure — so it
  // is held to the TEXT floor and not only to the mark floor. A direction that clears one does not
  // automatically clear the other.
  const subjectInk = adjustToContrast(accent, ground, TEXT_CONTRAST_MIN) ?? accent;
  // THE OTHER FIFTEEN, IN ONE TINT OF THE SAME ACCENT AND NEVER IN FIFTEEN HUES — the static
  // sibling's own rule, and its `PALETTE.md` records why: sixteen hues would be a palette this base
  // does not own. Lifted to the non-text floor against the ground so a context arrow is never a
  // shape the reader has to guess at.
  let contextInk = mix(ground, accent, 0.5);
  if (contrast(contextInk, ground) < NON_TEXT_CONTRAST_MIN)
    contextInk = adjustToContrast(contextInk, ground, NON_TEXT_CONTRAST_MIN) ?? contextInk;
  const labelInk = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;

  // THE SOUGHT DOSE — see MARK_ACTIVE_MIN_STEP. Two poles, walked in twentieths, and the first
  // result that clears both floors wins. A fill with no answer at all is refused rather than shipped
  // dimmer than the arbitration allows.
  const activeOf = (fill: string, what: string) => {
    for (const pole of [ink, ground]) {
      for (let dose = 0.05; dose <= 1.0001; dose += 0.05) {
        const lifted = mix(fill, pole, dose);
        if (contrast(lifted, fill) < MARK_ACTIVE_MIN_STEP) continue;
        if (contrast(lifted, ground) < NON_TEXT_CONTRAST_MIN) continue;
        return lifted;
      }
    }
    throw new Error(
      `${direction.id ?? "this direction"}: ${what} (${fill}) has no answer to a pointer that both ` +
        `steps ${MARK_ACTIVE_MIN_STEP}:1 off its own ink and stays ${NON_TEXT_CONTRAST_MIN}:1 above ` +
        "the ground — an arrow that answers with a change nobody can see is no answer at all",
    );
  };
  const subjectActive = activeOf(subjectInk, "the subject's arrow");
  const contextActive = activeOf(contextInk, "a context arrow");

  // Refused before anything is drawn, against what this component is actually handed — the plate's
  // own arrows AND the anchors of its own answering layer, never the declaration alone.
  assertAimDeclaration(aim, { arrows, anchors }, { width: FRAME.width, height: FRAME.height });

  const aimOptions = aimOptionsForMarkup(aim, AIM_ID_PREFIX);
  const aimNotes = aimNotesForMarkup(aim);
  const aimFigures = aimFiguresForMarkup(aim, arrows);
  const subjectKey = arrows.find((a) => a.subject)!.key;
  const inkOf = (key: string) => (key === subjectKey ? subjectInk : contextInk);

  const css = [
    aimChromeCss({ scope: SCOPE }),
    aimCss(aim, arrows, {
      scope: SCOPE,
      idPrefix: AIM_ID_PREFIX,
      swingMs: SWING_MS,
      headUnits: HEAD_UNITS,
    }),
    // WHAT THE ANSWERING MARK BECOMES, AND WHY THE FORMAT'S OWN RULE IS NOT ENOUGH BY ITSELF. The
    // shared sheet paints a pointed mark with `fill: var(--mark-active)`, which is exactly right for
    // a rectangle and does nothing at all for a stroked segment. So the shaft takes the same value
    // on its STROKE, at (0,2,0) — above the shared rule's (0,1,0) and on a property it never sets —
    // while the head, which is a filled triangle, is already served by the shared rule. The ring is
    // pinned to the ground so that rule cannot fill it in: a hollow ring is what says "this is the
    // earlier state", and a pointer must not silently turn it into a disc.
    `${SCOPE} [data-aim-shaft].mark-active { stroke: var(--mark-active); }`,
    `${SCOPE} [data-aim-ring] { fill: var(--ground); }`,
    `${SCOPE} [data-aim-ring].mark-active { stroke: var(--mark-active); }`,
    // THE TOOLTIP IS WIDENED FROM THE FORMAT'S OWN 220 px. This page's answer carries two dates on
    // two axes, two absolute quantities, a growth rate and a counterfactual; at 220 px it set to
    // seven lines and rose clean over the pills the reader had just used. The treemap beat widened
    // it for the same reason and to the same value.
    `#tooltip { max-width: min(440px, 100vw - 32px); }`,
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
          `buildCss` emits the chrome for a FILTER, which this beat does not declare and must not —
          nothing leaves this picture, and a scatter that hid a country would change what every
          share on the vertical axis means. An aim is another mechanism and pays its own way. */}
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div className="chart-header">
        <p className="chart-eyebrow" style={{ ...regs.eyebrow, margin: "0 0 6px" }}>{eyebrow}</p>
        <h2 className="chart-title" style={{ ...regs.display, margin: "0 0 6px" }}>{title}</h2>
        <p className="chart-caveat" style={{ ...regs.body, margin: 0 }}>{caveat}</p>
      </div>

      {/* THE CONTROL. Native radios in a real `<fieldset>` with a `<legend>`: a radio group to the
          keyboard and to a screen reader before this page's stylesheet does anything to it, and
          `aria-label` carries the reading a reader who is not looking at the picture would otherwise
          only get from it. Each accessible name CONTAINS its visible one — `assertAimDeclaration`
          refuses the declaration otherwise, because a name that does not is the WCAG 2.5.3 failure. */}
      <fieldset className="chart-aim">
        <legend>{aim.label}</legend>
        <div className="options">
          {aimOptions.map((option) => (
            <label key={option.id}>
              <input
                id={option.id}
                type="radio"
                name="chart-aim"
                value={option.slug}
                aria-label={option.announce}
                defaultChecked={option.isNone}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* THE SENTENCE THE CONTROL OWES THE READER — what this aim made true, in words, for a reader
          who is not looking at the plot. Its row is reserved whether or not an option is chosen, so
          choosing one never moves the plot underneath it. The untouched option reveals none: it is
          not a comparison, it is the claim the title states. */}
      <div className="aim-notes" role="status">
        {aimNotes.map((note) => (
          <p data-stack-note={note.slug} key={note.slug}>{note.text}</p>
        ))}
      </div>

      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: "44px",
          ["--x-axis-h" as string]: `${FRAME.xAxisRowPx}px`,
          aspectRatio: `${FRAME.width + 44} / ${FRAME.height + FRAME.xAxisRowPx}`,
        }}
      >
        <div className="y-axis" style={{ pointerEvents: "none" }}>
          {yTicks.map((t) => (
            <span key={t.text} className="axis-label y" style={{ ...regs.axis, top: `${pct(t.at, FRAME.height)}%` }}>
              {t.text}
            </span>
          ))}
        </div>

        <svg
          role="group"
          aria-label={title}
          xmlns="http://www.w3.org/2000/svg"
          className="chart"
          data-hit="cell"
          viewBox={`0 0 ${FRAME.width} ${FRAME.height}`}
          preserveAspectRatio="none"
        >
          <desc>{alt}</desc>
          <rect x={0} y={0} width={FRAME.width} height={FRAME.height} fill={ground} />

          {yTicks.map((t) => (
            <line key={`h${t.text}`} x1={0} x2={FRAME.width} y1={t.at} y2={t.at} stroke={grid} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          ))}
          {xTicks.map((t) => (
            <line key={`v${t.text}`} x1={t.at} x2={t.at} y1={0} y2={FRAME.height} stroke={grid} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          ))}

          {/* THE SHAFTS. Each is a UNIT segment at its own tail, placed by the generated stylesheet
              with `translate(tail) rotate(θ) scale(L, 1)`. Nothing here states a length or an angle:
              `aim.ts` derives both from the two declared points, so a typed angle can never disagree
              with a typed head. `vector-effect` keeps the stroke a constant width in the reader's own
              pixels whatever L the option scales it by. */}
          {arrows.map((a) => (
            <line
              key={`s-${a.key}`}
              data-aim-shaft={a.key}
              data-mark={a.key}
              style={{ "--mark-active": a.subject ? subjectActive : contextActive } as React.CSSProperties}
              x1={0}
              y1={0}
              x2={1}
              y2={0}
              fill="none"
              stroke={inkOf(a.key)}
              strokeWidth={a.subject ? (direction.stroke?.series ?? 2.4) : 1.5}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* THE HEADS. The static sibling ends its link on a filled DISC, the old convention for
              "what it is now". That is not kept here and the reason is the control: a disc says
              where, and every state of this page has to say WHICH WAY. The apex sits at (0,0) so the
              generated `translate(L, 0)` puts it exactly on the reading. */}
          {arrows.map((a) => (
            <path
              key={`h-${a.key}`}
              data-aim-head={a.key}
              data-mark={a.key}
              style={{ "--mark-active": a.subject ? subjectActive : contextActive } as React.CSSProperties}
              d={`M 0 0 L ${-HEAD_UNITS} ${-HEAD_UNITS * 0.46} L ${-HEAD_UNITS} ${HEAD_UNITS * 0.46} Z`}
              fill={inkOf(a.key)}
              stroke="none"
            />
          ))}

          {/* THE RINGS — hollow, for the earlier state, which is the one convention of the static
              sibling that this page keeps unchanged and then asks more of: the ring is the fixed end
              of the mark, so it is also where the name is anchored and where the pointer is read. */}
          {arrows.map((a) => (
            <circle
              key={`r-${a.key}`}
              data-aim-ring={a.key}
              data-mark={a.key}
              style={{ "--mark-active": a.subject ? subjectActive : contextActive } as React.CSSProperties}
              cx={a.tail.x}
              cy={a.tail.y}
              r={a.subject ? 4.2 : 3.2}
              fill={ground}
              stroke={inkOf(a.key)}
              strokeWidth={1.6}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* THE ANSWERING LAYER. An anchor is an ANCHOR, never a reading: every one of a country's
              anchors carries that country's whole answer, and they are placed at the points its own
              arrow really occupies across the four states — the tail, and each head — so a reader
              pointing at an arrow in ANY state is answered by the country they are pointing at.
              `assertAimDeclaration` refuses an anchor parked where its arrow never goes, and refuses
              a state no anchor covers. Only the tail is in the tab order: the others are the same
              reading in another place, and a keyboard reader owed sixteen readings should not be
              handed seventy. What lights is the arrow itself (`data-mark-ref` → `data-mark`), and
              the format keeps such a point invisible. */}
          {anchors.map((m, i) => (
            <circle
              key={`a-${m.key}-${i}`}
              className="pt"
              cx={m.x}
              cy={m.y}
              r={7}
              fill="transparent"
              stroke="none"
              tabIndex={m.focusable ? 0 : -1}
              aria-hidden={m.focusable ? undefined : true}
              role={m.focusable ? "img" : undefined}
              aria-label={m.focusable ? m.detail : undefined}
              data-mark-ref={m.key}
              data-detail={m.detail}
            />
          ))}
          <rect className="hit-area" x={0} y={0} width={FRAME.width} height={FRAME.height} fill="transparent" pointerEvents="all" />
        </svg>

        <div className="overlay" aria-hidden="true">
          {/* BOTH AXIS TITLES, WHICH THIS TYPE FILES AS ITS ACCESSIBILITY FAILURE: "a chart with two
              unlabelled continuous axes and a path drawn through them communicates nothing, screen
              reader or not." They are drawn in the plot rather than in the gutters because a gutter
              44 px wide cannot hold a phrase, and they sit in the two corners the data leaves empty
              — for the vertical title that is the plot's top-left, which no arrow reaches in any of
              the four states. The horizontal title is NOT here: the bottom-right corner it would
              take is where eleven of the sixteen arrows live, so it sat on top of them in every
              state. It rides the x-axis row instead, under its own graduations. */}
          <span className="note" style={{ ...regs.annot, color: labelInk, left: "0%", top: "0%", background: "transparent", padding: 0, whiteSpace: "normal", maxWidth: "min(44%, 22em)" }}>
            {yTitle}
          </span>
          {/* THE NAMES, AT THE TAILS NO OPTION TOUCHES. Above its ring by default and below it where
              the runner's own de-collision says so — the two countries whose 2000 weights differ by
              0,46 of a point would otherwise print one name over another at every width. */}
          {names.map((n) => (
            <span
              key={`n-${n.key}`}
              className="end-label"
              style={{
                ...regs.value,
                color: n.key === subjectKey ? subjectInk : labelInk,
                ...noteAnchor(pct(n.x, FRAME.width)),
                top: `${pct(n.y, FRAME.height)}%`,
                transform: `${noteAnchor(pct(n.x, FRAME.width)).transform} translateY(${n.below ? "35%" : "-135%"})`,
                whiteSpace: "nowrap",
              }}
            >
              {n.text}
            </span>
          ))}

          {/* THE FIGURE EACH STATE PRINTS ON THE PLATE, where the eye already is — on the subject's
              own head under that state. Four separate spans at four fixed places; the stylesheet
              reveals one. None of them travels, which is the difference between a figure that rides
              a mark and a word that moves for a reason the reader cannot see. */}
          {aimFigures.map((f) => (
            <span
              key={`f-${f.slug}`}
              className="note"
              data-stack-total={f.slug}
              style={{
                ...regs.annot,
                color: subjectInk,
                ...noteAnchor(pct(f.x, FRAME.width)),
                top: `${pct(f.y, FRAME.height)}%`,
                transform: `${noteAnchor(pct(f.x, FRAME.width)).transform} translateY(${f.above ? "-135%" : "45%"})`,
              }}
            >
              {f.text}
            </span>
          ))}
        </div>

        <div className="x-axis" style={{ pointerEvents: "none" }}>
          {xTicks.map((t) => (
            <span key={t.text} className="axis-label x" style={{ ...regs.axis, left: `${pct(t.at, FRAME.width)}%` }}>
              {t.text}
            </span>
          ))}
          {/* THE HORIZONTAL AXIS TITLE, under its own graduations and ending where its axis ends.
              `types/connected-scatter.md` files the missing axis title as this type's own
              accessibility failure — "a chart with two unlabelled continuous axes and a path drawn
              through them communicates nothing, screen reader or not" — so neither title is
              optional, and neither is allowed to land on the marks. */}
          <span
            className="axis-label x"
            style={{ ...regs.axis, fontStyle: "italic", left: "100%", top: "24px", transform: "translateX(-100%)" }}
          >
            {xTitle}
          </span>
        </div>
      </div>

      <p className="chart-reading" style={{ ...regs.body, margin: "10px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>{source}</p>
    </figure>
  );
}
