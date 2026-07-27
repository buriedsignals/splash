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
import { CHANNELS, normalizeChannel } from "../../splash/src/channel";

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
// (skills/splash/src/channel.ts `normalizeChannel`) so dw-chart, suggest-chart, and
// produce-all's conformance check can't drift from each other. Resolve the
// free-text channel string to the canonical enum there, then read its aspect.
//
// Resolve the export aspect for a CADRAGE channel string. Absent → the web/article
// default (16:9, via normalizeChannel's absent-input default); an UNKNOWN non-empty
// channel THROWS (normalizeChannel is fail-closed — a typo must not silently ship
// the landscape box). Pure.
export function channelToAspect(channel?: string): ExportAspect {
  const resolved = normalizeChannel(channel);
  const aspect = CHANNELS[resolved].aspect;
  // Datawrapper exports through THIS table and no other. Its three boxes are screen boxes;
  // the print channel's "page" aspect (issue #1) is a 300 dpi box it has no export for, and
  // an unchecked cast used to make that a TypeError on `box.width` two calls later. Refusing
  // by name is the same sentence lib/brain/eligibility.ts gives when it keeps Datawrapper out
  // of a print offer in the first place, so a journalist never meets this twice.
  if (!(aspect in EXPORT_SIZES))
    throw new Error(
      `Datawrapper cannot export the "${aspect}" aspect of channel "${resolved}" — ` +
        `its export boxes are ${Object.keys(EXPORT_SIZES).join(", ")}, all screen-density`,
    );
  // "responsive" is reserved for the interactive sub-format (article-web only) and never
  // appears here, so the guard above narrows safely onto ExportAspect.
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

// A row-driven chart with FEW rows inherits Datawrapper's default export height (~800px
// delivered at the web width) even though its content — title + a couple of bars + source —
// fills far less, leaving a large empty band below (observed: a 2-bar chart shipped 1200×800
// with the bottom ~440px blank). This resolves a CONTENT-FITTING delivered height from the row
// count so the export box tracks the bars instead of DW's tall default.
//
// SAFETY — it must NEVER crop a row (the whole reason row-driven types are width-only): the
// constants ERR TALL (a generous per-row band + a furniture allowance sized for a multi-line
// title/intro/axis/source), and it only engages when the computed height is SHORTER than DW's
// default — for many rows it returns undefined so the caller keeps the safe width-only path and
// DW grows the height naturally. Worst case is a little residual whitespace, never lost data.
const ROW_DRIVEN_FURNITURE_PX = 420; // delivered px reserved for title+intro+axis+source (generous)
const ROW_DRIVEN_PER_ROW_PX = 60; // delivered px per bar (generous — DW bars are ~40px, +gap)
const ROW_DRIVEN_DEFAULT_PX = 800; // DW's default row-driven export height at the web width

// The DELIVERED export height for a FEW-ROW row-driven chart, or undefined when the chart has
// enough rows that DW's natural (width-only) height is the safer choice. Pure.
export function rowDrivenDeliveredHeight(rows: number): number | undefined {
  if (!Number.isFinite(rows) || rows < 1) return undefined;
  const fitted = ROW_DRIVEN_FURNITURE_PX + rows * ROW_DRIVEN_PER_ROW_PX;
  // Only shrink — never pin a height ≥ the default (that path is DW's natural width-only, which
  // for many rows grows past the default without cropping).
  return fitted < ROW_DRIVEN_DEFAULT_PX ? fitted : undefined;
}

// True when the export height MUST follow the row count (never be pinned). Pure.
export function isRowDriven(type?: ChartType): boolean {
  return !!type && ROW_DRIVEN_TYPES.has(type);
}

// Resolve the DELIVERED export pixel box for a CADRAGE channel string and chart type
// — the physical size the reader receives (== the channel's mediaSize). For a
// row-driven type the height is omitted (width follows the channel, height follows
// the content); for a fixed-aspect type the full channel box is returned. Pure.
// NOTE: this is NOT the box to REQUEST from the DW export API — DW rasterizes at 2x,
// so the request must be halved (channelToExportRequestSize below).
export function channelToExportSize(
  channel?: string,
  type?: ChartType,
): ExportSize {
  const box = EXPORT_SIZES[channelToAspect(channel)];
  if (isRowDriven(type)) return { width: box.width };
  return box;
}

// Datawrapper's PNG export rasterizes at 2x (its default zoom, "retina") — the
// returned PNG is exactly TWICE the requested pixel box (probed live 2026-07-11 on
// this same export endpoint by map-dw: width=1200&height=675 → a 2400x1350 PNG).
// This is DW's export default, not a knob we tuned; it is named so the halving below
// reads as what it is. Kept in sync by hand with the map-dw sibling
// (skills/map-dw/src/produce.ts DW_EXPORT_PIXEL_RATIO) — map-dw already imports
// dw-chart's API client, so importing back from map-dw would create a package cycle.
export const DW_EXPORT_PIXEL_RATIO = 2;

// The pixel box dw-chart REQUESTS from the DW export API, derived from the delivered
// channel box (channelToExportSize above): request HALF the channel's mediaSize so
// DW's 2x rasterization doubles it back onto the channel size — the same halving
// map-dw applies (skills/map-dw/src/produce.ts mapExportSize) and chart-native's
// static path applies (deviceScaleFactor:2, CSS canvas = round(mediaSize/2)).
// article-web's odd height (675) rounds to 338 → a 676px PNG, 1px off, inside
// assertRenderedSize's ±2px tolerance. Row-driven types keep the height OMITTED
// (content-driven — pinning it makes DW CROP rows, see ROW_DRIVEN_TYPES): only their
// width is halved, so the delivered width still lands on the channel width while the
// height follows the row count. Pure; exported for unit tests.
export function channelToExportRequestSize(
  channel?: string,
  type?: ChartType,
): ExportSize {
  const box = channelToExportSize(channel, type);
  return {
    width: Math.round(box.width / DW_EXPORT_PIXEL_RATIO),
    ...(box.height !== undefined
      ? { height: Math.round(box.height / DW_EXPORT_PIXEL_RATIO) }
      : {}),
  };
}
