/**
 * The four frames this beat assembles behind one scroll: a MAP of every fatal avalanche, a DRAWN
 * diagram of the two terrains the SLF counts in, a CHART of the two counts across 88 winters, and a
 * second CHART of what the forecast said. Four pictures, four different things to say.
 *
 * No component here imports the rasteriser: `ink`, `muted` and `grid` are props, derived once in
 * node by the runner. No component knows about `.step-frame`, `active` or `aria-hidden`; those
 * belong to the scaffold.
 *
 * TWO PLACEMENT RULES GOVERN EVERY LABEL BELOW, and they come from the vehicle, not from this beat.
 *
 * 1. **FITTED, NEVER CROPPED — including the map.** The seed COVER-crops its map because its map is
 *    a locator: one marker, centred by construction, and the crop costs a reader nothing. This
 *    beat's map is EVIDENCE — 1 406 points whose SHAPE is the reading — so cropping it would delete
 *    data. Measured: at a 375x720 frame, COVER on a 1240x640 plate shows 0.52 x 640 = 333 of its
 *    1 240 px of width, i.e. 27% of Switzerland, and the country's two ends are the two ends of the
 *    Alpine arc. So the map is `xMidYMid meet`, letterboxed in the render's own `ground` — the same
 *    ruling the seed's own `ImageFrame` carries for a photograph, applied one track over. The cost
 *    is real and is stated in `NOTES-FOR-MAINTAINER.md`: on a phone the map band is short.
 *
 * 2. **THE CARD'S STRIPE.** The prose card is centred, opaque, and — above 600px — a FIXED 409px
 *    wide whatever the frame is. So the gutters a label can hide in are `(W - 409) / 2`: 595px at
 *    1600, 295px at 1000, and 95px at 600. There is no placement that is outside the stripe at
 *    every width, which is the vehicle's own recorded finding, not this beat's. What is placed here:
 *    tick furniture inside the ~62px the seed's own `CHART_LAYOUT` proves safe at every width, and
 *    every descriptive label in the outer third, where it is clear at 1000px and above. Between
 *    600 and 1000px the card crosses those labels for part of each step; measured and reported.
 */

import type { CSSProperties } from "react";
import type { AvalancheFacts, WinterRow } from "./avalanche-data.ts";
import { group } from "./avalanche-data.ts";

/** The geometry-only viewBox every stretched chart SVG in this beat draws into. Geometry stretches
 *  with the box (`preserveAspectRatio="none"`); every WORD is HTML at a fixed pixel size over the
 *  same box, so the type never scales with the viewport. */
const VIEWBOX = { width: 1000, height: 500 };

/** The plot box, in fractions of the frame. `left` is expressed as a `max(62px, …)` below: a pure
 *  percentage gutter is a fixed-size label in a shrinking box, and 11% of a 375px phone is 41px,
 *  which is narrower than the widest tick label this beat draws. */
const PLOT = { left: 0.11, right: 0.965, top: 0.15, bottom: 0.88 };

const pct = (v: number) => `${(v * 100).toFixed(2)}%`;
const LEFT = `max(62px, ${pct(PLOT.left)})`;
const RIGHT = pct(PLOT.right);
const atX = (f: number) => `calc(${LEFT} + ${f.toFixed(5)} * (${RIGHT} - ${LEFT}))`;
const inFrameY = (fy: number) => PLOT.top + fy * (PLOT.bottom - PLOT.top);

/**
 * THE ONE BREAKPOINT EVERY FRAME IN THIS BEAT SHARES, and why it exists.
 *
 * Driven at 375x812, the first build's frames were unreadable — not because the card covered them
 * but because their own labels collided with each other. A label capped at 27% of the frame is
 * 432px on a 1600px desktop and 101px on a phone; the 1950/51 annotation wrapped to SIX lines and
 * the danger frame's own unit line ran straight through its first row's name.
 *
 * The cap exists to keep a label out of the prose card's own 409px stripe, and BELOW 600px there is
 * no stripe: the card goes edge to edge (`render-scrolly.mjs`, `buildCss`, the `min-width: 600px`
 * query), so it hides whole rows and can cut nothing. The same 600px is therefore the width at
 * which every cap here is lifted. Above it, caps; below it, room.
 *
 * `.av-wide` / `.av-narrow` are the two elements a placement cannot express as one — an annotation
 * anchored to the left of a spike has only as much room as the spike is far from the frame's edge.
 */
