// WHERE a review still is taken — the whole subject of issue #10.
//
// The failure this file exists to end was measured, not imagined: a real loop-produced
// interactive, reviewed at 900x560 (the width hard-coded in the engines' own snap scripts)
// while the accepted destination was article web. The component root ends at y=581 and the
// document is 605 tall, so the "Source: …" footer sits BELOW the fold and never appears in
// the still — yet the review proceeded. A clean screenshot at an arbitrary size proves
// nothing about the destination.
import { CHANNEL_POLICY } from "../core/channel-policy";
import type { Channel, VisualFormat } from "../core/vocabulary";
import type { CaptureTarget, DestinationProfile, Viewport } from "./types";

// The two extremes the engines already exercise (skills/chart-native/scripts/
// snap-responsive.mjs) — inherited rather than re-invented, so a breakpoint that has been
// calibrated against real renders for months keeps its meaning here.
export const NARROW_WIDTH = 360;
export const WIDE_WIDTH = 1600;
export const DEFAULT_DEVICE_SCALE_FACTOR = 2;

// A responsive format fills its host; an aspect-pinned one does not. Deriving this from
// CHANNEL_POLICY's own interactiveAspect would be indirect: the policy answers "what aspect
// does this channel give an interactive", while the question here is "does this FORMAT have
// breakpoints at all", which is a property of the format.
const RESPONSIVE_FORMATS: readonly VisualFormat[] = ["interactive", "scrolly"];

function assertViewport(v: Viewport, label: string): void {
  if (!Number.isFinite(v.width) || v.width <= 0)
    throw new Error(
      `${label}: width must be a positive number, got ${v.width}`,
    );
  if (!Number.isFinite(v.height) || v.height <= 0)
    throw new Error(
      `${label}: height must be a positive number, got ${v.height}`,
    );
}

/** What the still claims to represent — a profile id, or the channel it fell back to. */
export function destinationIdFor(
  channel: Channel,
  destination?: DestinationProfile,
): string {
  return destination?.id ?? `channel:${channel}`;
}

/**
 * The viewports a deliverable must be reviewed at.
 *
 * Order of authority: the newsroom's own delivery profile first (its real embed box), the
 * channel's media size second. The fallback is a DOCUMENTED default, not a magic number:
 * CHANNEL_POLICY is already this project's single answer to "what size does this channel
 * publish at" (lib/core/channel-policy.ts), and produce renders against the same table.
 */
export function resolveTargets(
  channel: Channel,
  format: VisualFormat,
  destination?: DestinationProfile,
): CaptureTarget[] {
  const dpr = destination?.deviceScaleFactor ?? DEFAULT_DEVICE_SCALE_FACTOR;
  if (!Number.isFinite(dpr) || dpr <= 0)
    throw new Error(
      `destination "${destination?.id}": deviceScaleFactor must be a positive number, got ${dpr}`,
    );

  const channelSize = CHANNEL_POLICY[channel].mediaSize;
  const primary: Viewport = destination?.primary ?? {
    width: channelSize.width,
    height: channelSize.height,
  };
  assertViewport(
    primary,
    `destination "${destinationIdFor(channel, destination)}" primary`,
  );

  if (!RESPONSIVE_FORMATS.includes(format))
    return [
      { breakpoint: "primary", cssViewport: primary, deviceScaleFactor: dpr },
    ];

  // A responsive deliverable is only proven at the container it ships in PLUS the documented
  // edges of the contract — #10: "For responsive interactives, test the configured article
  // container plus documented narrow and wide breakpoints." The height of an edge breakpoint
  // follows the primary's, because what varies across the contract is the WIDTH; the height
  // is the reading window, and changing both at once would make an overflow unattributable.
  const narrow: Viewport = destination?.narrow ?? {
    width: NARROW_WIDTH,
    height: primary.height,
  };
  const wide: Viewport = destination?.wide ?? {
    width: WIDE_WIDTH,
    height: primary.height,
  };
  assertViewport(
    narrow,
    `destination "${destinationIdFor(channel, destination)}" narrow`,
  );
  assertViewport(
    wide,
    `destination "${destinationIdFor(channel, destination)}" wide`,
  );

  return [
    { breakpoint: "narrow", cssViewport: narrow, deviceScaleFactor: dpr },
    { breakpoint: "primary", cssViewport: primary, deviceScaleFactor: dpr },
    { breakpoint: "wide", cssViewport: wide, deviceScaleFactor: dpr },
  ];
}
