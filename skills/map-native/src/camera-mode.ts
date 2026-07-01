// The camera-mode taxonomy for storytelling video. `simple` is the reveal format
// (no camera); `guided-tour` flies between beats (SP2); `route-reveal` draws a line
// on (SP3). The story format dispatches on this; the AI sets it per article.
export const CAMERA_MODES = ["guided-tour", "route-reveal"] as const;
export type CameraMode = (typeof CAMERA_MODES)[number];
export const DEFAULT_CAMERA_MODE: CameraMode = "guided-tour";