const FRAME_CSS = `
.av-l { position: absolute; font-family: Helvetica, Arial, sans-serif; white-space: pre-line; line-height: 1.3; }
.av-narrow { display: none; }
.av-f17 { font-size: 17px; } .av-f15 { font-size: 15px; } .av-f14 { font-size: 14px; }
.av-f13 { font-size: 13px; } .av-f12 { font-size: 12px; }
.av-cap { max-width: 28%; } .av-cap-wide { max-width: 34%; } .av-cap-tight { max-width: 22%; }
.av-bar { height: 58px; }
@media (max-width: 599px) {
  .av-wide { display: none; }
  .av-narrow { display: block; }
  .av-cap, .av-cap-wide, .av-cap-tight { max-width: calc(100% - 20px); }
  .av-f17 { font-size: 15px; } .av-f15 { font-size: 13px; } .av-f14 { font-size: 12px; }
  .av-f13 { font-size: 12px; } .av-f12 { font-size: 11px; }
  .av-bar { height: 30px; }
}
`;

function Styles() {
  return <style dangerouslySetInnerHTML={{ __html: FRAME_CSS }} />;
}

function label(style: CSSProperties, text: string, key: string, className = "") {
  return (
    <div key={key} className={`av-l ${className}`.trim()} style={style}>
      {text}
    </div>
  );
}

/**
 * THE MAP TRACK. The baked plate, inlined as a data URI, with one dot per fatal avalanche — area
 * proportional to the number of people it killed, colour naming which terrain they were in.
 *
 * The plate is `dataviz-dark` because this story's recorded ground is `#16191B`; the bake derives
 * that from `PALETTE.md` rather than carrying a literal. See `bake-plate.mjs`'s own header for why
 * the skill's bake could not be used.
 */
export function MapFrame({
  plate,
  frame,
  points,
  ground,
  ink,
  muted,
  accent,
  second,
  facts,
}: {
  plate: string;
  frame: { width: number; height: number };
  /** `[x, y, dead, side]`, projected by the very camera that drew the plate — never re-derived. */
  points: [number, number, number, string][];
  ground: string;
  ink: string;
  muted: string;
  accent: string;
  second: string;
  facts: AvalancheFacts;
}) {
  // Area, not radius, carries the count: a dot for 30 dead is sqrt(30) times the radius of a dot
  // for one, so the INK is proportional to what it counts. The floor keeps a single death visible.
  const radius = (dead: number) => 2.4 + 1.35 * Math.sqrt(dead);
  const inkFor = (side: string) =>
    side === "controlled" ? accent : side === "uncontrolled" ? second : muted;
  // Controlled last, so the 242 accidents this beat's argument is about are not buried under the
  // 1 155 that are not.
  const order = ["unattributed", "mixed", "uncontrolled", "controlled"];
  const sorted = [...points].sort((a, b) => order.indexOf(a[3]) - order.indexOf(b[3]));

  return (
    <div style={{ position: "absolute", inset: 0, background: ground, overflow: "hidden" }}>
      <Styles />
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${frame.width} ${frame.height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        <image href={plate} x={0} y={0} width={frame.width} height={frame.height} />
        {sorted.map(([x, y, dead, side], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={radius(dead)}
            fill={inkFor(side)}
            fillOpacity={0.62}
          />
        ))}
      </svg>
      {/* The legend is CENTRED and 340px wide — inside the card's own 409px stripe at every width
          above 600px, so the card hides it whole while it passes and never cuts it in half. */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          bottom: "3%",
          maxWidth: "340px",
          fontFamily: "Helvetica, Arial, sans-serif",
          fontSize: "14px",
          lineHeight: 1.5,
          color: ink,
          background: ground,
          padding: "6px 10px",
        }}
      >
        <div>
          <span style={{ color: accent }}>●</span> in buildings or on transport routes
        </div>
        <div>
          <span style={{ color: second }}>●</span> on tour or off-piste
        </div>
        <div style={{ color: muted, fontSize: "13px", paddingTop: "2px" }}>
          {`one dot per avalanche, sized by the number it killed · ${group(facts.accidents)} avalanches`}
        </div>
      </div>
    </div>
  );
}

