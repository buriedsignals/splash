// The radar-spider gesture kit's Remotion root: one composition per export size, chosen by the runner as `<base>-<size>`.
// No usable defaultProps: the beat cannot be drawn without the runner's layout, words and faces.
import { Composition } from "remotion";
import { EXPORT_SIZE_NAMES, sizeFor } from "#shared/chart-video/sizes.mjs";
import { GestureProfileVideo } from "./GestureProfileVideo";
import { KEYED_VIDEO_TIMING } from "./timing-contract";

export const COMPOSITION_BASE = "zone-video-radar-spider-gestures";

const PLACEHOLDER = { faces: [], timing: KEYED_VIDEO_TIMING } as any;

export const RemotionRoot: React.FC = () => (
  <>
    {EXPORT_SIZE_NAMES.map((size) => {
      const { width, height } = sizeFor(size);
      return (
        <Composition
          key={size}
          id={`${COMPOSITION_BASE}-${size}`}
          component={GestureProfileVideo}
          durationInFrames={KEYED_VIDEO_TIMING.total}
          fps={KEYED_VIDEO_TIMING.fps}
          width={width}
          height={height}
          defaultProps={PLACEHOLDER}
        />
      );
    })}
  </>
);
