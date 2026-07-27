// The channel POLICY: what each distribution channel allows and at what size. The
// vocabulary (the channel KEYS) lives in vocabulary.ts; this is the policy hung off them.
// It sits in lib/core rather than skills/splash because the proposal brain needs the SCOPE
// axis and lib/ must not reach into skills/ (spec §4.1). skills/splash/src/channel.ts
// re-exports every symbol below under its historical names, so its importers are untouched.
import {
  DESTINATIONS,
  type Channel,
  type Destination,
  type MediaAspect,
  type VisualFormat,
} from "./vocabulary";

// The media aspect a channel targets. "responsive" is used for the interactive
// sub-format, which fills its host rather than a fixed pixel box.
export type ChannelAspect = MediaAspect | "responsive";

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
  // Print (issue #1). A5 landscape — 210 x 148 mm — at 300 dpi.
  //
  // "Print-safe" is a density, not a word. The static path renders a CSS box of mediaSize/2 and
  // screenshots it at deviceScaleFactor 2 (skills/chart-native/vite.config.ts:44-52), so this
  // entry means a 1240x874 CSS layout — an ordinary one — exported at 2480x1748, i.e. 300 dpi
  // real. A5 landscape rather than a full A4 portrait page because a newsroom graphic is a wide
  // insert, and 1.42:1 is close to a chart's natural shape. The finer print choices (A4/A3,
  // orientation, column gutter, bleed, CMYK, vector PDF) are the deferred next slice — see the
  // spec's §5; they add CHANNEL_POLICY entries, they do not change this model.
  //
  // `allowedFormats: ["static"]` is the mechanical form of issue #1's "if print is selected,
  // require a static, print-safe output": there is no prose rule to obey, an interactive on
  // paper simply is not in the set.
  "print-page": {
    aspect: "page",
    mediaSize: { width: 2480, height: 1748 },
    allowedFormats: ["static"],
    interactiveDefault: false,
    interactiveAspect: "responsive",
  },
};

// Stable order: vertical → feed → web → print (CADRAGE's presentation order, print last as the
// newest branch).
export const ALL_CHANNELS: Channel[] = [
  "social-vertical",
  "social-feed",
  "article-web",
  "print-page",
];

// ---------------------------------------------------------------------------------------
// The de-welding (issue #1). A channel is a (destination, aspect) pair; these four functions
// are the only sanctioned way to cross between the two representations, so the pairing can
// never be spelled out a second time and drift.
// ---------------------------------------------------------------------------------------

export interface DestinationEntry {
  /** Every channel this destination can resolve to, in presentation order. */
  channels: Channel[];
  /** The one shape this destination has, when it has only one. Absent ⇒ it must be ASKED.
   *  Social is deliberately without a default: Stories 9:16 and a feed 1:1 are different
   *  visuals, and picking one silently is the decision issue #1 exists to stop. */
  defaultAspect?: MediaAspect;
}

export const DESTINATION_POLICY: Record<Destination, DestinationEntry> = {
  "article-web": { channels: ["article-web"], defaultAspect: "landscape" },
  social: { channels: ["social-vertical", "social-feed"] },
  print: { channels: ["print-page"], defaultAspect: "page" },
};

/** The render channel a (destination, aspect) pair resolves to.
 *
 *  THROWS on a pair no channel carries, rather than falling back: article-web is the most
 *  permissive channel in the table (interactive + scrolly), so a silent default would WIDEN the
 *  allowed format set — the one direction a guard must never fail. Same discipline as
 *  normalizeChannel (skills/splash/src/channel.ts). */
export function channelFor(
  destination: Destination,
  aspect: MediaAspect,
): Channel {
  const channel = DESTINATION_POLICY[destination].channels.find(
    (c) => CHANNEL_POLICY[c].aspect === aspect,
  );
  if (!channel)
    throw new Error(
      `no channel carries a "${aspect}" aspect for the "${destination}" destination ` +
        `(it carries ${aspectsFor(destination).join(", ")})`,
    );
  return channel;
}

export function destinationOf(channel: Channel): Destination {
  const found = DESTINATIONS.find((d) =>
    DESTINATION_POLICY[d].channels.includes(channel),
  );
  // Total by construction — DESTINATION_POLICY partitions ALL_CHANNELS, and the round-trip test
  // in channel-policy.test.ts holds it that way. The throw is what a future channel added to the
  // vocabulary but forgotten here meets: loud, not a wrong destination.
  if (!found)
    throw new Error(`channel "${channel}" belongs to no declared destination`);
  return found;
}

/** The MEDIA aspect of a channel. Never "responsive": that is what an interactive does inside
 *  its host, not the shape the channel publishes at (CHANNEL_POLICY.aspect is already the media
 *  one — interactiveAspect is the separate field). */
export function aspectOf(channel: Channel): MediaAspect {
  return CHANNEL_POLICY[channel].aspect as MediaAspect;
}

export function aspectsFor(destination: Destination): MediaAspect[] {
  return DESTINATION_POLICY[destination].channels.map(aspectOf);
}

export function defaultAspectFor(
  destination: Destination,
): MediaAspect | undefined {
  return DESTINATION_POLICY[destination].defaultAspect;
}

/** Whether the aspect is a question for the journalist. The whole of issue #1's stage 3: ask
 *  only on the branches that need it — and, because nextActionsForElement places the question
 *  after choose-form, only once the editorial format is settled. */
export function needsAspectChoice(destination: Destination): boolean {
  return DESTINATION_POLICY[destination].defaultAspect == null;
}

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
