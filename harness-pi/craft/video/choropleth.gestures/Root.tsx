// The choropleth gesture kit's Remotion root: one composition per export size, chosen by the runner as `<base>-<size>`.
// The duration and fps come from the timing contract and the frame from the video size table. The placeholder carries
// no faces, so a render driven by it is refused rather than drawn in whatever this machine has.
import { Composition } from "remotion";
import { EXPORT_SIZE_NAMES, sizeFor } from "#shared/chart-video/sizes.mjs";
import { GestureGeoAreaVideo, type GestureGeoAreaVideoProps } from "./GestureGeoAreaVideo";
import { GESTURE_VIDEO_TIMING } from "./timing-contract";

export const COMPOSITION_BASE = "zone-video-choropleth-gestures";

const PLACEHOLDER = { faces: [], timing: GESTURE_VIDEO_TIMING } as unknown as GestureGeoAreaVideoProps;

export const RemotionRoot: React.FC = () => (
  <>
    {EXPORT_SIZE_NAMES.map((size) => {
      const { width, height } = sizeFor(size);
      return <Composition key={size} id={`${COMPOSITION_BASE}-${size}`} component={GestureGeoAreaVideo} durationInFrames={GESTURE_VIDEO_TIMING.total} fps={GESTURE_VIDEO_TIMING.fps} width={width} height={height} defaultProps={PLACEHOLDER} />;
    })}
  </>
);
