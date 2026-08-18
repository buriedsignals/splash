// twin/skills/scrolly/assets/embed-exit.mjs
//
// The exit emitter: the ONLY message a Splash page ever sends its parent. A cross-origin iframe
// cannot scroll the page that contains it, and Chrome does not chain scroll out of one — measured:
// at the end of a scrolly's inner `.scrolly-steps` scrollport the reader is stuck, and removing
// `overscroll-behavior: contain` does NOT free them. So the page ASKS instead: `{ splash: 1, v: 1,
// type: "release", direction: "up" | "down" }`, posted to `window.parent`, which
// `skills/deliver/assets/splash-iframe-scroller.js` listens for and acts on.
//
// Inlined verbatim into the self-contained scrolly HTML by `scripts/render-scrolly.mjs`, the same
// way that file already inlines `interaction.mjs` — see that file's own doc-comment for why the
// inlining strips `export` and wraps the result in an IIFE (two inlined scripts sharing one global
// scope, and a name collision between them has already shipped and been measured once).
//
// `decideRelease` is exported and pure — no DOM — so it is unit-tested directly
// (`test/embed-exit.test.ts`). `initEmbedExit` is DOM wiring and is NOT unit-tested here — same
// rule `interaction.mjs` states for `initScrolly`: an interactive format is verified by driving a
// real browser, not by asserting against a DOM emulation nobody looked at.
//
// THE TECHNIQUE THAT MAKES "OVERSCROLL, NEVER MERE ARRIVAL" TRUE BY CONSTRUCTION RATHER THAN BY
// TIMING. The naive rule — "release when the scrollport is at an edge and the gesture points past
// it" — fires on the very tick that FIRST reaches the edge, because that tick is already, by
// definition, at the edge by the time it is observed. That would carry a reader out of every
// scrolly the instant they finish reading it, before they have any chance to keep reading past the
// last step's own last line. The fix is not a delay: it is asking a different question. Record
// which edge the scrollport was at when THIS GESTURE STARTED — wheel needs no separate
// gesture-start event, because every wheel tick is its own gesture, so the edge read just before
// applying it IS the start; a touch drag needs `touchstart`, because a whole drag is one gesture —
// and release only when a gesture that BEGAN at an edge continues pushing past it. The tick that
// first reaches an edge began somewhere before it, so it fails this test and nothing releases;
// the NEXT gesture begins already sitting there, and any push further in that direction releases
// immediately.

/**
 * Pure decision: should THIS gesture release the reader out of the scrollport, and in which
 * direction.
 *
 * `startEdge` — which edge, `"top"` or `"bottom"`, the scrollport sat at when THIS gesture began,
 * or `null` when it began mid-track (neither edge). For a wheel tick, the caller passes the edge
 * read immediately BEFORE this tick is applied, because a wheel tick has no separate "start" of
 * its own — it IS its own gesture. For a touch drag, the caller records this once, at
 * `touchstart`, and reuses it for every `touchmove` of that same drag.
 *
 * `direction` — which way THIS gesture is currently pushing: `"up"` (scrolling toward the top /
 * scrollTop decreasing) or `"down"` (scrolling toward the bottom / scrollTop increasing).
 *
 * Returns the direction to release in, or `null` to do nothing. Releases only when the gesture
 * BEGAN at an edge and is STILL pushing further in that same direction:
 * `startEdge === "top" && direction === "up"`, or `startEdge === "bottom" && direction === "down"`.
 *
 * MERE ARRIVAL NEVER RELEASES. The tick that first reaches an edge began somewhere before it, so
 * for THAT tick `startEdge` is `null` or the opposite edge — it fails the test above by
 * construction. The caller never has to remember "did we just arrive" as separate state; the
 * gesture-start bookkeeping the caller already needs to do is the only state this needs.
 *
 * TRADE-OFF, stated rather than hidden: a gesture that starts mid-track and reaches an edge within
 * that same unbroken gesture does NOT release, even on the very tick that overshoots — because
 * `startEdge` is recorded once, at the gesture's start, and never updated mid-gesture. Only the
 * NEXT gesture, which now begins already sitting at that edge, can release. This trades "release
 * one gesture later than physically possible" for "never mistake an ordinary scroll through the
 * track for an escape attempt" — the whole point of anchoring the decision on where the gesture
 * STARTED rather than on where the pointer happens to be right now.
 */
