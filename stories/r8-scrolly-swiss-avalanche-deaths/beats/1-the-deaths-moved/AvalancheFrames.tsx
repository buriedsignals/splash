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

function label(style: CSSProperties, text: string, key: string) {
  return (
    <div
      key={key}
      style={{
        position: "absolute",
        fontFamily: "Helvetica, Arial, sans-serif",
        whiteSpace: "pre-line",
        lineHeight: 1.3,
        ...style,
      }}
    >
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
  const valleyY = H * 0.82;
  // The flank: flat valley floor on the left, then a slope climbing to the top right.
  const flank = `M0 ${valleyY} L${W * 0.3} ${valleyY} L${W * 0.97} ${H * 0.08} L${W} ${H * 0.08} L${W} ${H} L0 ${H} Z`;

  const house = (x: number, y: number, w: number, h: number, key: string) => (
    <g key={key}>
      <rect x={x} y={y - h} width={w} height={h} fill={accent} opacity={0.9} />
      <path d={`M${x - w * 0.18} ${y - h} L${x + w / 2} ${y - h * 1.55} L${x + w * 1.18} ${y - h} Z`} fill={accent} />
    </g>
  );

  /** A person on the slope: a stick figure, the smallest mark that reads as a person at any size. */
  const figure = (x: number, y: number, key: string) => (
    <g key={key} stroke={second} strokeWidth={5} strokeLinecap="round" fill="none">
      <circle cx={x} cy={y - 34} r={9} fill={second} stroke="none" />
      <line x1={x} y1={y - 25} x2={x} y2={y - 8} />
      <line x1={x - 11} y1={y} x2={x} y2={y - 8} />
      <line x1={x + 11} y1={y} x2={x} y2={y - 8} />
      <line x1={x - 13} y1={y - 19} x2={x + 13} y2={y - 19} />
    </g>
  );

  return (
    <div style={{ position: "absolute", inset: 0, background: ground, overflow: "hidden" }}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
      >
        <path d={flank} fill={muted} opacity={0.16} />
        <path
          d={`M0 ${valleyY} L${W * 0.3} ${valleyY} L${W * 0.97} ${H * 0.08} L${W} ${H * 0.08}`}
          fill="none"
          stroke={muted}
          strokeWidth={2.5}
          vectorEffect="non-scaling-stroke"
        />
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
        {house(60, valleyY, 34, 30, "h1")}
        {house(118, valleyY, 26, 24, "h2")}
        {house(166, valleyY, 30, 27, "h3")}
        {figure(560, valleyY - (valleyY - H * 0.08) * 0.38, "f1")}
        {figure(760, valleyY - (valleyY - H * 0.08) * 0.67, "f2")}
      </svg>
      {label(
        {
          right: "2%",
          top: "8%",
          maxWidth: "31%",
          textAlign: "right",
          fontSize: "17px",
          color: second,
          fontWeight: 600,
        },
        `UNCONTROLLED TERRAIN\non tour and off-piste\n${group(facts.uncontrolled)} deaths`,
        "uncontrolled",
      )}
      {label(
        {
          left: "2%",
          top: "62%",
          maxWidth: "31%",
          fontSize: "17px",
          color: accent,
          fontWeight: 600,
        },
        `CONTROLLED TERRAIN\nin buildings, on roads and railways\n${group(facts.controlled)} deaths`,
        "controlled",
      )}
      {label(
        {
          left: "2%",
          bottom: "4%",
          maxWidth: "31%",
          fontSize: "13px",
          color: muted,
        },
        `${group(facts.mixed + facts.unattributed)} of ${group(facts.dead)} deaths sit on neither side and are counted as neither`,
        "residue",
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

  return (
    <div style={{ position: "absolute", inset: 0, background: ground, overflow: "hidden" }}>
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
            fontSize: "14px",
            color: muted,
          },
          String(t),
          `y${t}`,
        ),
      )}
      {decadeTicks.map((t) =>
        label(
          {
            left: t.at,
            top: `calc(${pct(PLOT.bottom)} + 8px)`,
            transform: "translateX(-50%)",
            fontSize: "14px",
            color: muted,
          },
          t.label,
          `x${t.label}`,
        ),
      )}
      {label(
        { left: "10px", top: "4%", fontSize: "14px", color: muted },
        "deaths per winter, by the winter it began in",
        "unit",
      )}
      {/* Direct labels, in the outer third — clear of the card's 409px stripe at 1000px and above. */}
      {label(
        {
          left: `calc(${atX(0.06)})`,
          top: `calc(${pct(inFrameY(1 - facts.perWinter[14].controlled / yMax))} - 46px)`,
          maxWidth: "28%",
          fontSize: "15px",
          fontWeight: 600,
          color: accent,
          background: ground,
          padding: "1px 5px",
        },
        "in buildings and\non transport routes",
        "series-controlled",
      )}
      {label(
        {
          right: "2%",
          top: `calc(${pct(inFrameY(1 - facts.perWinter[facts.perWinter.length - 8].uncontrolled / yMax))} - 52px)`,
          maxWidth: "28%",
          textAlign: "right",
          fontSize: "15px",
          fontWeight: 600,
          color: second,
          background: ground,
          padding: "1px 5px",
        },
        "on tour and\noff-piste",
        "series-uncontrolled",
      )}
      {/* The two windows the takeaway compares, annotated over their own shaded bands. */}
      {label(
        {
          left: `calc(${atX(0)} + 4px)`,
          top: `calc(${pct(PLOT.top)} + 2px)`,
          maxWidth: "24%",
          fontSize: "13px",
          color: ink,
        },
        `first ${facts.first20.winters} winters\n${group(facts.first20.controlled)} of ${group(facts.first20.total)} deaths\nin controlled terrain`,
        "band-first",
      )}
      {label(
        {
          right: "2%",
          top: `calc(${pct(PLOT.top)} + 2px)`,
          maxWidth: "24%",
          textAlign: "right",
          fontSize: "13px",
          color: ink,
        },
        `last ${facts.last20.winters} winters\n${group(facts.last20.controlled)} of ${group(facts.last20.total)} deaths\nin controlled terrain`,
        "band-last",
      )}
      {/* 1950/51 is the tallest point on the frame and the reader will ask about it before anything
          else. Named where it stands, with the one fact that makes it belong to this argument. */}
      {label(
        {
          left: `calc(${atX(worstIndex / (rows.length - 1))} + 10px)`,
          top: `calc(${pct(inFrameY(1 - facts.worstWinter.total / yMax))} - 4px)`,
          maxWidth: "26%",
          fontSize: "14px",
          fontWeight: 600,
          color: ink,
          background: ground,
          padding: "1px 5px",
        },
        `${facts.worstWinter.winter}: ${group(facts.worstWinter.total)} deaths,\n${group(facts.worstWinter.controlled)} of them indoors or on a road`,
        "worst",
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
      {levels.map((level, i) => {
        const top = PLOT.top + i * rowHeight * (PLOT.bottom - PLOT.top);
        const barTop = top + 0.055;
        const share = level.accidents / max;
        return (
          <div key={level.level}>
            {label(
              {
                left: "10px",
                top: `calc(${pct(top)} - 2px)`,
                fontSize: "15px",
                fontWeight: 600,
                color: ink,
              },
              `${level.level} — ${level.label}`,
              `name${level.level}`,
            )}
            <div
              style={{
                position: "absolute",
                left: "10px",
                top: pct(barTop),
                width: `calc((${RIGHT} - 10px) * ${share.toFixed(5)})`,
                height: "26px",
                background: accent,
                opacity: 0.85,
              }}
            />
            {label(
              {
                left: `calc(10px + (${RIGHT} - 10px) * ${share.toFixed(5)} + 10px)`,
                top: `calc(${pct(barTop)} + 4px)`,
                fontSize: "15px",
                color: ink,
              },
              `${group(level.accidents)} avalanches · ${group(level.dead)} dead`,
              `value${level.level}`,
            )}
          </div>
        );
      })}
      <div
        style={{
          position: "absolute",
          left: "10px",
          right: "3.5%",
          top: `calc(${pct(PLOT.bottom)} + 2px)`,
          borderTop: `1px solid ${grid}`,
        }}
      />
      {label(
        { left: "10px", top: "4%", fontSize: "14px", color: muted },
        `the danger level the national bulletin had forecast, on the ${group(facts.danger.withLevel)} of ${group(facts.danger.accidents)} fatal avalanches that carry one`,
        "unit",
      )}
      {label(
        { left: "10px", bottom: "3%", maxWidth: "60%", fontSize: "13px", color: muted },
        "level 5, very high, appears nowhere in this record",
        "five",
      )}
    </div>
  );
}
