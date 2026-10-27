// The treemap gesture kit's Remotion root: one composition per export size, chosen by the runner as `<base>-<size>`.
//
// The duration and fps come from the timing contract and the frame from the video size table. There is no usable
// `defaultProps`: the beat cannot be drawn without the runner's layout, words and faces; the placeholder carries no
// faces, so a render driven by it is refused rather than drawn in whatever this machine has.
import { Composition } from "remotion";
import { EXPORT_SIZE_NAMES, sizeFor } from "#shared/chart-video/sizes.mjs";
import { GesturePartVideo, type GesturePartVideoProps } from "./GesturePartVideo";
import { GESTURE_VIDEO_TIMING } from "./timing-contract";

export const COMPOSITION_BASE = "zone-video-treemap-gestures";

const PLACEHOLDER = { faces: [], timing: GESTURE_VIDEO_TIMING } as unknown as GesturePartVideoProps;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {EXPORT_SIZE_NAMES.map((size) => {
        const { width, height } = sizeFor(size);
        return (
          <Composition
            key={size}
            id={`${COMPOSITION_BASE}-${size}`}
            component={GesturePartVideo}
            durationInFrames={GESTURE_VIDEO_TIMING.total}
            fps={GESTURE_VIDEO_TIMING.fps}
            width={width}
            height={height}
            defaultProps={PLACEHOLDER}
          />
        );
      })}
    </>
  );
};
