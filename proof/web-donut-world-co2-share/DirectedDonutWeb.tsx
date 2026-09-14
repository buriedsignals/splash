/**
 * Two concentric rings — the world's CO₂ in 2000 and in 2023, by the six largest emitters of 2023 —
 * drawn as a donut THROUGH the design base and delivered as an interactive page.
 *
 * WHY TWO RINGS AND NOT TWO PIES SIDE BY SIDE. A pie answers one question well: what share is this,
 * of that whole. Two pies side by side quietly answer a second one they cannot support — did the
 * whole change — because nothing on the page says the two circles stand for different totals.
 * Concentric rings share a centre and an angular scale, so a wedge's ANGLE is comparable between
 * them; the totals they came from are printed rather than drawn, which is the honest split.
 *
 * `conservation-is-kept-visible` — every ring is closed: the six named wedges plus "all the others"
 * make the whole, and the remainder is drawn as a wedge like any other rather than left as a gap.
 *
 * WHAT THE WEB ADDS, AND IT IS NOT A TOOLTIP ON THE PLATE. The type sheet
 * (`chart-beat/references/types/pie-and-donut.md`) says colour is this form's ONLY differentiator
 * between adjacent parts — "there is no position or length fallback the way there is on every
 * axis-based chart in this set" — and this beat draws SEVEN parts per ring. Seven tones of one hue
 * that all clear the 3:1 non-text floor do not exist in these directions (see `rampForTones`), so
 * identity is taken off the ramp and put on a control: the reader chooses a country and it takes
 * the ring on BOTH rings at once, with the share it held in the OTHER year laid beside it as a
 * reference band. `BRIEF.md` carries the measurement behind every sentence of that.
 */

