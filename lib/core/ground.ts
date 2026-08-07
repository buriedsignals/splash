// ground.ts — CAN THE NEWSROOM'S OWN GROUND CARRY LEGIBLE TEXT, measured against what actually
// gets painted.
//
// lib/core/theme.ts DERIVES the furniture from a ground; this asks the question that comes after:
// once that furniture is painted, does a reader read it. The two are separate because the answer
// is not a property of the ground alone — on a map the text stands on a TRANSLUCENT pill, so what
// the pill is composited over is part of the answer, and that backdrop is a fact about the basemap
// the run pins, not about the newsroom's colour.
//
// ★ WHY THIS FILE EXISTS AT ALL — the defect it repairs
// (docs/splash/defect-2026-08-07-saturated-house-ground-refused-at-produce.md). The map produce
// guard composited the pill over BOTH absolute poles, black and white, and judged it on whichever
// left less headroom. For a SATURATED ground the losing pole is always the one its own basemap
// rules out: a dark green ground pins `dataviz-dark`, and the guard measured it on WHITE
// (#0A5C36 → pill over white → #36795a → 3.26:1 → refused); a light pink pins `dataviz-light`, and
// the guard measured it on BLACK (#F2C6D6 → #c6a2af → 4.40:1 → refused). Both refusals described a
// render that cannot happen. On the basemap those configs DO pin, the same furniture reads at
// 5.22:1 and 6.40:1.
//
// The conservative half is untouched and is the reason this is a repair and not a loosening: a
// ground that genuinely cannot carry text still fails on the basemap it does pin — a mid-grey
// #717171 comes back 4.00:1, because no foreground clears 4.5:1 against a mid-luminance ground.
// That is physics (WCAG luminance is a ratio around the ground), not a policy this file chose.
import { contrastRatio, MIN_CONTRAST } from "./contrast";
import { hexToOklch, oklchToHex } from "./house-ramp";
import {
  bgIsDark,
  deriveFurniture,
  resolveFrameColors,
  resolveThemeBg,
} from "./theme";

/**
 * The harshest colour each shipped basemap can put UNDER a furniture pill.
 *
 * MEASURED, not assumed: fetched 2026-08-07 from
 * `api.maptiler.com/maps/{dataviz-dark,dataviz-light}/style.json` and reduced over every
 * background/fill/line layer in each style —
 *
 *   · dataviz-dark  area colours run #000000 (Water shadow) … #4D4D4D (Disputed border)
 *   · dataviz-light area colours run #C1C2C2 (Water shadow) … #FFFFFF (Road network)
 *
 * Only ONE end of each range can move the answer, because the furniture's polarity follows the
 * ground's: on a dark ground the text is light, so the pill is only ever hurt by a LIGHTER
 * backdrop; on a light ground the text is dark, so only a DARKER one hurts. Those two extremes
 * are the constants. A render sampled at the same time agrees on the ordinary case (the two
 * dominant fills came out #141414/#292929 on dark and #E0E0E1/#F7F7F7 on light) — the style is
 * used rather than the sample because a sample only shows the geography that was rendered, while
 * the style bounds every geography.
 *
 * NOT the same fact as `BASEMAP_LUMINANCE` in lib/core/house-ramp.ts, and deliberately not merged
 * with it: that one is a REPRESENTATIVE basemap luminance for a WCAG 1.4.11 check on a data MARK
 * spread across the whole map; this one is the WORST CASE under a small pill. Same basemaps, two
 * different questions, so two numbers — the names say which is which.
 */
export const BASEMAP_PILL_BACKDROP = {
  dark: "#4D4D4D",
  light: "#C1C2C2",
} as const;

/** SPLASH'S OWN GROUND — what a visual is built on when no charter constrains it, and the second
 *  alternative `groundChoices` offers. It is not "no colour": on this ground the visual's own
 *  colour is the one Splash picks for the SUBJECT of each story, which is what a newsroom gets
 *  back by taking it. Legible by construction (it is the light default the whole engine set was
 *  built on), and `groundChoices` re-measures it anyway rather than trusting that sentence. */
export const SUBJECT_GROUND = "#FFFFFF";

/** Which of MapTiler's two basemaps a ground pins. The same luminance snap
 *  `mergeProfileDefaults` applies when it writes `mapStyle` — read from `bgIsDark`, never
 *  restated, so the guard and the render can never disagree about which basemap is under the
 *  pill. */
export function darkBasemapForGround(themeBg?: string): boolean {
  return bgIsDark(themeBg);
}

