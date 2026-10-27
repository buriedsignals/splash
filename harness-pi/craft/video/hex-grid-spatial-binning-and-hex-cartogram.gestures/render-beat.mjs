// The hex-grid-spatial-binning-and-hex-cartogram GESTURE beat, video: the area maps' shared runner (gesture-geo-area-render-video.mjs) with this kit's
// variant, composition and timing contract. Guard order: applyStoryboard → REQUIRED → rows and values → check() → the
// title's figures → the gesture core (family geo, format video: exactly three gestures, the third showing the whole
// map) → scheduleGeoVideo (six events) → every word measured → look stills → mp4. A refusal prints REFUSED with the
// beat.mjs field and a value that works; SPLASH_GESTURE_REPAIR=1 applies the fixes instead. Copied into the beat.
//
// Usage:  bun <beat>/render-beat.mjs [--look-only]
import { renderGeoAreaVideo } from "./gesture-geo-area-render-video.mjs";
import { GESTURE_VIDEO_TIMING } from "./timing-contract.ts";

await renderGeoAreaVideo(import.meta.dirname, "hex-grid-spatial-binning-and-hex-cartogram", { composition: "zone-video-hex-grid-spatial-binning-and-hex-cartogram-gestures", timing: GESTURE_VIDEO_TIMING });
