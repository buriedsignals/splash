// The channel POLICY: what each distribution channel allows and at what size. The
// vocabulary (the channel KEYS) lives in vocabulary.ts; this is the policy hung off them.
// It sits in lib/core rather than skills/splash because the proposal brain needs the SCOPE
// axis and lib/ must not reach into skills/ (spec §4.1). skills/splash/src/channel.ts
// re-exports every symbol below under its historical names, so its importers are untouched.
import type { Channel, VisualFormat } from "./vocabulary";

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

export const CHANNEL_POLICY: Record<Channel, ChannelEntry> = {
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
  return CHANNEL_POLICY[channel].allowedFormats;
}

export function isFormatAllowed(
  channel: Channel,
  format: VisualFormat,
): boolean {
  return CHANNEL_POLICY[channel].allowedFormats.includes(format);
}

// The PROPOSITION gate (splash/SKILL.md §Gate 2) pins exactly ONE VisualFormat on the
// accepted spec — not the whole allowed set. This guard is the produce-time check that
// the pinned format is actually a member of its channel's allowed set, throwing (rather
// than returning a boolean) so a bad pin fails hard at produce, mirroring
// assertRenderedSize in skills/splash/src/channel.ts.
export function assertFormatAllowed(
  channel: Channel,
  format: VisualFormat,
): void {
  if (!isFormatAllowed(channel, format))
    throw new Error(
      `format "${format}" not allowed for channel "${channel}" (allowed: ${allowedFormats(channel).join(", ")})`,
    );
}
