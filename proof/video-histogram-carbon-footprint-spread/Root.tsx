// This beat's own Remotion root: one composition, at the size BRIEF.md pins (landscape).
//
// The duration and fps come from the timing contract and the frame from the video size table, so neither
// is typed here. There is no usable `defaultProps`: the beat cannot be drawn without the runner's layout,
// names and faces. Every real render goes through `render-directions-video.mjs`; the placeholder below
// carries no faces, so a render driven by it is refused rather than drawn in whatever this machine has.
import { Composition } from "remotion";
import { EXPORT_SIZE_NAMES, sizeFor } from "#shared/chart-video/sizes.mjs";
import { DirectedHistogramVideo, type DirectedHistogramVideoProps } from "./DirectedHistogramVideo";
import { HISTOGRAM_VIDEO_TIMING } from "./timing-contract";

/** ONE COMPOSITION PER EXPORT SIZE, and not one. Remotion bundles this root in a process of its
 *  own, which never sees the runner's `--size`, so the size cannot be read here — it has to be
 *  registered here and CHOSEN by the runner, which picks `<base>-<size>`. */
export const COMPOSITION_BASE = "video-histogram-carbon-footprint-spread";
export const COMPOSITION_ID = `${COMPOSITION_BASE}-landscape`;

const PLACEHOLDER = {
  faces: [],
  timing: HISTOGRAM_VIDEO_TIMING,
} as unknown as DirectedHistogramVideoProps;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {EXPORT_SIZE_NAMES.map((size) => {
        const { width, height } = sizeFor(size);
        return (
          <Composition
            key={size}
            id={`${COMPOSITION_BASE}-${size}`}
            component={DirectedHistogramVideo}
            durationInFrames={HISTOGRAM_VIDEO_TIMING.total}
            fps={HISTOGRAM_VIDEO_TIMING.fps}
            width={width}
            height={height}
            defaultProps={PLACEHOLDER}
          />
        );
      })}
    </>
  );
};