/** `rgba(r,g,b,a)` composited over an opaque `#rrggbb`. */
function compositeOver(rgba: string, under: string): string | undefined {
  const m =
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/.exec(
      rgba,
    );
  if (!m) return undefined;
  const a = m[4] === undefined ? 1 : Number(m[4]);
  const u = [1, 2, 3].map((i) =>
    parseInt(under.slice(1 + (i - 1) * 2, 2 + i * 2 - 1), 16),
  );
  return (
    "#" +
    [1, 2, 3]
      .map((i) =>
        Math.round(a * Number(m[i]!) + (1 - a) * u[i - 1]!)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

/**
 * The colour map furniture text ACTUALLY stands on: the pill `resolveFrameColors` derives from
 * the ground, composited over the pinned basemap's harshest area colour.
 *
 * `darkBasemap` is passed, never inferred here, because a config may pin `mapStyle` explicitly
 * and a per-element override always wins over the profile's luminance snap — the caller holds the
 * resolved answer and this must measure THAT map, not a plausible one.
 */
export function mapPillGround(
  themeBg: string | undefined,
  houseHue: string | undefined,
  darkBasemap: boolean,
): string {
  const { pill } = resolveFrameColors(themeBg, houseHue);
  const backdrop = darkBasemap
    ? BASEMAP_PILL_BACKDROP.dark
    : BASEMAP_PILL_BACKDROP.light;
  return (
    compositeOver(pill, backdrop) ?? resolveThemeBg(themeBg) ?? SUBJECT_GROUND
  );
}

/** One text role that does not clear the floor, with the numbers that say so. `surface` is what
 *  the journalist would see it on — a chart's own background, or a map's furniture pill. */
export type GroundFailure = {
  surface: "chart" | "map";
  role: "title" | "secondary";
  /** the text colour the engine derives for that role */
  text: string;
  /** the colour it is painted on, composite included */
  ground: string;
  ratio: number;
};

export type GroundVerdict = {
  ok: boolean;
  failures: GroundFailure[];
};

/**
 * Does this ground carry legible text on EVERY surface Splash paints on it — a chart's background
 * and a map's furniture pill?
 *
 * Both are asked because a charter's ground is declared ONCE and every visual inherits it: a
 * ground that works for a chart and not for a map is not a usable house ground, and a newsroom
 * has to learn that when it picks the colour, not when a map run dies.
 */
export function groundLegibility(
  theme?: string,
  houseHue?: string,
): GroundVerdict {
  const failures: GroundFailure[] = [];
  const check = (
    surface: GroundFailure["surface"],
    role: GroundFailure["role"],
    text: string,
    ground: string,
  ) => {
    const ratio = contrastRatio(text, ground);
    if (ratio < MIN_CONTRAST)
      failures.push({ surface, role, text, ground, ratio });
  };

  const chart = deriveFurniture(theme, houseHue);
  check("chart", "title", chart.ink, chart.bg);
  check("chart", "secondary", chart.muted, chart.bg);

  const frame = resolveFrameColors(theme, houseHue);
  const pill = mapPillGround(theme, houseHue, darkBasemapForGround(theme));
  check("map", "title", frame.ink, pill);
  check("map", "secondary", frame.muted, pill);

  return { ok: failures.length === 0, failures };
}

// How far the search below is allowed to walk, and in what steps. OKLCH lightness runs 0…1; 0.01
// is finer than any ground a newsroom would notice being moved, and 100 steps therefore covers
// the whole axis in either direction.
const NEAREST_STEP = 0.01;

/**
 * The closest ground to this one that IS legible, keeping its hue and its chroma — only lightness
 * moves, and it moves as little as it can. Both directions are tried and the shorter walk wins,
 * so a ground just under the floor comes back barely changed rather than pushed to a pole.
 *
 * `undefined` when the ground already works (there is nothing to propose) and when no lightness
 * on the axis rescues it (which no real hue does — a pure enough hue at every lightness is not
 * something sRGB produces — but the caller must not be handed a colour that fails).
 */
export function nearestLegibleGround(
  theme: string,
  houseHue?: string,
): string | undefined {
  const bg = resolveThemeBg(theme);
  if (!bg) return undefined; // the light default is already legible; nothing to move
  if (groundLegibility(bg, houseHue).ok) return undefined;
  const base = hexToOklch(bg);
  for (let step = 1; step <= Math.round(1 / NEAREST_STEP); step++) {
    for (const direction of [-1, 1]) {
      const L = base.L + direction * step * NEAREST_STEP;
      if (L < 0 || L > 1) continue;
      const candidate = oklchToHex({ L, C: base.C, h: base.h });
      if (groundLegibility(candidate, houseHue).ok) return candidate;
    }
  }
  return undefined;
}

/** The two grounds offered when a newsroom's own one cannot carry text, beside keeping theirs. */
export type GroundChoices = {
  /** what the newsroom declared — the option they can always keep */
  declared: string;
  /** the same colour, moved as little as possible until text reads on it */
  nearest: string;
  /** Splash's own ground, on which each visual's colour follows its subject */
  subject: string;
};

/**
 * The offer, or `undefined` when the declared ground works and there is nothing to offer.
 *
 * Both proposals are re-measured here rather than assumed: this function is the one place that
 * promises "these work", and a promise nothing checked is how the charter came to propose a
 * ground the producer then refused.
 */
export function groundChoices(
  theme: string,
  houseHue?: string,
): GroundChoices | undefined {
  const bg = resolveThemeBg(theme);
  if (!bg || groundLegibility(bg, houseHue).ok) return undefined;
  const nearest = nearestLegibleGround(bg, houseHue);
  return {
    declared: bg,
    // Falls back to Splash's own ground rather than offering a colour that fails: an alternative
    // that does not work is not an alternative.
    nearest: nearest ?? SUBJECT_GROUND,
    subject: SUBJECT_GROUND,
  };
}