import {
  mix,
  adjustToContrast,
  contrast,
  TEXT_CONTRAST_MIN,
  NON_TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";
import {
  assertLevelDeclaration,
  levelChromeCss,
  levelCss,
  levelNotesForMarkup,
  levelOptionsForMarkup,
  levelRulesForMarkup,
  levelSlugOf,
} from "../../skills/chart-web/assets/level.ts";
import { webRegisters, figureVars } from "#shared/design-base/web.mjs";

export const FRAME = { width: 760, height: 380 };

const SCOPE = ".chart-figure";
const LEVEL_ID_PREFIX = "chart-level";
const TURN = Math.PI * 2;

/** How thick the ground hairline between two wedges is, and how thick the ring a chosen wedge takes.
 *  Both are the GROUND and not the ink, and that is measured rather than chosen — see `rampForTones`:
 *  every tone in the ramp clears 3:1 against the ground by construction, so a ground-coloured mark
 *  is the one mark guaranteed legible on all four of them in all three directions. The ink is not:
 *  on `nocturne` it reaches the brightest tone at 1,65:1. They are told apart by weight. */
const SEPARATOR_PX = 1.2;
const RING_PX = 3.2;
const REVEAL_MS = 220;

/** Where the reference band for each ring is drawn, in geometry units: the 2000 ring's in the gap
 *  between the two rings, the 2023 ring's just outside the outer one. BOTH SIT ON THE GROUND and
 *  never over a wedge, which is what lets them be drawn in the ink at full text contrast instead of
 *  in a colour that has to survive four tones underneath it. */
const GHOST = [
  { from: 110, to: 114.5 },
  { from: 172, to: 176.5 },
];

export type Wedge = {
  key: string;
  name: string;
  ring: number;
  from: number;
  to: number;
  tone: number;
  detail: string;
};

export type Ring = { key: string; label: string; total: string; inner: number; outer: number };

/** One row of the legend: the tone, and every wedge that wears it. A row with four members is how
 *  the ramp's own ceiling is stated to the reader in words rather than hidden. */
export type LegendRow = { tone: number; members: { key: string; name: string }[] };

const polar = (cx: number, cy: number, r: number, a: number) => [
  cx + r * Math.cos(a - Math.PI / 2),
  cy + r * Math.sin(a - Math.PI / 2),
];

function arcPath(cx: number, cy: number, inner: number, outer: number, from: number, to: number) {
  const large = to - from > Math.PI ? 1 : 0;
  const [x1, y1] = polar(cx, cy, outer, from);
  const [x2, y2] = polar(cx, cy, outer, to);
  const [x3, y3] = polar(cx, cy, inner, to);
  const [x4, y4] = polar(cx, cy, inner, from);
  return (
    `M ${x1} ${y1} A ${outer} ${outer} 0 ${large} 1 ${x2} ${y2} ` +
    `L ${x3} ${y3} A ${inner} ${inner} 0 ${large} 0 ${x4} ${y4} Z`
  );
}

/**
 * THE RAMP, BUILT IN CONTRAST SPACE AND NOT IN MIX SPACE, and the count of tones is a measurement.
 *
 * Every tone has to clear the non-text floor against the ground, and none of them may be louder
 * than the accent itself, so the whole ramp lives inside a range of `contrast(accent, ground) / 3`
 * — 2,21 on creme, 2,36 on rapport, 3,60 on nocturne. Spread geometrically over n tones the
 * adjacent step is that range to the power 1/(n-1): at SEVEN tones it is 1,14 / 1,16 / 1,25, which
 * is no separation at all, and the build this replaced did worse still — it mixed toward the ground
 * and then floor-corrected, which CLAMPED its bottom four steps onto the same 3:1 line and shipped
 * Russie, Japon, Iran and "tous les autres" at 1,007 / 1,044 / 1,007 against each other.
 *
 * Here the targets are spaced first and the colour is found second, by mixing the accent toward the
 * ground until the target contrast is reached. `assertRampIsSeparable` then re-measures what came
 * out, because a ramp derived correctly and a ramp that is actually separable are two claims.
 */
export function rampForTones(ground: string, accent: string, tones: number): string[] {
  if (tones < 2) throw new Error(`a ramp needs at least two tones, got ${tones}`);
  const top = contrast(accent, ground);
  if (top < NON_TEXT_CONTRAST_MIN)
    throw new Error(
      `the accent ${accent} reaches the ground ${ground} at ${top.toFixed(2)}:1, under the ` +
        `${NON_TEXT_CONTRAST_MIN}:1 non-text floor — there is no ramp to build under it`,
    );
  const step = (top / NON_TEXT_CONTRAST_MIN) ** (1 / (tones - 1));
  return Array.from({ length: tones }, (_, i) => {
    if (i === 0) return accent;
    const target = top / step ** i;
    let found = accent;
    for (let s = 1; s <= 200; s += 1) {
      const candidate = mix(accent, ground, s / 200);
      if (contrast(candidate, ground) < target) break;
      found = candidate;
    }
    return found;
  });
}

/**
 * REFUSES A RAMP TWO WEDGES CANNOT BE TOLD APART ON, which on this form is the whole plate: the
 * sheet's own accessibility trap is that a pie has no position or length to fall back on. Two
 * floors, both measured on the colours the page actually paints — every tone against the ground,
 * and every tone against its neighbour in the ramp.
 */
/** THE STEP A WEDGE TAKES UNDER THE POINTER, and the floor it must clear. Same rule and same two
 *  numbers as the ranking beat's columns: mixed toward the direction's own ink, never nudged with a
 *  brightness filter, which lightens on a light ground and on a dark one alike. */
const MARK_ACTIVE_STEP = 0.3;
const MARK_ACTIVE_MIN_STEP = 1.12;

export function assertRampIsSeparable(
  ramp: string[],
  ground: string,
  { adjacentMin }: { adjacentMin: number },
): void {
  ramp.forEach((tone, i) => {
    const vsGround = contrast(tone, ground);
    if (vsGround < NON_TEXT_CONTRAST_MIN)
      throw new Error(
        `tone ${i} (${tone}) reaches the ground ${ground} at ${vsGround.toFixed(3)}:1, under the ` +
          `${NON_TEXT_CONTRAST_MIN}:1 non-text floor — a wedge a reader cannot see is not a share`,
      );
  });
  for (let i = 0; i < ramp.length - 1; i += 1) {
    const between = contrast(ramp[i], ramp[i + 1]);
    if (between < adjacentMin)
      throw new Error(
        `tones ${i} (${ramp[i]}) and ${i + 1} (${ramp[i + 1]}) reach each other at ` +
          `${between.toFixed(3)}:1, under the ${adjacentMin}:1 this plate needs. On a pie colour is ` +
          `the ONLY differentiator between adjacent parts — reusing a hue for two slices makes them ` +
          `indistinguishable outright. Ask for fewer tones: ${ramp.length} do not fit above the ` +
          `non-text floor on this ground.`,
      );
  }
}

export function DirectedDonutWeb({
  wedges,
  rings,
  legend,
  levels,
  title,
  eyebrow,
  caveat,
  source,
  alt,
  reading,
  centreNote,
  direction,
  ground,
  accent,
  ink,
  muted,
  grid,
}: {
  wedges: Wedge[];
  rings: Ring[];
  legend: LegendRow[];
  levels: any;
  title: string;
  eyebrow: string;
  caveat: string;
  source: string;
  alt: string;
  reading: string;
  centreNote: string[];
  direction: any;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
}) {
  const regs = webRegisters(direction, { ink: { ink, muted, accent } });

  // THE RAMP RUNS THE OTHER WAY, and that is not a taste. The wedges are ordered largest first, so
  // tone 0 is the subject and the last tone is "everyone else" — the remainder that exists to close
  // the ring. A ramp that put its strongest step on the remainder would give the loudest colour to
  // the one slice that names nobody, which is exactly backwards.
  const tones = legend.length;
  const ramp = rampForTones(ground, accent, tones);
  assertRampIsSeparable(ramp, ground, { adjacentMin: 1.25 });

  // WHAT A WEDGE TAKES UNDER THE READER'S POINTER. The format keeps a point invisible once it names
  // the shape that answers for it (`data-mark-ref` -> `data-mark`) and paints the shape instead, in
  // a colour read off the mark. A dot floating on a ring is the same wrong affordance it was on a
  // column: the reading IS the wedge. Each of the four tones lifts by its own step toward the ink,
  // and the step is MEASURED — a ramp already spaced at 1,25 between neighbours has no room for a
  // lift that lands on the next tone, so a lift under the floor is refused rather than shipped.
  const markActive = ramp.map((tone, i) => {
    const lifted = mix(tone, ink, MARK_ACTIVE_STEP);
    const step = contrast(lifted, tone);
    if (step < MARK_ACTIVE_MIN_STEP)
      throw new Error(
        `tone ${i} lifts only ${step.toFixed(3)}:1 under the pointer, under the ` +
          `${MARK_ACTIVE_MIN_STEP}:1 floor — a reader cannot see which wedge answered`,
      );
    return lifted;
  });

  const label = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const cx = FRAME.width / 2;
  const cy = FRAME.height / 2;

  const wedgeAt = (key: string, ring: number) => {
    const found = wedges.find((w) => w.key === key && w.ring === ring);
    if (!found)
      throw new Error(
        `the yardstick offers ${key} on ring ${ring} and no wedge is drawn for it — a reference ` +
          `laid on a wedge that is not there is a reference nobody can read`,
      );
    return found;
  };

  /**
   * THE YARDSTICK, REFUSED BEFORE IT IS DRAWN. Handed what the beat actually draws — the seven
   * wedge keys and the two rings — so an option that names a country off the plate, or lays a
   * reference on one ring of two, is caught here rather than by a reader. `turn` is passed because
   * every reference on this shape is laid AROUND the plot: a donut has no flat band and no upright
   * one, since a horizontal rule at one y names two wedges mirrored about the vertical axis.
   */
  assertLevelDeclaration(levels, {
    drawnKeys: [...new Set(wedges.map((w) => w.key))],
    drawnSeries: rings.map((r) => r.key),
    height: FRAME.height,
    turn: TURN,
  });
  const levelOptions = levelOptionsForMarkup(levels, LEVEL_ID_PREFIX);
  const levelNotes = levelNotesForMarkup(levels);

  /**
   * EVERY OPTION'S REFERENCE, DRAWN ONCE AND HIDDEN — the stylesheet only reveals the chosen one,
   * so nothing here emits a transform and the hit circles keep the `cx`/`cy` `interaction.mjs`
   * resolved them by at init.
   *
   * A reference band spans, from the country's OWN wedge start on this ring, the share it held in
   * the OTHER year. Where the band ends against where the wedge ends IS the reading: China's 2023
   * wedge overshoots its 2000 band, the United States' falls short of its own.
   *
   * AND THE ANGLE IS DERIVED TWICE ON PURPOSE. The runner reads the share off the frozen file and
   * declares where the band ends; the component reads the drawn wedges and works out the same
   * thing. Two derivations of one number that have drifted is the defect this compares away — the
   * same seam-versus-rule assertion `proof/web-area-swiss-co2` makes on its own cut.
   */
  const bands = levelRulesForMarkup(levels).map((rule) => {
    const ring = rings.findIndex((r) => r.key === rule.series);
    if (ring < 0) throw new Error(`the yardstick names the ring ${rule.series}, which is not drawn`);
    const option = levels.options.find((o: any) => levelSlugOf(o.key) === rule.slug);
    const here = wedgeAt(option.key, ring);
    const there = wedgeAt(option.key, 1 - ring);
    const to = here.from + (there.to - there.from);
    const drawn = ((to % TURN) + TURN) % TURN;
    if (rule.angle === undefined)
      throw new Error(
        `the yardstick's ${rule.key} declares no angle — on a dial that is a reference with no place`,
      );
    if (Math.abs(drawn - rule.angle) > 1e-6)
      throw new Error(
        `${rule.key}: the reference is declared to end at ${rule.angle} rad and the band is drawn ` +
          `ending at ${drawn} rad — the declaration and the geometry are two derivations of one ` +
          `angle and they have drifted`,
      );
    // THE WORDS THE BAND OWES THE READER, and they are the per-slice label the type sheet asks for
    // — restored on demand for the slice the reader chose, at that slice's own angle, which is the
    // one place eight of the fourteen wedges could never hold one unprompted. The chip names the
    // OTHER year and the share it lays here, because that is what the band IS.
    const mid = (here.from + to) / 2;
    const [lx, ly] = polar(cx, cy, (rings[ring].inner + rings[ring].outer) / 2, mid);
    return {
      key: rule.key,
      d: arcPath(cx, cy, GHOST[ring].from, GHOST[ring].to, here.from, to),
      tick: [
        polar(cx, cy, GHOST[ring].from - 3, to),
        polar(cx, cy, GHOST[ring].to + 3, to),
      ] as [number[], number[]],
      text: `${rings[1 - ring].label} : ${option.share[1 - ring]}`,
      left: (lx / FRAME.width) * 100,
      top: (ly / FRAME.height) * 100,
    };
  });

  // The wedge separators and the ring a chosen wedge takes are both declared as RULES and never as
  // presentation attributes, because `levelCss` clears `stroke` off every `[data-col]` before it
  // rings the chosen one — a hairline carried on the wedge path itself would vanish from all
  // fourteen wedges the moment a reader chose a country.
  // ONLY THE COLOUR LEAVES THE INLINE STYLE. An inline `color` beats every generated selector, so
  // the ink the yardstick lights and dims has to be a rule — but the WEIGHT stays inline, beside
  // its own family, because the build's face scan reads family and weight off the same declaration:
  // a weight routed through a custom property on the figure made it embed Open Sans at 400 only and
  // carry a Merriweather 500 nobody sets. The yardstick lights and dims by ink alone here anyway.
  const { color: axisInk, fontWeight: axisWeight, ...axisRest } = regs.axis as any;
  const axisWeightCss = String(axisWeight ?? 400);
  const css = [
    `${SCOPE} .chart-legend [data-axis] { color: var(--axis-ink); }`,
    `${SCOPE} [data-col] { stroke: var(--ground); stroke-width: ${SEPARATOR_PX}; stroke-linejoin: round; }`,
    levelChromeCss({ scope: SCOPE }),
    levelCss(levels, {
      scope: SCOPE,
      idPrefix: LEVEL_ID_PREFIX,
      // THE GROUND AND NOT THE INK, measured: every tone in the ramp clears 3:1 against the ground
      // by construction, and the ink does not — on `nocturne` it reaches the brightest tone at
      // 1,65:1. The ring is told apart from the separator by weight, not by hue.
      lit: {
        ink: "var(--ink)",
        weight: axisWeightCss,
        ring: "var(--ground)",
        ringWidth: RING_PX,
      },
      dim: { ink: "var(--muted)", weight: axisWeightCss },
      revealMs: REVEAL_MS,
    }),
  ].join("\n\n");

  return (
    <figure
      className="chart-figure"
      style={{
        ["--ground" as string]: ground,
        ["--accent" as string]: accent,
        ["--ink" as string]: ink,
        ["--muted" as string]: muted,
        ["--axis-ink" as string]: axisInk,
        ...figureVars(regs),
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div className="chart-header">
        <p className="chart-eyebrow" style={{ ...regs.eyebrow, margin: "0 0 6px" }}>{eyebrow}</p>
        <h2 className="chart-title" style={{ ...regs.display, margin: "0 0 6px" }}>{title}</h2>
        <p className="chart-caveat" style={{ ...regs.body, margin: 0 }}>{caveat}</p>
      </div>

      {/* THE LEGEND, AND IT IS WHERE EVERY WEDGE GETS ITS NAME. The sheet allows a legend instead of
          per-slice labels only where there is genuinely no room, and `BRIEF.md` carries the
          measurement that says there is not: eight of the fourteen wedges cannot hold their own
          share label at their own mid-radius. Four swatches, seven names — a row with four members
          says out loud that those four wedges share a tone, rather than letting a reader believe
          they can be told apart by eye. */}
      <div
        className="chart-legend"
        style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "2px 14px", margin: "4px 0 0", flex: "0 0 auto" }}
      >
        {legend.map((row) => (
          <span key={row.tone} style={{ ...axisRest, fontWeight: axisWeight, display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 13, height: 13, background: ramp[row.tone], display: "inline-block", borderRadius: 2 }} />
            {row.members.map((m, i) => (
              <span key={m.key} data-axis={m.key}>
                {i > 0 ? " · " : ""}
                {m.name}
              </span>
            ))}
          </span>
        ))}
      </div>

      {/* THE CONTROL. Native radios in a real `<fieldset>` with a `<legend>` — a radio group to the
          keyboard and to a screen reader before this page's stylesheet does anything to it — and
          `aria-label` carries the reading a reader who is not looking at the picture would
          otherwise only get from the bands. Each accessible name CONTAINS its visible one;
          `assertLevelDeclaration` refuses the declaration otherwise (WCAG 2.5.3). */}
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

      {/* THE SENTENCE THE CONTROL OWES THE READER — both shares, both totals in Gt, the multiple
          between them and the rank the country moved through, which is the reading no arc on this
          plate can draw. Its row is reserved whether or not an option is chosen, so choosing one
          never moves the rings underneath it. */}
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
          // A WEDGE IS AN ANGLE. Stretching the box turns every angle into a different angle, which
          // is the one thing this form cannot survive — the same exception the pictogram states.
          preserveAspectRatio="xMidYMid meet"
        >
          <desc>{alt}</desc>
          <rect x={0} y={0} width={FRAME.width} height={FRAME.height} fill={ground} />

          {wedges.map((w) => (
            <path
              key={`${w.ring}-${w.key}`}
              data-col={w.key}
              data-mark={`${w.ring}-${w.key}`}
              style={{ "--mark-active": markActive[w.tone] } as React.CSSProperties}
              d={arcPath(cx, cy, rings[w.ring].inner, rings[w.ring].outer, w.from, w.to)}
              fill={ramp[w.tone]}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* EVERY OPTION'S REFERENCE BAND, drawn once and hidden. On the ground, never over a
              wedge, so it is the ink at full contrast rather than a colour chosen to survive four
              tones underneath it. */}
          {bands.map((band) => (
            <g key={band.key}>
              <path data-level-rule={band.key} d={band.d} fill={label} pointerEvents="none" />
              <line
                data-level-rule={band.key}
                x1={band.tick[0][0]}
                y1={band.tick[0][1]}
                x2={band.tick[1][0]}
                y2={band.tick[1][1]}
                stroke={label}
                strokeWidth={1.6}
                vectorEffect="non-scaling-stroke"
                pointerEvents="none"
              />
            </g>
          ))}

          {wedges.map((w) => {
            const mid = (w.from + w.to) / 2;
            const r = (rings[w.ring].inner + rings[w.ring].outer) / 2;
            const [px, py] = polar(cx, cy, r, mid);
            return (
              <circle
                key={`hit-${w.ring}-${w.key}`}
                className="pt"
                data-mark-ref={`${w.ring}-${w.key}`}
                cx={px}
                cy={py}
                r={(rings[w.ring].outer - rings[w.ring].inner) / 2}
                fill="transparent"
                stroke="none"
                tabIndex={0}
                role="img"
                aria-label={w.detail}
                data-detail={w.detail}
              />
            );
          })}
          <rect className="hit-area" x={0} y={0} width={FRAME.width} height={FRAME.height} fill="transparent" pointerEvents="all" />
        </svg>

        <div className="overlay" aria-hidden="true">
          {/* THE HOLE IS NOT DECORATION: it is where the two totals are stated, because the rings
              carry shares and a share says nothing about the whole it is a share of. */}
          {centreNote.map((line, i) => (
            <span
              key={line}
              className="note"
              style={{
                ...regs.annot,
                color: label,
                left: "50%",
                top: `${50 + (i - (centreNote.length - 1) / 2) * 6}%`,
                transform: "translate(-50%, -50%)",
                background: "transparent",
                padding: 0,
                textAlign: "center",
                whiteSpace: "nowrap",
              }}
            >
              {line}
            </span>
          ))}
          {/* EVERY OPTION'S OWN CHIP, drawn once and hidden — the stylesheet reveals the chosen
              one. An opaque plate on the ground's own colour, so the words are read at text
              contrast rather than against whichever of the four tones the wedge underneath
              happens to wear. */}
          {bands.map((band) => (
            <span
              key={`w-${band.key}`}
              className="note"
              data-level-rule={band.key}
              style={{
                ...regs.annot,
                color: label,
                background: ground,
                left: `${band.left}%`,
                top: `${band.top}%`,
                transform: "translate(-50%, -50%)",
                whiteSpace: "nowrap",
              }}
            >
              {band.text}
            </span>
          ))}
          {rings.map((r) => (
            <span
              key={r.key}
              className="end-label"
              style={{
                ...regs.value,
                fontSize: `${Math.max(11, Number.parseFloat(regs.value.fontSize as string) - 2)}px`,
                color: label,
                left: "50%",
                top: `${((cy - (r.inner + r.outer) / 2) / FRAME.height) * 100}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              {r.label}
            </span>
          ))}
        </div>
        <div className="x-axis" />
      </div>

      <p className="chart-reading" style={{ ...regs.body, margin: "6px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>{source}</p>
    </figure>
  );
}
