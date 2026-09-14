/**
 * Low-carbon electricity as a share of six countries' own generation in 2024, drawn as bullets
 * THROUGH the design base and delivered as an interactive page whose reader CHOOSES THE TARGET.
 *
 * ── THE GESTURE, AND WHY IT IS THE BULLET'S AND NOBODY ELSE'S ────────────────────────────────
 *
 * A bullet is the accountability chart. It is the only type in the catalogue whose reading is not a
 * quantity but a VERDICT — *did this hit the mark* — and a verdict is a function of two things, only
 * one of which is in the data. The value is measured. THE TARGET IS CHOSEN BY WHOEVER DREW THE
 * PLATE, and `chart-beat/references/types/bullet.md` puts its whole warning there: "don't invent a
 * target just to unlock the bullet's shape", "a bullet chart must not manufacture judgement the
 * journalist didn't provide".
 *
 * A still picks one target, prints it, and asks to be trusted. A video and a scrolly can step
 * through several, but on the author's clock and in the author's order. None of the three can let
 * the reader ask the question the form itself provokes — *par rapport à quoi ?* — which is why this
 * page hands the target over and re-derives every verdict from it (`assets/benchmark.ts`, a new
 * vocabulary; its header argues why it is not an option in `level.ts` or `cutoff.ts`).
 *
 * WHAT MOVES AND WHAT DOES NOT, which is the whole design. **The six bars never move.** The
 * measurement is not in dispute; the yardstick is. What moves is the apparatus of judgement — the
 * tick, the gap and the band behind the bar — and all three are drawn at all times and only
 * transformed, so the change INTERPOLATES instead of cutting. That also keeps the rule
 * `interaction.mjs` imposes: it resolves the mark under a pointer off `cx`/`cy` read once at init,
 * so a mark that moves must not be the mark that answers. Here the mark that answers is the measure
 * bar, and the measure bar is the one thing no option touches.
 *
 * WHAT THE PICTURE THEN SHOWS THAT NO STILL CAN. Ranked by the plate's own target — progress since
 * 2015 — the order is Pologne, Allemagne, France, Suisse, Suède, Norvège. Ranked by distance to the
 * Suède it is that list read backwards: the best performer becomes the worst, and not one number
 * moved. The runner asserts the inversion before the render, so the sentence cannot outlive the data.
 *
 * ── TREATMENTS SPENT, AND THE ONE REFUSED ───────────────────────────────────────────────────
 *
 * `the-track-runs-the-full-scale-so-the-remainder-is-legible` — every track runs the full 0–100 %,
 * because the remainder is the reading a bare bar cannot give.
 *
 * `two-states-of-one-measure-are-one-hue-at-two-chromas` — the stretch beyond the tick is the bar's
 * OWN hue at a second chroma, hunted until it clears a measured floor against the bar it sits on,
 * never a second hue and never a dose typed once for three directions. Which SIDE of the fill that
 * chroma sits on is decided once per direction, for both bar fills together — see the pole block
 * below, and the plate it was wrong on.
 *
 * `the-verdict-is-written-as-a-derived-number` — the gap in points is printed on the row, and it is
 * RE-DERIVED per target rather than left as a subtraction between a bar and a tick.
 *
 * `accent-marks-the-thread` — the subject alone carries the full accent.
 *
 * REFUSED: the catalogue's "exactly two accent hues are enough — one for hit, one for miss". The
 * verdict is drawn in SHAPE here: filled beyond the tick, hollow short of it. Three reasons, all
 * paid for on this branch. Hue is already spent on which row the story is about. A verdict carried
 * by hue alone is one a colour-blind reader does not get, while a hollow bar with an outline
 * survives a photocopy. And two hues calibrated independently against the same floor against the
 * same ground come out identical by construction — measured twice here already (1,023:1 on one beat,
 * 1,000:1 on a lollipop).
 */

