// core/capture-markers — who gets to say "I am the deliverable's root".
//
// The Verify layer resolves the element it screenshots down a ladder of candidates
// (lib/verify/capture.ts): `[data-splash-root]`, then `#root > div`, then `#root`, then
// `body`. Until now no engine posed the first one, so every capture landed on the
// structural guess. The guess happened to be right, which is the whole problem — it was
// right by coincidence, and nothing said so.
//
// Posing the marker has one hard requirement: it must resolve to the SAME element the
// guess already did, or the evidence silently reframes. In chart-native that element
// differs by build:
//
//   interactive  #root > div  ==  InteractiveChart's measured wrapper (ChartFrame is INSIDE it)
//   static/other #root > div  ==  ChartFrame's own frame div
//
// So both want to mark, and only the outer one may. A boolean context does it: whoever
// marks first sets the flag, and a frame that sees it already set stays quiet. Cheaper and
// more honest than a `querySelector` guard at runtime, and it keeps the invariant
// "exactly one root marker per page" checkable in a plain SSR render.
import { createContext } from "react";

/** True when an ancestor has already posed `[data-splash-root]`. */
export const CaptureRootMarkedContext = createContext(false);

/**
 * The attribute value React should render: `""` to pose the marker, `undefined` to omit
 * the attribute entirely. Callers spell the condition; this names the convention.
 */
export const captureMarkerValue = (pose: boolean): "" | undefined =>
  pose ? "" : undefined;
