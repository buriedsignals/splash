// EXPORT ASPECT, keyed to the CADRAGE delivery channel (Gate 1, Q3: "where does
// this publish — article embed, social, print?"). Datawrapper's PNG export, given
// only a width, renders at the chart's OWN natural aspect — which shipped a 4.3:1
// landscape strip (2400×554) for a chart the journalist had asked for as a square
// feed post. Pin the export box per channel so a feed ships square, a social/story
// ships portrait, and an article/web embed ships landscape. Table-driven, so every
// future chart (and every producer that adopts this table) inherits the mapping.
//
// TYPE-AWARE (see ROW_DRIVEN_TYPES below): pinning a height is only safe for
// FIXED-ASPECT types (line/area/column/pie/scatter). For ROW-COUNT-DRIVEN HORIZONTAL
// types (horizontal bars/dot/arrow/range/tables) the height MUST follow the row
// count — pinning a short height makes Datawrapper CROP the overflowing rows (silent
// data loss), so those types keep the channel WIDTH but export at their natural height.

import type { ChartType } from "./chart-spec";
import { CHANNELS, normalizeChannel } from "../../atelier/src/channel";

export interface ExportSize {
  width: number;
  // Omitted for row-driven types → the PNG is exported width-only so Datawrapper
  // renders at the content-driven (natural) height and no rows are cropped.
  height?: number;
}

// The three canonical aspects + their pixel export box. Widths sit at the retina
// sizes the deliverables target (~1080 for social, 1200 for web); the height encodes
// the aspect. For a FIXED-ASPECT type DW scales the plot into this box (a taller box
// gives a squarer plot). NOTE: for a ROW-DRIVEN type DW does NOT scale the rows into
// the box — it CROPS the rows that overflow the pinned height (empirically verified:
// a 45-row d3-bars pinned to 675px rendered only ~26 rows, dropping 19 bars). Such
// types must never receive a pinned height — see channelToExportSize / ROW_DRIVEN_TYPES.
export const EXPORT_SIZES = {
  square: { width: 1080, height: 1080 }, // 1:1  — feed post
  portrait: { width: 1080, height: 1920 }, // 9:16 — Reels / TikTok / Stories
  landscape: { width: 1200, height: 675 }, // 16:9 — article / web embed (default)
} as const;

export type ExportAspect = keyof typeof EXPORT_SIZES;

// The web/article aspect is the default when NO channel is given — it is the most
// common embed target and matches the finding's "web/article → 16:9". An
// unrecognized non-empty channel no longer defaults here: normalizeChannel is
// fail-closed and throws (see channelToAspect below).
export const DEFAULT_EXPORT_ASPECT: ExportAspect = "landscape";

// Every CADRAGE channel answer we recognize → one canonical aspect. The keyword
// table (feed/square, social/vertical/story/reel/tiktok/shorts, web/article/embed/…)
// now lives ONCE in the shared cross-producer channel model
// (skills/atelier/src/channel.ts `normalizeChannel`) so dw-chart, suggest-chart, and
// produce-all's conformance check can't drift from each other. Resolve the
// free-text channel string to the canonical enum there, then read its aspect.
//
// Resolve the export aspect for a CADRAGE channel string. Absent → the web/article
// default (16:9, via normalizeChannel's absent-input default); an UNKNOWN non-empty
// channel THROWS (normalizeChannel is fail-closed — a typo must not silently ship
// the landscape box). Pure.
export function channelToAspect(channel?: string): ExportAspect {
  const aspect = CHANNELS[normalizeChannel(channel)].aspect;
  // CHANNELS' base `aspect` is always "portrait" | "square" | "landscape" for the
  // three channels this table covers — "responsive" is reserved for the interactive
  // sub-format (article-web only) and never appears here, so this narrows safely
  // onto ExportAspect (keyof EXPORT_SIZES, a static-PNG-only concern).
  return aspect as ExportAspect;
}

// ROW-COUNT-DRIVEN HORIZONTAL chart types. Each data ROW is laid out as its own
// horizontal track (categories on the y-axis, value on the x-axis), so the chart's
// NATURAL height grows linearly with the number of rows. Datawrapper's PNG export
// does NOT scale these rows to fit a pinned box — it CROPS the rows that overflow
// (silent data loss in an owned deliverable). So for these types the export pins the
// channel WIDTH only and lets the height be content-driven, guaranteeing every row
// renders on every channel (feed/web/vertical alike). Table-driven so a future
// horizontal type inherits the correct branch by being added here.
//
// FIXED-ASPECT types (column families, line/multiple-lines, area, pie/donut, scatter,
// small multiples) are deliberately ABSENT: DW scales their plot into the pinned box,
// so the channel→aspect mapping is safe for them.
export const ROW_DRIVEN_TYPES = new Set<ChartType>([
  "d3-bars",
  "d3-bars-grouped",
  "d3-bars-stacked",
  "d3-bars-split",
  "d3-bars-bullet",
  "d3-dot-plot",
  "d3-arrow-plot",
  "d3-range-plot",
  "tables",
]);

// True when the export height MUST follow the row count (never be pinned). Pure.
export function isRowDriven(type?: ChartType): boolean {
  return !!type && ROW_DRIVEN_TYPES.has(type);
}

// Resolve the export pixel box for a CADRAGE channel string and chart type. This is
// the single source of truth the producer threads into the Datawrapper PNG export.
// For a row-driven type the height is omitted (width follows the channel, height
// follows the content); for a fixed-aspect type the full channel box is returned. Pure.
export function channelToExportSize(
  channel?: string,
  type?: ChartType,
): ExportSize {
  const box = EXPORT_SIZES[channelToAspect(channel)];
  if (isRowDriven(type)) return { width: box.width };
  return box;
}
