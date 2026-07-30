// The camera-mode taxonomy for storytelling video. `simple` is the reveal format
// (no camera); `guided-tour` flies between beats (SP2); `route-reveal` draws a line
// on (SP3). The story format dispatches on this; the AI sets it per article.
// `simple` was described here from the start and was missing from this array, which is the only
// place the taxonomy is enforced — so the 6 *Reveal compositions it selects (18 with their square
// and portrait siblings) rendered correctly and no CLI could ask for them. Restored deliberately:
// the narrated story stays the default and the better choice for most articles, but a reveal is a
// capability the tool offers, not a mistake to leave unreachable.
export const CAMERA_MODES = ["guided-tour", "route-reveal", "simple"] as const;
export type CameraMode = (typeof CAMERA_MODES)[number];
export const DEFAULT_CAMERA_MODE: CameraMode = "guided-tour";
