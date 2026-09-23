// This beat's own Remotion root: one composition, at the size BRIEF.md pins (landscape).
//
// The duration and fps come from the timing contract and the frame from the video size table, so neither
// is typed here. There is no usable `defaultProps`: the beat cannot be drawn without the runner's layout,
// names, faces and proxied map plan. Every real render goes through `render-directions-video.mjs`; the placeholder below
// carries no faces, so a render driven by it is refused rather than drawn in whatever this machine has.
import { Composition } from "remotion";
import { EXPORT_SIZE_NAMES, sizeFor } from "#shared/chart-video/sizes.mjs";
import {
  DirectedProportionalSymbolVideo,
  type DirectedProportionalSymbolVideoProps,
} from "./DirectedProportionalSymbolVideo";
import { SYMBOL_VIDEO_TIMING } from "./timing-contract";

/** ONE COMPOSITION PER EXPORT SIZE, and not one. Remotion bundles this root in a process of its
 *  own, which never sees the runner's `--size`, so the size cannot be read here — it has to be
 *  registered here and CHOSEN by the runner, which picks `<base>-<size>`. */
export const COMPOSITION_BASE = "video-proportional-symbol-europe-capacity";
export const COMPOSITION_ID = `${COMPOSITION_BASE}-landscape`;

const PLACEHOLDER = {
  faces: [],
  // The live map's plan through the render's proxy: written by the runner at render time, never committed.
  mapPlanProxied: null,
  timing: SYMBOL_VIDEO_TIMING,
} as unknown as DirectedProportionalSymbolVideoProps;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {EXPORT_SIZE_NAMES.map((size) => {
        const { width, height } = sizeFor(size);
        return (
          <Composition
            key={size}
            id={`${COMPOSITION_BASE}-${size}`}
            component={DirectedProportionalSymbolVideo}
            durationInFrames={SYMBOL_VIDEO_TIMING.total}
            fps={SYMBOL_VIDEO_TIMING.fps}
            width={width}
            height={height}
            defaultProps={PLACEHOLDER}
          />
        );
      })}
    </>
  );
};