/**
 * THE DRAWN TRACK. A schematic of the SLF's own split — no axis, no plotted value, nothing a reader
 * could read a number off the drawing itself. The two counts are stated in words beside it.
 *
 * The schematic stretches (`preserveAspectRatio="none"`) so it fills whatever box the frame gives
 * it at any aspect; nothing here encodes an angle, so a stretched slope costs no meaning. The seed's
 * own drawn frame is COVER-cropped instead, which is right for a drawing whose subject is centred
 * and wrong for one whose subject is the whole width.
 */
export function DiagramFrame({
  ground,
  ink,
  muted,
  accent,
  second,
  facts,
}: {
  ground: string;
  ink: string;
  muted: string;
  accent: string;
  second: string;
  facts: AvalancheFacts;
}) {
  const { width: W, height: H } = VIEWBOX;
  const valleyY = H * 0.8;
  const summitY = H * 0.22;
  const footX = W * 0.28;
  const crestX = W * 0.96;
  const ridge = `M0 ${valleyY} L${footX} ${valleyY} L${crestX} ${summitY} L${W} ${summitY}`;
  const flank = `${ridge} L${W} ${H} L0 ${H} Z`;
  /** Where the slope's own surface sits at a given fraction of the way up it. Every mark placed on
   *  the flank is placed through this, so nothing floats above it or sinks into it. */
  const onSlope = (t: number) => ({ x: footX + t * (crestX - footX), y: valleyY - t * (valleyY - summitY) });
  // The avalanche path itself: narrow at the start zone, spreading to the valley floor. It is the
  // one mark that touches both labelled terrains, which is the whole point of this frame.
  const start = onSlope(0.82);
  const track = `M${start.x - 26} ${start.y} L${start.x + 26} ${start.y - 14} L${W * 0.62} ${valleyY} L${W * 0.3} ${valleyY} Z`;

  /** THE LANDFORM STRETCHES; THE THINGS STANDING ON IT DO NOT. Driven at 375x812, the first build
   *  drew the houses and the skiers inside the stretched SVG, and `preserveAspectRatio="none"` on a
   *  0.63 box turned three houses into three rockets. A ridge, a fill and a road carry no shape a
   *  reader reads, so they stretch; a house and a person are shapes, so they are HTML marks at a
   *  fixed pixel size, positioned in percentages ON the same geometry. */
  const mark = (xUnits: number, yUnits: number, node: JSX.Element, key: string) => (
    <div
      key={key}
      style={{
        position: "absolute",
        left: `${((xUnits / W) * 100).toFixed(3)}%`,
        top: `${((yUnits / H) * 100).toFixed(3)}%`,
        transform: "translate(-50%, -100%)",
      }}
    >
      {node}
    </div>
  );

  const house = (w: number, h: number) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={w} height={h * 1.6} viewBox={`0 0 ${w} ${h * 1.6}`} style={{ display: "block" }}>
      <rect x={0} y={h * 0.6} width={w} height={h} fill={accent} opacity={0.9} />
      <path d={`M${-w * 0.16} ${h * 0.6} L${w / 2} ${0} L${w * 1.16} ${h * 0.6} Z`} fill={accent} />
    </svg>
  );

  /** A person on the slope: a stick figure, the smallest mark that reads as a person at any size. */
  const figure = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width={30} height={46} viewBox="0 0 30 46" style={{ display: "block" }}>
      <g stroke={second} strokeWidth={3.4} strokeLinecap="round" fill="none">
        <circle cx={15} cy={8} r={6.5} fill={second} stroke="none" />
        <line x1={15} y1={15} x2={15} y2={33} />
        <line x1={5} y1={44} x2={15} y2={33} />
        <line x1={25} y1={44} x2={15} y2={33} />
        <line x1={3} y1={22} x2={27} y2={22} />
      </g>
    </svg>
  );

  return (
    <div style={{ position: "absolute", inset: 0, background: ground, overflow: "hidden" }}>
      <Styles />
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
      >
        <path d={flank} fill={muted} opacity={0.26} />
        <path d={track} fill={ink} opacity={0.13} />
        <path d={ridge} fill="none" stroke={muted} strokeWidth={3} vectorEffect="non-scaling-stroke" />
        {/* The road along the valley floor — a transport corridor, one half of "controlled". */}
        <line
          x1={0}
          x2={W * 0.29}
          y1={valleyY + 26}
          y2={valleyY + 26}
          stroke={accent}
          strokeWidth={4}
          strokeDasharray="18 12"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {/* Spaced in the DESIGN canvas but drawn at a fixed pixel size, so the gap between two houses
          shrinks as the frame narrows. At 60/118/166 they overlapped at 375px — measured, then
          opened out to a spacing that still clears at the narrowest width this beat is driven at. */}
      {mark(60, valleyY, house(34, 30), "h1")}
      {mark(150, valleyY, house(26, 24), "h2")}
      {mark(240, valleyY, house(30, 27), "h3")}
      {mark(onSlope(0.4).x, onSlope(0.4).y, figure(), "f1")}
      {mark(onSlope(0.72).x, onSlope(0.72).y, figure(), "f2")}
      {label(
        { right: "3%", top: "4%", textAlign: "right", color: second, fontWeight: 600 },
        `UNCONTROLLED TERRAIN\non tour and off-piste\n${group(facts.uncontrolled)} deaths`,
        "uncontrolled",
        "av-f17 av-cap",
      )}
      {label(
        { left: "3%", top: "52%", color: accent, fontWeight: 600 },
        `CONTROLLED TERRAIN\nin buildings, on roads and railways\n${group(facts.controlled)} deaths`,
        "controlled",
        "av-f17 av-cap",
      )}
      {label(
        { left: "3%", bottom: "4%", color: muted },
        `${group(facts.mixed + facts.unattributed)} of ${group(facts.dead)} deaths sit on neither side and are counted as neither`,
        "residue",
        "av-f13 av-cap",
      )}
    </div>
  );
}