import {
  adjustToContrast,
  contrast,
  mix,
  NON_TEXT_CONTRAST_MIN,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";
import { figureVars, webRegisters } from "#shared/design-base/web.mjs";
import {
  assertBenchmarkDeclaration,
  benchmarkChromeCss,
  benchmarkCss,
  benchmarkNotesForMarkup,
  benchmarkOptionsForMarkup,
  benchmarkStatesForMarkup,
  benchmarkVerdictKey,
  type BenchmarkDeclaration,
  type BenchmarkPlacement,
} from "../../skills/chart-web/assets/benchmark.ts";

export const FRAME = { width: 880, height: 300, xAxisRowPx: 28 };

/** This format's own scope selector, and the radio-id prefix `benchmark.ts` refuses to know about. */
const SCOPE = ".chart-figure";
export const BENCHMARK_ID_PREFIX = "chart-benchmark";

/** How long a change of target takes. Long enough that the six ticks are visibly TRAVELLING rather
 *  than teleporting — which is the reason the movement is legible at all — and short enough that a
 *  reader working through four options is not waiting on it. */
const PLACE_MS = 320;

/** The first row's own NAME sits above its track, so the band of rows starts below the top of the
 *  frame — measured on the first render, where "Pologne" landed on the caveat line above the plot. */
const TOP_PAD = 24;

/** How many hit points a row is sampled at. `interaction.mjs` resolves a pointer to the nearest mark
 *  CENTRE, which over six horizontal strips is a Voronoi: with one point per row a pointer near the
 *  right end of a row is nearer the next row's point than its own. The spacing has to come out under
 *  the row pitch — at 21 points the worst horizontal distance to a row's own point is 22 viewBox
 *  units against a 46-unit pitch, so the answer is always the row the reader is pointing at. Only the
 *  first is in the tab order; the rest carry `tabIndex={-1}` and no accessible name, so the keyboard
 *  still walks one stop per country. */
const HITS_PER_ROW = 21;

export type Row = {
  code: string;
  name: string;
  before: number;
  after: number;
  change: number;
  afterLabel: string;
  detail: string;
  /** One verdict string per benchmark slug — the derived number this row earns under that target. */
  verdicts: { slug: string; text: string }[];
};

const pct = (value: number, extent: number) => (value / extent) * 100;

export function DirectedBulletWeb({
  rows,
  subject,
  benchmark,
  scaleMax,
  threshold,
  thresholdNote,
  xTicks,
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
  rows: Row[];
  subject: string;
  benchmark: BenchmarkDeclaration;
  scaleMax: number;
  threshold: number;
  thresholdNote: string;
  xTicks: number[];
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
  // Refused before anything is drawn: a row with no target, a target off the track, a target with no
  // row, a provenance that cannot be checked, and two targets that leave every row the same distance
  // from its own mark.
  assertBenchmarkDeclaration(benchmark, {
    rows: rows.map((r) => ({ key: r.code, value: r.after })),
    scaleMax,
  });

  const regs = webRegisters(direction, { ink: { ink, muted, accent } });

  /**
   * THE DOSE IS HUNTED, NEVER TYPED, AND IT SEARCHES BOTH POLES.
   *
   * A fixed step cannot serve three directions: mixing toward the ink separates a mark on a light
   * ground and barely moves one on `nocturne`, where the ink is pale and the accent already sits
   * near it — the shape that measured 1,10:1 on the treemap and was refused. A direction has two
   * poles, so the smallest dose toward EITHER that clears the floor against the surface the mark
   * actually lands on is what is taken, and a surface with no such dose is refused rather than
   * shipped.
   *
   * `keepAbove` is the second half and it is why this is not just `darken`: a step taken toward the
   * ground can walk a mark under the 3:1 non-text floor against that same ground, which is how a
   * beat ends up with an invisible segment that measured fine against the thing it was lifted off.
   */
  const step = (
    from: string,
    pole: string,
    {
      floor,
      keepAbove,
      apart,
    }: { floor: number; keepAbove: string; apart?: { colour: string; min: number } },
  ): string | null => {
    for (let dose = 0.02; dose <= 0.9; dose += 0.02) {
      const moved = mix(from, pole, dose);
      if (contrast(moved, from) < floor) continue;
      if (contrast(moved, keepAbove) < NON_TEXT_CONTRAST_MIN) continue;
      if (apart && contrast(moved, apart.colour) < apart.min) continue;
      return moved;
    }
    return null;
  };

  /**
   * A BACKDROP IS THE OPPOSITE PROBLEM FROM A MARK, so it gets its own search rather than
   * `separate`'s. A mark has to clear a FLOOR; a neutral backdrop has to clear a much smaller one —
   * it must be tellable from what it sits on — and then stay UNDER the 3:1 non-text floor against
   * the ground, because a backdrop that reached it would be a mark, competing with the bars drawn on
   * top of it. Both ends are checked. Mixing toward the ink is the right single pole here and on
   * both kinds of ground: on a light ground it darkens the track, on `nocturne` the ink is pale and
   * it lightens it, and either way the step is away from the ground.
   */
  const backdrop = (from: string, floor: number) => {
    for (let dose = 0.03; dose <= 0.5; dose += 0.01) {
      const moved = mix(from, ink, dose);
      if (contrast(moved, from) < floor) continue;
      if (contrast(moved, ground) >= NON_TEXT_CONTRAST_MIN)
        throw new Error(
          `the smallest backdrop step off ${from} that a reader can see (${moved}) already reads ` +
            `${contrast(moved, ground).toFixed(2)}:1 against the ground — that is a mark, not a ` +
            `neutral zone, and it would compete with the bars drawn on it`,
        );
      return moved;
    }
    throw new Error(`no step of this direction's ink separates a backdrop ${floor}:1 from ${from}`);
  };

  // THE NEUTRAL BACKDROP, IN TWO STEPS, AND THE SECOND ONE IS THE BULLET'S OWN QUALITATIVE BAND.
  //
  // `bullet.md` is explicit that the bands must not be manufactured: "when no bands are given, the
  // honest choice is a single neutral track behind the bar, never an invented poor/ok/good split the
  // source data doesn't actually support". This page has no invented split and it does have a band,
  // because THE CHOSEN TARGET ITSELF PARTITIONS THE TRACK: everything from the target to the top of
  // the scale is the stretch that clears it. The band is a consequence of the READER'S own choice,
  // not a judgement the journalist never made — which is the distinction that sheet is drawing.
  const track = backdrop(ground, 1.12);
  const band = backdrop(track, 1.12);

  // THE TWO BAR FILLS, AND THEY ARE CALIBRATED AGAINST THE BAND, NOT THE GROUND. A bar never touches
  // the ground: it is drawn on the track, and past the target on the band, which is the darkest
  // surface behind it. Calibrating against the ground and hoping is how a beat on this branch shipped
  // 1,75:1 and 2,19:1 — the measurement was made against a surface the page does not paint there.
  //
  // AND THEY ARE CALIBRATED WITH HEADROOM, which is not padding for its own sake. The surplus
  // segment is a step off the bar TOWARD THE GROUND — a tint, the same device the static sibling
  // uses for the earlier state — and a bar sitting exactly on the 3:1 floor has nowhere to go in
  // that direction: any tint of it is illegal. Written without the headroom, the neutral bar had
  // room on one pole only, so its surplus went one way and the subject's went the other, and the
  // same encoding came out lighter on one row and darker on the next. Looked at, in the creme
  // capture, before this factor existed.
  const BAR_HEADROOM = 1.25;
  const barFloor = NON_TEXT_CONTRAST_MIN * BAR_HEADROOM;
  const lit = contrast(accent, band) >= barFloor ? accent : (adjustToContrast(accent, band, barFloor) ?? accent);
  let tint = mix(accent, ground, 0.55);
  if (contrast(tint, band) < barFloor) tint = adjustToContrast(tint, band, barFloor) ?? tint;
  const fillOf = (r: Row) => (r.code === subject ? lit : tint);

  /**
   * THE SURPLUS SEGMENT AND THE ANSWERED BAR ARE THE SAME TRICK PLAYED TWICE ON THE SAME FILL, AND
   * WRITTEN INDEPENDENTLY THEY COLLIDED. Measured on the first three renders of this page: the
   * surplus beyond the tick and the bar's own lift under the pointer came out **1,04:1** apart on
   * `nocturne` and 1,07–1,09:1 on the other two — so a reader who pointed at a row to ask what it
   * was made of watched the "beyond the target" segment dissolve into the bar, at the exact moment
   * they were looking at it. Neither colour was wrong on its own: each cleared its own floor against
   * the fill it was lifted off. They were wrong TOGETHER, which is the failure this branch has now
   * paid for three times in three dresses — two colours calibrated independently against the same
   * floor against the same surface come out identical by construction.
   *
   * So the second one is hunted WITH THE FIRST IN HAND. The surplus is the smaller step, because it
   * is a permanent part of the drawing; the answer is the larger, because it has to be noticed while
   * the reader is looking somewhere else; and the answer is refused unless it also clears the
   * surplus by a measured margin. Where a direction has room on both poles the two end up on
   * opposite sides of the fill; where it has room on only one — `nocturne`'s pale field bar has
   * almost none toward its dark ground before it drops under the 3:1 floor against the band — they
   * end up on the same side, further apart.
   */
  const SURPLUS_OFF_BAR = 1.2;
  const ANSWER_OFF_BAR = 1.35;
  const ANSWER_OFF_SURPLUS = 1.25;
  // ONE POLE PER MEANING, FOR THE WHOLE DIRECTION, and the pairs are tried in the order this beat
  // wants them: the surplus as a TINT toward the ground (the static sibling's own device for an
  // earlier state) and the answer as a step toward the INK (the treemap's, and the owner's
  // "assombrie depuis son propre remplissage"). The same-pole pairs are the fallback and not the
  // preference: they still work, because the answer is then simply the larger step, but the picture
  // is better when the two meanings sit on opposite sides of the fill.
  const pairs: [string, string][] = [
    [ground, ink],
    [ink, ground],
    [ink, ink],
    [ground, ground],
  ];
  const chosen = (() => {
    for (const [surplusPole, answerPole] of pairs) {
      const sLit = step(lit, surplusPole, { floor: SURPLUS_OFF_BAR, keepAbove: band });
      const sTint = step(tint, surplusPole, { floor: SURPLUS_OFF_BAR, keepAbove: band });
      if (!sLit || !sTint) continue;
      const aLit = step(lit, answerPole, {
        floor: ANSWER_OFF_BAR,
        keepAbove: band,
        apart: { colour: sLit, min: ANSWER_OFF_SURPLUS },
      });
      const aTint = step(tint, answerPole, {
        floor: ANSWER_OFF_BAR,
        keepAbove: band,
        apart: { colour: sTint, min: ANSWER_OFF_SURPLUS },
      });
      if (!aLit || !aTint) continue;
      return { sLit, sTint, aLit, aTint };
    }
    throw new Error(
      `no pair of poles gives this direction a surplus ${SURPLUS_OFF_BAR}:1 off both bar fills and ` +
        `an answer ${ANSWER_OFF_BAR}:1 off them and ${ANSWER_OFF_SURPLUS}:1 clear of the surplus, ` +
        `all of them still ${NON_TEXT_CONTRAST_MIN}:1 against the band ${band}`,
    );
  })();
  const deeperOf = (r: Row) => (r.code === subject ? chosen.sLit : chosen.sTint);

  // THE TICK, AND THE HALO THE CATALOGUE ASKS FOR. "The target tick needs enough contrast against
  // both the bar's fill and the neutral backdrop behind it … a white halo behind the tick is the
  // reliable way to guarantee that regardless of which colour zone the tick happens to cross." The
  // halo is the direction's own GROUND rather than white — on `nocturne` white would be a third
  // colour nobody chose — and it is drawn wider than the tick, so the only surface the tick is ever
  // measured against is the ground, once, here.
  const tickInk = adjustToContrast(ink, ground, NON_TEXT_CONTRAST_MIN) ?? ink;
  const rule = mix(ground, ink, 0.6);
  const labelInk = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;

  const rowH = (FRAME.height - TOP_PAD) / rows.length;
  const trackH = rowH * 0.56;
  const barH = rowH * 0.3;
  const cyOf = (i: number) => TOP_PAD + rowH * i + rowH / 2;
  const x = (share: number) => (share / scaleMax) * FRAME.width;

  // THE PLACEMENTS. One translate for the tick, one translate-plus-x-scale for the gap and one for
  // the band, per row per option, in the geometry's own units — which is the only unit that survives
  // `preserveAspectRatio="none"`, where a viewBox unit is a different number of reader pixels at
  // every width. Everything is authored at the view box's own origin and scaled about it, which is
  // why the stylesheet states `transform-origin: 0 0` rather than trusting an initial value that has
  // changed inside one browser's lifetime.
  const states = benchmarkStatesForMarkup(
    benchmark,
    rows.map((r) => ({ key: r.code, value: r.after })),
  );
  const placements: BenchmarkPlacement[] = states.map((state) => {
    const lo = Math.min(state.value, state.target);
    const hi = Math.max(state.value, state.target);
    return {
      slug: state.slug,
      key: state.key,
      target: `translate(${x(state.target).toFixed(2)}px)`,
      // The gap rect is authored across the whole frame and squeezed onto [lo, hi]; a zero-length
      // gap comes out `scaleX(0)` and the stylesheet puts it at `opacity: 0`, because a rect with no
      // width still draws its own stroke as a hairline and "exactly on the target" must not look
      // like "one point short of it".
      gap: `translate(${x(lo).toFixed(2)}px) scaleX(${((x(hi) - x(lo)) / FRAME.width).toFixed(5)})`,
      band: `translate(${x(state.target).toFixed(2)}px) scaleX(${(
        (FRAME.width - x(state.target)) /
        FRAME.width
      ).toFixed(5)})`,
      verdict: state.verdict,
    };
  });

  const options = benchmarkOptionsForMarkup(benchmark, BENCHMARK_ID_PREFIX);
  const notes = benchmarkNotesForMarkup(benchmark);
  const claimSlug = options[0].slug;

  const css = [
    // WHAT A BAR BECOMES UNDER THE POINTER, AND IT IS THE BAR ITSELF. The format's own
    // `.pt[data-mark-ref]` keeps the point invisible and moves `.mark-active` onto the shape it
    // names; without a `data-mark-ref` this page drew a grey dot floating at the end of each bar,
    // which is the "rond au survol" the owner has refused three times. Two rules, because there are
    // two fills, each lifted off ITS OWN colour by a hunted dose — a fixed dose measured 1,104:1 on
    // `nocturne` on another beat and was refused there.
    `${SCOPE} rect.mark-active[data-fill="thread"] { fill: ${chosen.aLit}; }`,
    `${SCOPE} rect.mark-active[data-fill="field"] { fill: ${chosen.aTint}; }`,
    // The answer is a country's whole low-carbon mix — six sources with their own shares — and the
    // format's box is 220px wide, which would stack it eight lines tall over the rows it names.
    // Bare `#tooltip`, because the element is the page's and not this figure's; same specificity as
    // the format's own rule, and this stylesheet is emitted after it, which is the entire mechanism
    // — so it is stated rather than relied on silently.
    `#tooltip { max-width: min(420px, calc(100vw - 32px)); }`,
    // The layer the non-default verdicts live in: the same grid cell as `.overlay`, and never
    // `.overlay` itself. `verify-web.mjs` reads every word inside `.overlay` and requires all of
    // them drawn in the default view, which is correct — `.overlay` IS the plate — and three
    // options' worth of verdicts belong to targets nobody has chosen yet.
    `${SCOPE} .chart-plot .verdict-layer { grid-column: 2; grid-row: 1; position: relative; pointer-events: none; }`,
    benchmarkChromeCss({ scope: SCOPE }),
    benchmarkCss(benchmark, {
      scope: SCOPE,
      idPrefix: BENCHMARK_ID_PREFIX,
      placements,
      placeMs: PLACE_MS,
    }),
  ].join("\n\n");

  /** One row's verdict labels, by slug — same anchor, same words for the share, only the derived
   *  number differs. The anchor is the BAR'S END, and the bar's end is what no option moves: the
   *  owner refused a radar twice for moving its labels under a control that had no visible reason to
   *  move them, and a number that changes in place has its reason drawn beside it. */
  const verdictSpans = (r: Row, i: number, only: "claim" | "others") =>
    r.verdicts
      .filter((v) => (only === "claim" ? v.slug === claimSlug : v.slug !== claimSlug))
      .map((v) => (
        <span
          key={`${r.code}-${v.slug}`}
          className="end-label"
          data-benchmark-verdict={benchmarkVerdictKey(v.slug, r.code)}
          style={{
            ...regs.value,
            color: r.code === subject ? accent : labelInk,
            left: `${pct(x(r.after), FRAME.width)}%`,
            top: `${pct(cyOf(i), FRAME.height)}%`,
            transform:
              r.after > 80
                ? "translate(-100%, -50%) translateX(-8px)"
                : "translateX(8px) translateY(-50%)",
          }}
        >
          {v.text}
        </span>
      ));

  return (
    <figure
      className="chart-figure"
      style={{
        ["--ground" as string]: ground,
        ["--accent" as string]: accent,
        ["--ink" as string]: ink,
        ["--muted" as string]: muted,
        ...figureVars(regs),
      }}
    >
      {/* This beat's own stylesheet, carried inside the figure it styles. The format's shared
          `buildCss` emits the chrome for a FILTER, which this beat does not declare and must not:
          nothing leaves this picture — the rows that fail their target are the whole reading. */}
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div className="chart-header">
        <p className="chart-eyebrow" style={{ ...regs.eyebrow, margin: "0 0 6px" }}>{eyebrow}</p>
        <h2 className="chart-title" style={{ ...regs.display, margin: "0 0 6px" }}>{title}</h2>
        <p className="chart-caveat" style={{ ...regs.body, margin: 0 }}>{caveat}</p>
      </div>

      {/* THE CHOICE OF TARGET. Native radios in a real `<fieldset>` with a `<legend>`: a radio group
          to the keyboard and to a screen reader before this page's stylesheet does anything to it,
          and `aria-label` carries the reading a reader who is not looking at the picture would
          otherwise only get from the drawing. The plate's own target is first and is the default, so
          a reader with no script lands on the claim and can still change it. */}
      <fieldset className="chart-benchmark">
        <legend style={{ ...regs.axis, color: muted }}>{benchmark.label}</legend>
        <div className="options">
          {options.map((option) => (
            <label key={option.id} style={{ ...regs.axis }}>
              <input
                id={option.id}
                type="radio"
                name={BENCHMARK_ID_PREFIX}
                value={option.slug}
                aria-label={option.announce}
                defaultChecked={option.isClaim}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* THE SENTENCE EACH TARGET OWES. Revealed by the same `:checked` that slides the ticks, and it
          is where this control's DERIVED readings live — how many of the six clear it, by how much
          the nearest one misses, and what the ORDER of the six becomes under it. None of them can be
          read off a rect, which is exactly why the control owes them. The plate's own target reveals
          none: it is not a comparison, it is what the title says. */}
      <div className="benchmark-notes" role="status">
        {notes.map((note) => (
          <p key={note.slug} data-benchmark-note={note.slug} style={{ ...regs.annot, margin: 0 }}>
            {note.text}
          </p>
        ))}
      </div>

      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: "0px",
          ["--x-axis-h" as string]: `${FRAME.xAxisRowPx}px`,
          aspectRatio: `${FRAME.width} / ${FRAME.height + FRAME.xAxisRowPx}`,
        }}
      >
        <div className="y-axis" />
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

          {/* THE TRACKS AND THE BANDS. The track runs the full scale, so the remainder — the fossil
              share — stays legible; the band is the stretch of it that clears the chosen target, and
              it slides with the tick. */}
          {rows.map((r, i) => (
            <g key={`bed-${r.code}`}>
              <rect x={0} y={cyOf(i) - trackH / 2} width={FRAME.width} height={trackH} fill={track} />
              <rect
                data-bm-band={r.code}
                x={0}
                y={cyOf(i) - trackH / 2}
                width={FRAME.width}
                height={trackH}
                fill={band}
              />
            </g>
          ))}

          {/* THE MEASURES. Drawn from zero — this is a length encoding and the baseline is not
              optional — and NOT ONE OF THEM MOVES under any option. They are also the marks that
              answer the pointer, which is the same fact stated twice: `interaction.mjs` reads a
              mark's coordinates once at init. */}
          {rows.map((r, i) => (
            <rect
              key={`bar-${r.code}`}
              data-mark={r.code}
              data-fill={r.code === subject ? "thread" : "field"}
              x={0}
              y={cyOf(i) - barH / 2}
              width={x(r.after)}
              height={barH}
              fill={fillOf(r)}
            />
          ))}

          {/* THE GAP: the distance between what this row reached and what it was judged against. Past
              the tick it is the bar's own hue at a second chroma — the part of the bar that is
              BEYOND the mark. Short of the tick it is a VOID: the ground, outlined in the row's own hue, at
              the bar's own height, so the reader sees the missing piece of bar rather than being
              asked to subtract two positions by eye. One rect, two paints, and the stylesheet
              chooses. `vector-effect` is what keeps the outline 1,2 CSS pixels wide under an x-scale
              that can squeeze the rect to a twentieth of its authored width. */}
          {rows.map((r, i) => (
            <rect
              key={`gap-${r.code}`}
              data-bm-gap={r.code}
              x={0}
              y={cyOf(i) - barH / 2}
              width={FRAME.width}
              height={barH}
              // 1,6 and not 1,2: at 1,2 the hollow read as an underline rather than as a box the
              // bar is missing — looked at, in all three captures, on the row whose shortfall is
              // the claim. `vector-effect` is what keeps it 1,6 CSS pixels under an x-scale that
              // can squeeze this rect to a fiftieth of its authored width.
              strokeWidth={1.6}
              vectorEffect="non-scaling-stroke"
              style={{
                // The four colours `benchmark.ts` names and refuses to know the value of, set here,
                // per row, because there are two bar fills and one page-wide custom property cannot
                // be two colours. A custom property declared inline does not compete with the
                // generated `fill:` — it is the value that rule resolves.
                ["--bm-over-fill" as string]: deeperOf(r),
                ["--bm-over-stroke" as string]: deeperOf(r),
                ["--bm-short-fill" as string]: ground,
                ["--bm-short-stroke" as string]: fillOf(r),
              }}
            />
          ))}

          {/* The threshold the headline names, drawn once across every row and never moved. It is
              the claim's own line, not a target: under the option that judges the six against it the
              ticks come and land on it, which is the control saying out loud where it got that
              number. */}
          <line
            x1={x(threshold)}
            x2={x(threshold)}
            y1={0}
            y2={FRAME.height}
            stroke={rule}
            strokeWidth={direction.stroke?.rule ?? 0.8}
            strokeDasharray="5 4"
            vectorEffect="non-scaling-stroke"
          />

          {/* THE TARGETS. Halo first, in the direction's own ground and wider, so the tick above it
              is only ever measured against one surface. Drawn last of the geometry, so a tick that
              lands inside a bar is still on top of it. */}
          {rows.map((r, i) => (
            <g key={`tgt-${r.code}`} data-bm-target={r.code}>
              <line
                x1={0}
                x2={0}
                y1={cyOf(i) - trackH * 0.62}
                y2={cyOf(i) + trackH * 0.62}
                stroke={ground}
                strokeWidth={5}
                vectorEffect="non-scaling-stroke"
              />
              <line
                x1={0}
                x2={0}
                y1={cyOf(i) - trackH * 0.62}
                y2={cyOf(i) + trackH * 0.62}
                stroke={tickInk}
                strokeWidth={2.2}
                vectorEffect="non-scaling-stroke"
              />
            </g>
          ))}

          {/* THE HIT TARGETS — see HITS_PER_ROW for why a row gets twenty-one of them. Every one
              answers with the same reading and names the same mark, the row's own bar. */}
          {rows.flatMap((r, i) =>
            Array.from({ length: HITS_PER_ROW }, (_, k) => (
              <circle
                key={`hit-${r.code}-${k}`}
                className="pt"
                data-mark-ref={r.code}
                cx={(FRAME.width * (k + 0.5)) / HITS_PER_ROW}
                cy={cyOf(i)}
                r={3}
                fill="transparent"
                stroke="none"
                tabIndex={k === 0 ? 0 : -1}
                role={k === 0 ? "img" : undefined}
                aria-label={k === 0 ? `${r.name} : ${r.detail}` : undefined}
                aria-hidden={k === 0 ? undefined : true}
                data-detail={`${r.name} · ${r.detail}`}
              />
            )),
          )}
          <rect className="hit-area" x={0} y={0} width={FRAME.width} height={FRAME.height} fill="transparent" pointerEvents="all" />
        </svg>

        {/* THE PLATE'S OWN WORDS: the row names, the verdict under the target the page ships in, and
            the threshold's name. Every one of them is drawn unconditionally, which is what makes
            this layer `.overlay`. */}
        <div className="overlay" aria-hidden="true">
          {rows.map((r, i) => (
            <span key={`name-${r.code}`}>
              <span
                className="note"
                style={{
                  ...regs.axis,
                  color: r.code === subject ? accent : (regs.axis.color as string),
                  fontWeight: r.code === subject ? 700 : regs.axis.fontWeight,
                  left: "0%",
                  top: `${pct(cyOf(i) - trackH / 2, FRAME.height)}%`,
                  transform: "translateY(-100%)",
                  background: "transparent",
                  padding: 0,
                }}
              >
                {r.name}
              </span>
              {verdictSpans(r, i, "claim")}
            </span>
          ))}
          {/* The rule's own name. NOT at its foot, where it landed on the axis's own "50 %" tick and
              printed the same number twice — a threshold is named in words here because the axis
              already gives the number. And NOT above the plot either, which is where it was until
              the control arrived: `top: 0` plus `translateY(-100%)` puts a label OUTSIDE its own
              layer, into the row the control's sentence occupies, and on `nocturne` it printed
              straight through it ("…à 18,9 pts — LA MOITIÉ tre 50 %"). Looked at, in the capture.
              It now sits on the same line as the row names, inside the plot, where the top inset was
              already reserved for them. */}
          <span
            className="note"
            style={{
              ...regs.annot,
              left: `${pct(x(threshold), FRAME.width)}%`,
              top: `${pct(cyOf(0) - trackH / 2, FRAME.height)}%`,
              transform: "translate(-50%, -100%)",
            }}
          >
            {thresholdNote}
          </span>
        </div>

        {/* THE VERDICTS THAT BELONG TO A TARGET NOBODY HAS CHOSEN YET. Same anchor, same layer
            geometry, a different layer — see the `.verdict-layer` rule above for why they are not
            in `.overlay`. */}
        <div className="verdict-layer" aria-hidden="true">
          {rows.map((r, i) => (
            <span key={`vs-${r.code}`}>{verdictSpans(r, i, "others")}</span>
          ))}
        </div>

        <div className="x-axis">
          {xTicks.map((t) => (
            <span key={t} className="axis-label x" style={{ ...regs.axis, left: `${pct(x(t), FRAME.width)}%` }}>
              {`${t} %`}
            </span>
          ))}
        </div>
      </div>

      <p className="chart-reading" style={{ ...regs.body, margin: "10px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>{source}</p>
    </figure>
  );
}
