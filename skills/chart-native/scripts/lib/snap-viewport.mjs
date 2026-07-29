// The window a contrast snap must open: the CSS box the deliverable is actually rendered in.
// Both snaps used a constant 900x560 while produce.mjs threaded SPLASH_CHANNEL to them (:181)
// and neither read it — so a social-vertical static (540x960 CSS) had everything below ~536px
// measured against a phantom ground. Absent channel ⇒ the historical box, byte-identical.
import { CHANNEL_POLICY } from "../../../../lib/core/channel-policy.ts";

/** Mirrors vite.config.ts:52 — the static path lays out at mediaSize/2 and screenshots at
 *  deviceScaleFactor 2. */
export const STATIC_DEVICE_SCALE = 2;

export function snapViewportFor(channel) {
  const entry = channel ? CHANNEL_POLICY[channel] : undefined;
  if (!entry) return { width: 900, height: 560 };
  return {
    width: Math.round(entry.mediaSize.width / STATIC_DEVICE_SCALE),
    height: Math.round(entry.mediaSize.height / STATIC_DEVICE_SCALE),
  };
}
