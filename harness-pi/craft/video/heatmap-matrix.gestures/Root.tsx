// The heatmap-matrix gesture kit's Remotion root: one composition per export size, chosen by the runner as `<base>-<size>`.
// There is no usable `defaultProps`: the beat cannot be drawn without the runner's layout, words and faces; the
// placeholder carries no faces, so a render driven by it is refused rather than drawn in whatever this machine has.
import { Composition } from "remotion";
import { EXPORT_SIZE_NAMES, sizeFor } from "#shared/chart-video/sizes.mjs";
import { GestureCellVideo, type GestureCellVideoProps } from "./GestureCellVideo";
import { CELL_VIDEO_TIMING } from "./timing-contract";

export const COMPOSITION_BASE = "zone-video-heatmap-matrix-gestures";

const PLACEHOLDER = { faces: [], timing: CELL_VIDEO_TIMING } as unknown as GestureCellVideoProps;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {EXPORT_SIZE_NAMES.map((size) => {
        const { width, height } = sizeFor(size);
        return (
          <Composition
            key={size}
            id={`${COMPOSITION_BASE}-${size}`}
            component={GestureCellVideo}
            durationInFrames={CELL_VIDEO_TIMING.total}
            fps={CELL_VIDEO_TIMING.fps}
            width={width}
            height={height}
            defaultProps={PLACEHOLDER}
          />
        );
      })}
    </>
  );
};
