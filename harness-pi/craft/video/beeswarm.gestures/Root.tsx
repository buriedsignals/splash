// The Position gesture kit's Remotion root: one composition per export size, chosen by the runner as `<base>-<size>`.
// No usable `defaultProps`: the beat cannot be drawn without the runner's scenes, words and faces.
import { Composition } from "remotion";
import { EXPORT_SIZE_NAMES, sizeFor } from "#shared/chart-video/sizes.mjs";
import { GesturePositionVideo, type GesturePositionVideoProps } from "./GesturePositionVideo";
import { GESTURE_VIDEO_TIMING } from "./timing-contract";

export const COMPOSITION_BASE = "zone-video-position-gestures";

const PLACEHOLDER = { faces: [], timing: GESTURE_VIDEO_TIMING } as unknown as GesturePositionVideoProps;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {EXPORT_SIZE_NAMES.map((size) => {
        const { width, height } = sizeFor(size);
        return <Composition key={size} id={`${COMPOSITION_BASE}-${size}`} component={GesturePositionVideo} durationInFrames={GESTURE_VIDEO_TIMING.total} fps={GESTURE_VIDEO_TIMING.fps} width={width} height={height} defaultProps={PLACEHOLDER} />;
      })}
    </>
  );
};
