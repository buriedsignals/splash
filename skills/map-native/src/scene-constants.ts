// scene-constants.ts — frame counts of the shared two-scene model for map videos.
// Runtime-free ON PURPOSE: route-geo (imported by validate-config, itself inside the
// splash validate-gate closure) needs TITLE_SCENE_FRAMES without dragging remotion
// (and its react peer) into a pure-validation import graph — a Datawrapper-only
// produce-all must never require the video runtime to be installed
// (skills/splash/tests/validate-closure.test.ts is the drift guard).
export const TITLE_SCENE_FRAMES = 75; // ~2.5s @ 30fps — matches the storytelling title hold
export const CROSSFADE_FRAMES = 12; // ~0.4s @ 30fps
