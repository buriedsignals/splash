// Shared channel model — the cross-producer hub for the channel-driven format/export
// flow (Slice 1). Pure, no deps: dw-chart's export-aspect.ts, suggest-chart's routing
// + eval, and produce-all's conformance check all import from here so the channel →
// {aspect, size, allowed formats} mapping has exactly one source of truth. See
// docs/superpowers/specs/2026-07-08-channel-driven-format-export-design.md.

// The three canonical distribution channels a journalist picks in CADRAGE Q3.
export type Channel = "social-vertical" | "social-feed" | "article-web";

// The producer-spec.ts vocabulary (kept in sync by hand — see producer-spec.ts:4 —
// rather than imported, so this module stays dependency-free).
export type VisualFormat = "static" | "interactive" | "video" | "scrolly";

// The media aspect a channel targets. "responsive" is used for the interactive
// sub-format, which fills its host rather than a fixed pixel box.
export type ChannelAspect = "portrait" | "square" | "landscape" | "responsive";

export interface ChannelSize {
  width: number;
  height: number;
}

export interface ChannelEntry {
  aspect: ChannelAspect; // media aspect for image/video
  mediaSize: ChannelSize; // portrait 1080x1920 · square 1080x1080 · landscape 1200x675
  allowedFormats: VisualFormat[];
  interactiveDefault: boolean; // true ONLY for article-web
  interactiveAspect: ChannelAspect; // "responsive"
}

export const CHANNELS: Record<Channel, ChannelEntry> = {
  "social-vertical": {
    aspect: "portrait",
    mediaSize: { width: 1080, height: 1920 },
    allowedFormats: ["static", "video"],
    interactiveDefault: false,
    interactiveAspect: "responsive",
  },
  "social-feed": {
    aspect: "square",
    mediaSize: { width: 1080, height: 1080 },
    allowedFormats: ["static", "video"],
    interactiveDefault: false,
    interactiveAspect: "responsive",
  },
  "article-web": {
    aspect: "landscape",
    mediaSize: { width: 1200, height: 675 },
    allowedFormats: ["static", "interactive", "video", "scrolly"],
    interactiveDefault: true,
    interactiveAspect: "responsive",
  },
};

// Stable order: vertical → feed → web (matches CADRAGE Q3's presentation order).
export const ALL_CHANNELS: Channel[] = [
  "social-vertical",
  "social-feed",
  "article-web",
];

export function allowedFormats(channel: Channel): VisualFormat[] {
  return CHANNELS[channel].allowedFormats;
}

export function isFormatAllowed(
  channel: Channel,
  format: VisualFormat,
): boolean {
  return CHANNELS[channel].allowedFormats.includes(format);
}

export function mediaSize(channel: Channel): ChannelSize {
  return CHANNELS[channel].mediaSize;
}

// Legacy free-text keywords a journalist (or an older caller) might use, mirroring
// the keyword sets that used to live only in dw-chart/src/export-aspect.ts
// CHANNEL_ASPECT. Kept generous so any of these words routes without a lookup on the
// caller's side. Matched case/space-insensitively, either as the whole trimmed input
// or as a standalone word within it (so "article embed" → article-web).
const CHANNEL_KEYWORDS: Record<string, Channel> = {
  // square / feed
  feed: "social-feed",
  square: "social-feed",
  // portrait / social-vertical
  social: "social-vertical",
  "social-vertical": "social-vertical",
  vertical: "social-vertical",
  story: "social-vertical",
  stories: "social-vertical",
  portrait: "social-vertical",
  reel: "social-vertical",
  reels: "social-vertical",
  tiktok: "social-vertical",
  shorts: "social-vertical",
  // landscape / web
  web: "article-web",
  article: "article-web",
  embed: "article-web",
  landscape: "article-web",
  print: "article-web",
  youtube: "article-web",
};

const DEFAULT_CHANNEL: Channel = "article-web";

// Maps free-text channel input (the journalist's own words) to the canonical enum.
// Trim + lowercase; unknown / undefined / empty → the article-web default (the most
// common embed target). Pure.
export function normalizeChannel(freeText?: string): Channel {
  const key = (freeText ?? "").trim().toLowerCase();
  if (!key) return DEFAULT_CHANNEL;
  if (key in CHANNEL_KEYWORDS) return CHANNEL_KEYWORDS[key];
  for (const word of key.split(/\s+/)) {
    if (word in CHANNEL_KEYWORDS) return CHANNEL_KEYWORDS[word];
  }
  return DEFAULT_CHANNEL;
}