/**
 * THE FIRST CHART TRACK. Deaths per winter, 1936/37 to 2023/24, on the SLF's own split — the
 * crossover the publisher's own Figure 1 caption promises ("The graph illustrates the fall in the
 * number of fatalities in buildings and on transportation routes") and never states as a number.
 *
 * The two series are told apart by THREE things, not one: colour, line style (solid against dashed)
 * and a direct label. Measured, `#D4A853` and `#5B8A8A` differ by 1.75:1 in luminance — they clear
 * the non-text floor against the GROUND, which is the only thing `palette` measures, and nothing in
 * this toolchain measures two series inks against EACH OTHER. A reader who cannot separate the two
 * hues has the dash and the label.
 */
export function SeriesFrame({
  facts,
  ground,
  ink,
  muted,
  grid,
  accent,
  second,
}: {
  facts: AvalancheFacts;
  ground: string;
  ink: string;
  muted: string;
  grid: string;
  accent: string;
  second: string;
}) {
  const rows = facts.perWinter;
  const step = 25;
  const yMax = Math.ceil(facts.worstWinter.total / step) * step;
  const yTicks = Array.from({ length: yMax / step + 1 }, (_, i) => i * step);
  const x = (i: number) => (i / (rows.length - 1)) * VIEWBOX.width;
  const y = (v: number) => VIEWBOX.height - (v / yMax) * VIEWBOX.height;
  const path = (pick: (row: WinterRow) => number) =>
    rows.map((row, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(pick(row)).toFixed(1)}`).join("");

  const bandFrom = (from: number, to: number) => ({
    x: x(from),
    width: x(to) - x(from),
  });
  const firstBand = bandFrom(0, facts.first20.winters - 1);
  const lastBand = bandFrom(rows.length - facts.last20.winters, rows.length - 1);

  const decadeTicks = rows
    .map((row, i) => ({ i, year: row.startYear }))
    .filter(({ year }) => year % 20 === 0)
    .map(({ i, year }) => ({ at: atX(i / (rows.length - 1)), label: String(year) }));

  const worstIndex = rows.findIndex((row) => row.winter === facts.worstWinter.winter);
  // Where each line ENDS, which is where each is labelled. Read off the last winter, never typed.
  const lastGold = rows[rows.length - 1].controlled;
  const lastTeal = rows[rows.length - 1].uncontrolled;

  return (
    <div style={{ position: "absolute", inset: 0, background: ground, overflow: "hidden" }}>
      <Styles />
      <div
        style={{
          position: "absolute",
          left: LEFT,
          top: pct(PLOT.top),
          width: `calc(${RIGHT} - ${LEFT})`,
          height: pct(PLOT.bottom - PLOT.top),
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
          preserveAspectRatio="none"
          style={{ width: "100%", height: "100%", display: "block", overflow: "visible" }}
        >
          <rect x={firstBand.x} y={0} width={firstBand.width} height={VIEWBOX.height} fill={ink} opacity={0.06} />
          <rect x={lastBand.x} y={0} width={lastBand.width} height={VIEWBOX.height} fill={ink} opacity={0.06} />
          {yTicks.map((t) => (
            <line
              key={t}
              x1={0}
              x2={VIEWBOX.width}
              y1={y(t)}
              y2={y(t)}
              stroke={t === 0 ? ink : grid}
              strokeWidth={t === 0 ? 2 : 1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <path
            d={path((row) => row.uncontrolled)}
            fill="none"
            stroke={second}
            strokeWidth={2}
            strokeDasharray="7 5"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={path((row) => row.controlled)}
            fill="none"
            stroke={accent}
            strokeWidth={2.4}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      {yTicks.map((t) =>
        label(
          {
            left: 0,
            top: `calc(${pct(inFrameY(1 - t / yMax))} - 9px)`,
            width: `calc(${LEFT} - 10px)`,
            textAlign: "right",
            color: muted,
          },
          String(t),
          `y${t}`,
          "av-f14",
        ),
      )}
      {decadeTicks.map((t) =>
        label(
          {
            left: t.at,
            top: `calc(${pct(PLOT.bottom)} + 8px)`,
            transform: "translateX(-50%)",
            color: muted,
          },
          t.label,
          `x${t.label}`,
          "av-f14",
        ),
      )}
      {label(
        { left: "10px", top: "4%", color: muted },
        "deaths per winter, by the winter it began in",
        "unit",
        "av-f14 av-cap-wide",
      )}
      {/* THE TWO SERIES ARE LABELLED WHERE THEY END, both in the right-hand gutter, because that is
          where the argument lands: the gold line is on the floor and the dashed one is not. Both
          sit outside the card's own 409px stripe at 1000px and above. The first draft put the gold
          label over the 1950/51 spike, where it collided with two other labels; driving the page is
          what showed it. */}
      {label(
        {
          right: "2%",
          top: `calc(${pct(inFrameY(1 - lastGold / yMax))} - 46px)`,
          textAlign: "right",
          fontWeight: 600,
          color: accent,
          background: ground,
          padding: "1px 5px",
        },
        "in buildings and\non transport routes",
        "series-controlled",
        "av-f15 av-cap",
      )}
      {label(
        {
          right: "2%",
          top: `calc(${pct(inFrameY(1 - lastTeal / yMax))} - 52px)`,
          textAlign: "right",
          fontWeight: 600,
          color: second,
          background: ground,
          padding: "1px 5px",
        },
        "on tour and\noff-piste",
        "series-uncontrolled",
        "av-f15 av-cap",
      )}
      {/* The two windows the takeaway compares, captioned UNDER their own shaded bands — a second
          row below the decade ticks, where nothing is drawn and nothing can collide. Their counts
          are in the step's own prose; repeating them here would be the same sentence twice. */}
      {label(
        { left: atX(0), top: `calc(${pct(PLOT.bottom)} + 30px)`, color: ink },
        `first ${facts.first20.winters} winters`,
        "band-first",
        "av-f13 av-cap-tight",
      )}
      {label(
        { right: "2%", top: `calc(${pct(PLOT.bottom)} + 30px)`, textAlign: "right", color: ink },
        `last ${facts.last20.winters} winters`,
        "band-last",
        "av-f13 av-cap-tight",
      )}
      {/* 1950/51 is the tallest point on the frame and the reader will ask about it before anything
          else. Named where it stands, and anchored to the LEFT of the spike so the text runs away
          from the card's stripe rather than into it. */}
      {label(
        {
          right: `calc(100% - ${atX(worstIndex / (rows.length - 1))} + 8px)`,
          top: `calc(${pct(inFrameY(1 - facts.worstWinter.total / yMax))} - 2px)`,
          textAlign: "right",
          fontWeight: 600,
          color: ink,
          background: ground,
          padding: "1px 5px",
        },
        `${facts.worstWinter.winter}: ${group(facts.worstWinter.total)} dead,\n${group(facts.worstWinter.controlled)} of them indoors\nor on a road`,
        "worst",
        "av-f14 av-cap-tight av-wide",
      )}
      {/* The same annotation for a phone: anchored to the LEFT of the frame instead of to the left
          of the spike, because at 375px the spike stands 90px from the edge and no three-line label
          fits in 90px — measured, it wrapped to six lines and swallowed the top of the plot. */}
      {label(
        {
          left: `calc(${LEFT} + 6px)`,
          top: `calc(${pct(inFrameY(1 - facts.worstWinter.total / yMax))} - 2px)`,
          fontWeight: 600,
          color: ink,
          background: ground,
          padding: "1px 5px",
        },
        `${facts.worstWinter.winter}: ${group(facts.worstWinter.total)} dead, ${group(facts.worstWinter.controlled)} of them indoors or on a road`,
        "worst-narrow",
        "av-f14 av-cap av-narrow",
      )}
    </div>
  );
}

/**
 * THE SECOND CHART TRACK. A different variable, a different population and a different chart: the
 * avalanche danger level the national bulletin had forecast, on the accidents that carry one.
 *
 * It carries the publisher's own warning in the beat's prose, verbatim from `source/article.md`:
 * "this graph does not correspond to an individual's risk because only the absolute numbers of
 * accidents are shown without reference to the sizes of the risk populations surveyed in each
 * category."
 */
export function DangerFrame({
  facts,
  ground,
  ink,
  muted,
  grid,
  accent,
}: {
  facts: AvalancheFacts;
  ground: string;
  ink: string;
  muted: string;
  grid: string;
  accent: string;
}) {
  const levels = facts.danger.levels;
  const max = Math.max(...levels.map((l) => l.accidents));
  const rowHeight = 1 / levels.length;

  return (
    <div style={{ position: "absolute", inset: 0, background: ground, overflow: "hidden" }}>
      <Styles />
      {levels.map((level, i) => {
        const top = PLOT.top + i * rowHeight * (PLOT.bottom - PLOT.top);
        const share = level.accidents / max;
        return (
          <div key={level.level}>
            {/* THE COUNT RIDES ON THE ROW'S OWN NAME, not on the end of its bar. The first draft
                put it after the bar, and the longest bar reaches the right edge of the frame — so
                "209 avalanches · 255 dead" was clipped in half by the frame itself at 1600x900.
                On the name it is left-anchored at 10px, the one place clear of the card's stripe at
                every width above 600. */}
            {label(
              { left: "10px", top: `calc(${pct(top)} - 4px)`, color: ink },
              `${level.level} — ${level.label}`,
              `name${level.level}`,
              "av-f15 av-cap-wide",
            )}
            {label(
              { left: "10px", top: `calc(${pct(top)} + 18px)`, color: muted },
              `${group(level.accidents)} avalanches · ${group(level.dead)} dead`,
              `value${level.level}`,
              "av-f14 av-cap-wide",
            )}
            <div
              className="av-bar"
              style={{
                position: "absolute",
                left: "10px",
                top: `calc(${pct(top)} + 44px)`,
                width: `calc((${RIGHT} - 10px) * ${share.toFixed(5)})`,
                background: accent,
                opacity: 0.85,
              }}
            />
          </div>
        );
      })}
      {/* The rule that closes the bars off from the footnotes. Wide only: at 375px the frame is
          short enough that the verbatim SLF caveat below reaches up past this line, and a rule
          running through a quotation is the dashed-rule-through-a-label defect in another costume. */}
      <div
        className="av-wide"
        style={{
          position: "absolute",
          left: "10px",
          right: "3.5%",
          top: `calc(${pct(PLOT.bottom)} + 2px)`,
          borderTop: `1px solid ${grid}`,
        }}
      />
      {label(
        { left: "10px", top: "3%", color: muted },
        `the danger level the national bulletin had forecast,\non the ${group(facts.danger.withLevel)} of ${group(facts.danger.accidents)} fatal avalanches that carry one`,
        "unit",
        "av-f14 av-cap-wide",
      )}
      {label(
        { left: "10px", top: `calc(${pct(PLOT.bottom)} + 10px)`, color: muted },
        "level 5, very high, appears nowhere in this record",
        "five",
        "av-f13 av-cap-wide av-wide",
      )}
      {/* The publisher's own warning about this exact reading, verbatim, on the frame that makes it
          — centred and 340px wide, so it sits INSIDE the card's own stripe and is hidden whole
          while the card passes rather than cut in half. */}
      {label(
        {
          left: "50%",
          transform: "translateX(-50%)",
          bottom: "2%",
          maxWidth: "340px",
          color: muted,
          textAlign: "center",
          background: ground,
          padding: "4px 8px",
        },
        "SLF, on this reading: \u201cthis graph does not correspond to an individual\u2019s risk because only the absolute numbers of accidents are shown without reference to the sizes of the risk populations surveyed in each category.\u201d",
        "caveat",
        "av-f12",
      )}
    </div>
  );
}