export function decideRelease(startEdge, direction) {
  if (startEdge === "top" && direction === "up") return "up";
  if (startEdge === "bottom" && direction === "down") return "down";
  return null;
}

/** Tolerance, in pixels, for calling a scrollport's own float-rounded `scrollTop` "at an edge". */
const EDGE_PX = 2;

/** Which edge (`"top"` | `"bottom"` | `null`) a scrollport currently sits at. Pure given the three
 *  numbers a scrollport exposes — kept separate from `decideRelease` so the DOM-touching part of
 *  reading a rect stays a one-line call site in `initEmbedExit`, not folded into the decision
 *  itself. */
function edgeAt(el) {
  if (el.scrollTop <= EDGE_PX) return "top";
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - EDGE_PX) return "bottom";
  return null;
}

/**
 * Wires `.scrolly-steps` — the same scrollport `interaction.mjs`'s own `initScrolly` measures — to
 * post a `release` message at `window.parent` when a gesture that began at one of its own edges
 * keeps pushing past it. INERT when the page is not framed (`window.parent === window`): there is
 * no one to ask, and nothing here reaches for `window.top` or any other escape hatch instead — a
 * page opened directly, not embedded, is simply not this script's problem. NEVER changes layout:
 * this file only listens and posts; it does not touch a style, a class or the DOM.
 */
export function initEmbedExit() {
  if (window.parent === window) return;
  const scroller = document.querySelector(".scrolly-steps");
  if (!scroller) return;

  // Wheel has no gesture-start event of its own — every tick IS its own gesture — so the edge is
  // simply kept current: read once up front, then refreshed after every `scroll` the scrollport
  // actually completes.
  let wheelEdge = edgeAt(scroller);
  scroller.addEventListener(
    "scroll",
    function () {
      wheelEdge = edgeAt(scroller);
    },
    { passive: true },
  );

  function post(direction) {
    window.parent.postMessage({ splash: 1, v: 1, type: "release", direction: direction }, "*");
  }

  scroller.addEventListener(
    "wheel",
    function (event) {
      const direction = event.deltaY < 0 ? "up" : event.deltaY > 0 ? "down" : null;
      if (!direction) return;
      const released = decideRelease(wheelEdge, direction);
      if (released) post(released);
    },
    { passive: true },
  );

  // Touch IS one gesture across `touchstart` → `touchmove`* → `touchend`, so its start edge is
  // recorded exactly once, at `touchstart`, and reused for every `touchmove` of that same drag —
  // the mechanism that makes "reached the edge mid-drag" not release (see `decideRelease`'s own
  // doc-comment on that trade-off).
  let touchStartEdge = null;
  let touchStartY = 0;
  scroller.addEventListener(
    "touchstart",
    function (event) {
      touchStartEdge = edgeAt(scroller);
      touchStartY = event.touches[0].clientY;
    },
    { passive: true },
  );

  scroller.addEventListener(
    "touchmove",
    function (event) {
      const y = event.touches[0].clientY;
      // A touch drag's direction is the INVERSE of a wheel's: dragging the finger DOWN the screen
      // scrolls the content UP (scrollTop decreases), the same convention native touch scrolling
      // already uses.
      const direction = y > touchStartY ? "up" : y < touchStartY ? "down" : null;
      if (!direction) return;
      const released = decideRelease(touchStartEdge, direction);
      if (released) post(released);
    },
    { passive: true },
  );
}

// Guarded rather than a bare top-level call, matching `interaction.mjs`'s own guard: this file is
// also imported directly by `test/embed-exit.test.ts` (for the pure `decideRelease` function), in
// a context with no `document`. In the browser the guard is always true, so the inlined `<script>`
// still self-starts the moment it is parsed, unchanged.
if (typeof document !== "undefined") initEmbedExit();
