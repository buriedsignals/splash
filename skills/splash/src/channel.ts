// Shared channel model — the cross-producer hub for the channel-driven format/export
// flow (Slice 1). Pure, no deps: dw-chart's export-aspect.ts, suggest-chart's routing
// + eval, and produce-all's conformance check all import from here so the channel →
// {aspect, size, allowed formats} mapping has exactly one source of truth. See
// docs/superpowers/specs/2026-07-08-channel-driven-format-export-design.md.

import type { Channel, VisualFormat } from "../../../lib/core/vocabulary";
export type { Channel, VisualFormat };

import {
  CHANNEL_POLICY,
  ALL_CHANNELS,
  type ChannelAspect,
  type ChannelSize,
  type ChannelEntry,
} from "../../../lib/core/channel-policy";

export {
  ALL_CHANNELS,
  allowedFormats,
  isFormatAllowed,
  assertFormatAllowed,
} from "../../../lib/core/channel-policy";
export type {
  ChannelAspect,
  ChannelSize,
  ChannelEntry,
} from "../../../lib/core/channel-policy";

// Historical name kept for this file's ~46 importers: the table is CHANNEL_POLICY upstream.
export const CHANNELS: Record<Channel, ChannelEntry> = CHANNEL_POLICY;

export function mediaSize(channel: Channel): ChannelSize {
  return CHANNELS[channel].mediaSize;
}

// Slice 2 (producer rendering) accessors — same data as mediaSize/CHANNELS[*].aspect,
// named for the producer-rendering call sites (chart-native/map-native produce.mjs)
// so those scripts read "the render size/aspect for this channel" rather than reaching
// into the decision-layer CHANNELS table directly.
export function channelAspect(channel: Channel): ChannelAspect {
  return CHANNELS[channel].aspect;
}

export function renderSize(channel: Channel): ChannelSize {
  return CHANNELS[channel].mediaSize;
}

// A produced deliverable's pixel size must equal its channel's mediaSize — producers
// render ONE aspect (not three) and must render it at the right size. Throws (rather
// than returning a violation string) so it fails hard at produce time, mirroring the
// other produce-time guards (conformance, snap-contrast): a caller that wants a softer
// signal can try/catch. Used by both native producers (chart-native, map-native).
//
// `tolerancePx` (default 2) absorbs the sub-pixel rounding chart-native's static path
// hits for article-web: its snap screenshots at deviceScaleFactor:2, so the CSS canvas
// size is `Math.round(mediaSize / 2)` and the exported PNG is that value doubled back.
// article-web's height (675) is odd, so the nearest reachable even pixel size is 676 —
// 1px off — while social-vertical/social-feed (even dimensions throughout) land exact.
// A real mismatch (e.g. a 4:5 1080x1350 render for a 9:16 1080x1920 channel) is still
// far outside this tolerance and throws.
export function assertRenderedSize(
  actualW: number,
  actualH: number,
  channel: Channel,
  tolerancePx = 2,
): void {
  const { width, height } = renderSize(channel);
  if (
    Math.abs(actualW - width) > tolerancePx ||
    Math.abs(actualH - height) > tolerancePx
  ) {
    throw new Error(
      `rendered size ${actualW}x${actualH} does not match channel '${channel}' (${width}x${height})`,
    );
  }
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
// Trim + lowercase. ABSENT input (undefined / empty / whitespace-only) → the
// article-web default (the most common embed target, back-compat for legacy callers
// with no channel at all). A NON-EMPTY input that matches no canonical value and no
// alias rule THROWS (fail-closed): article-web is the MOST PERMISSIVE channel
// (interactive + scrolly allowed), so silently defaulting a typo'd / hallucinated
// channel would WIDEN the allowed format set — the one direction a guard must never
// fail. Pure (audit 2026-07-11 P2).
export function normalizeChannel(freeText?: string): Channel {
  const key = (freeText ?? "").trim().toLowerCase();
  if (!key) return DEFAULT_CHANNEL;
  // A canonical channel value maps to itself. The suggester emits these verbatim
  // (splash/SKILL.md §5b requires `channel: social-vertical|social-feed|article-web`),
  // and they are NOT all present in the alias table below — without this a canonical
  // "social-feed" would fall through and mis-handle a feed post.
  if ((ALL_CHANNELS as readonly string[]).includes(key)) return key as Channel;
  if (key in CHANNEL_KEYWORDS) return CHANNEL_KEYWORDS[key];
  for (const word of key.split(/\s+/)) {
    if (word in CHANNEL_KEYWORDS) return CHANNEL_KEYWORDS[word];
  }
  throw new Error(
    `unknown channel "${freeText}" — expected one of ${ALL_CHANNELS.join(", ")} ` +
      `(or a known alias like "stories", "feed", "web"); ` +
      `an absent/empty channel defaults to ${DEFAULT_CHANNEL}`,
  );
}
