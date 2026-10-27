// The paired gesture kit's Remotion root: one composition per export size, `<base>-<size>`. The base names the type;
// `composition.ts` beside this file is the only line that differs between the five paired video kits.
//
// There is no usable `defaultProps`: the beat cannot be drawn without the runner's layout, words and faces.
import { Composition } from "remotion";
import { EXPORT_SIZE_NAMES, sizeFor } from "#shared/chart-video/sizes.mjs";
import { COMPOSITION_BASE } from "./composition";
import { GesturePairedVideo, type GesturePairedVideoProps } from "./GesturePairedVideo";
import { GESTURE_VIDEO_TIMING } from "./timing-contract";

const PLACEHOLDER = { faces: [], timing: GESTURE_VIDEO_TIMING } as unknown as GesturePairedVideoProps;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {EXPORT_SIZE_NAMES.map((size) => {
        const { width, height } = sizeFor(size);
        return (
          <Composition
            key={size}
            id={`${COMPOSITION_BASE}-${size}`}
            component={GesturePairedVideo}
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
