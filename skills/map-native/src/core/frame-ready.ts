// Bounded per-frame map readiness — the structural guarantee that a Remotion video
// frame can NEVER hang waiting on the map.
//
// Every *Story / *Reveal / *Scrolly composition renders one video frame by:
//   const h = delayRender(...); map.jumpTo(...); map.once("idle", () => continueRender(h));
// MapLibre's `idle` fires only once EVERY requested tile has loaded. During a
// camera flight over a wide/antimeridian-crossing extent a frame can request a large,
// irrelevant tile set, and under any network contention a single stalled tile request
// leaves `idle` un-fired forever — so the frame's delayRender handle is never
// continued and the whole render hangs indefinitely (the seismes symbol-video hang).
//
// `continueWhenMapSettles` makes that impossible: it continues on `idle` OR after a
// bounded settle timeout, whichever comes first, and exactly once. A stalled tile then
// degrades a frame into a slightly-less-tiled frame — never a hang. The fix to the
// antimeridian camera (core/longitude.ts) removes the heavy tile load; this removes the
// unbounded WAIT itself, so the invariant holds for any future map type or extent.

/** Upper bound (ms) on how long ONE video frame waits for MapLibre to reach `idle`
 * (all tiles loaded) before continuing the render with whatever has painted.
 *
 * Sized between two hard limits: comfortably ABOVE a legitimate settle (a healthy
 * frame idles in well under 1s; a slow-but-working tile fetch under contention takes a
 * few seconds), and comfortably BELOW Remotion's per-frame `delayRender` timeout
 * (120_000 ms, set in produce.mjs) so a genuinely stalled frame caps at ~6s of missing
 * tiles instead of failing the render — and far below the 15-min process watchdog so a
 * render always makes forward progress rather than stalling on one frame. */
export const FRAME_MAP_SETTLE_MS = 6000;

/** Minimal structural view of the map — just the `idle` event — so this is unit-testable
 * with a fake that never fires `idle` (proving the timeout path always continues). */
export interface IdleEmitter {
  once(type: "idle", listener: () => void): unknown;
}

/** Continue a video frame when the map settles (`idle`) OR after `settleMs`, whichever
 * comes first, invoking `onSettle` EXACTLY once. `onSettle` is typically
 * `() => continueRender(handle)`. Returns nothing; safe to fire-and-forget per frame. */
export function continueWhenMapSettles(
  map: IdleEmitter,
  onSettle: () => void,
  settleMs: number = FRAME_MAP_SETTLE_MS,
): void {
  let settled = false;
  const finish = () => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    onSettle();
  };
  const timer = setTimeout(finish, settleMs);
  // A late `idle` after the timeout re-enters `finish`, which the `settled` guard
  // no-ops — so continueRender is never called twice for the same handle.
  map.once("idle", finish);
}
