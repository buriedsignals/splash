// EXPORT ASPECT, keyed to the CADRAGE delivery channel (Gate 1, Q3: "where does
// this publish — article embed, social, print?"). Datawrapper's PNG export, given
// only a width, renders at the chart's OWN natural aspect — which shipped a 4.3:1
// landscape strip (2400×554) for a chart the journalist had asked for as a square
// feed post. Pin the export box per channel so a feed ships square, a social/story
// ships portrait, and an article/web embed ships landscape. Table-driven, so every
// future chart (and every producer that adopts this table) inherits the mapping.

export interface ExportSize {
  width: number;
  height: number;
}

// The three canonical aspects + their pixel export box. Widths sit at the retina
// sizes the deliverables target (~1080 for social, 1200 for web); the height encodes
// the aspect. DW fits the visualization to this box (it does NOT crop) — a taller box
// gives a bar/column chart a taller plot, a square box a squarer plot.
export const EXPORT_SIZES = {
  square: { width: 1080, height: 1080 }, // 1:1  — feed post
  portrait: { width: 1080, height: 1920 }, // 9:16 — Reels / TikTok / Stories
  landscape: { width: 1200, height: 675 }, // 16:9 — article / web embed (default)
} as const;

export type ExportAspect = keyof typeof EXPORT_SIZES;

// The web/article aspect is the default when no channel (or an unrecognized one) is
// given — it is the most common embed target and matches the finding's "web/article
// → 16:9".
export const DEFAULT_EXPORT_ASPECT: ExportAspect = "landscape";

// Every CADRAGE channel answer we recognize → one canonical aspect. Kept generous so
// the suggester can pass the journalist's own word ("feed", "story", "reel", …)
// without a lookup on its side. Matched case/space-insensitively.
export const CHANNEL_ASPECT: Record<string, ExportAspect> = {
  // square / feed
  feed: "square",
  square: "square",
  // portrait / social-vertical
  social: "portrait",
  "social-vertical": "portrait",
  vertical: "portrait",
  story: "portrait",
  stories: "portrait",
  portrait: "portrait",
  reel: "portrait",
  reels: "portrait",
  tiktok: "portrait",
  shorts: "portrait",
  // landscape / web
  web: "landscape",
  article: "landscape",
  embed: "landscape",
  landscape: "landscape",
  print: "landscape",
  youtube: "landscape",
};

// Resolve the export aspect for a CADRAGE channel string. Unknown / absent → the
// web/article default (16:9). Pure.
export function channelToAspect(channel?: string): ExportAspect {
  const key = channel?.trim().toLowerCase();
  return (key && CHANNEL_ASPECT[key]) || DEFAULT_EXPORT_ASPECT;
}

// Resolve the export pixel box for a CADRAGE channel string. This is the single
// source of truth the producer threads into the Datawrapper PNG export. Pure.
export function channelToExportSize(channel?: string): ExportSize {
  return EXPORT_SIZES[channelToAspect(channel)];
}
