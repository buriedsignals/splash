/**
 * The pure core of "Croatia is the only EU country emitting more CO₂ per person than in 1990" in
 * the WEB format — data to coordinates, and nothing else. Same boundary
 * `proof/weby-lollipop-co2-per-capita/lollipop-geometry.ts` and
 * `proof/co2-suisse/crossing-geometry.ts` keep for their own beats: no colour, no font, no label,
 * no React.
 *
 * It is structurally the sibling of `proof/static-diverging-bar-eu-per-capita`'s own
 * `divergingGeometry` and of `proof/vidz-diverging-bar-eu-per-capita`'s — **not imported from
 * either** (a beat never imports another beat's files: the "duplicate, do not link" ruling), and
 * adapted to this format's own shape. Two differences from the static one, both deliberate:
 *
 *   - `tickHint` is passed in per call rather than fixed at module scope, so the one fluid frame
 *     states its own density explicitly and decides it ONCE at the canonical width
 *     (`web-discipline.md`, "Cheap, not recomputed").
 *   - every row reports its own BAND (`bandTop`/`bandHeight`) as well as its centre, because this
 *     format gives each row a hit rectangle spanning the full plot width and the row's full height.
 *     Rows tile EXACTLY — no band padding — so a pointer anywhere in the plot is always inside
 *     exactly one row and there is no "nearest" to resolve.
 *
 * The domain CONTAINS zero rather than starting at it, and it is deliberately NOT made symmetric:
 * mirroring a −20.5 fall with a +20.5 half nobody occupies would halve the pixels per tonne on both
 * sides to make room for nothing. Equal units per pixel either side of zero is what makes two bars
 * comparable, and that is what is preserved. The visible asymmetry is the data's.
 */

import { scaleLinear } from "d3-scale";

export type Row = {
  country: string;
  /** Change in CO₂ emissions per person between the two years, tonnes. Negative is a fall. */
  change: number;
  /** The reading in the earlier year — carried for the hover detail, never drawn. */
  from: number;
  /** The reading in the later year — carried for the hover detail, never drawn. */
  to: number;
};

export type Padding = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type DivergingPoint = Row & {
  /** Vertical centre of this row's band — where the bar sits. */
  rowY: number;
  /** Top edge of this row's own band — the hit rectangle's own `y`. */
  bandTop: number;
  /** This row's own band height — the hit rectangle's own `height`. Rows tile exactly. */
  bandHeight: number;
  /** Where this row's bar ENDS. It starts at `zeroX`, on whichever side the sign puts it. */
  xValue: number;
};

export type Tick = { value: number; x: number };

export function divergingGeometry(
  rows: Row[],
  {
    width,
    height,
    padding,
    tickHint,
  }: { width: number; height: number; padding: Padding; tickHint: number },
): {
  plot: { left: number; top: number; right: number; bottom: number };
  zeroX: number;
  rowHeight: number;
  points: DivergingPoint[];
  ticks: Tick[];
  at: (value: number) => number;
} {
  const plot = {
    left: padding.left,
    top: padding.top,
    right: width - padding.right,
    bottom: height - padding.bottom,
  };

  const values = rows.map((r) => r.change);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const pad = (max - min) * 0.02;
  const x = scaleLinear()
    .domain([min - pad, max + pad])
    .range([plot.left, plot.right]);

  const rowHeight = (plot.bottom - plot.top) / rows.length;
  const points = rows.map((r, i) => ({
    ...r,
    rowY: plot.top + rowHeight * (i + 0.5),
    bandTop: plot.top + rowHeight * i,
    bandHeight: rowHeight,
    xValue: x(r.change),
  }));

  return {
    plot,
    zeroX: x(0),
    rowHeight,
    points,
    ticks: x
      .ticks(tickHint)
      .filter((v) => v !== 0)
      .map((v) => ({ value: v, x: x(v) })),
    at: (value: number) => x(value),
  };
}

/**
 * The printed value, signed EXPLICITLY. `references/types/diverging-bar.md` requires a + or a − on
 * every value label on this type, because the sign IS the finding and a bare number leaves it to
 * the bar's direction alone. The minus is U+2212, never a hyphen: a hyphen is narrower, sits lower,
 * and is the character a rule crossing it turns into a plus — the exact defect this beat's video
 * sibling shipped and had to fix.
 *
 * Grouping is delegated to `Intl.NumberFormat`, never hand-rolled. This beat's values never reach a
 * thousand, but three incompatible hand-rolled separators under one name is a defect this corpus
 * has already paid for, and the name here claims `en` — which is what this beat's own `<html lang>`
 * declares. The absolute value is formatted and the sign prefixed, because `Intl` would emit its
 * own U+002D.
 */
export function en(value: number, decimals = 2): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  const digits = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Math.abs(value));
  return `${sign}${digits}`;
}

/**
 * The full-precision reading — the thing this format's interaction honestly adds, and the reason
 * this beat's hover is not the printed label repeated on demand. The static sibling prints the
 * CHANGE rounded to two decimals and has room for nothing else; the two readings the change is made
 * OF are omitted there entirely. Here they are one hover, tap or keyboard focus away, unrounded.
 *
 * `String(v)` on a value parsed straight out of the CSV's own decimal literal round-trips exactly
 * for every reading in this dataset — this function never re-rounds or reformats what the source
 * already carries. The subtraction's own result is a different matter and is rounded, because
 * 4.764723 − 4.7331753 lands on 0.031547699999999956 in binary floating point and printing that
 * would be reporting an artefact of the arithmetic as a measurement.
 */
export function exact(v: number): string {
  return String(v);
}

/** The change, at the precision the subtraction can honestly support. See `exact` above. */
export function exactChange(v: number): string {
  return en(v, 4);
}
