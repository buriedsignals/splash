// This beat's own Remotion root: one composition, at the size BRIEF.md pins (landscape).
//
// The duration and fps come from the timing contract and the frame from the video size table, so neither
// is typed here. There is no usable `defaultProps`: the beat cannot be drawn without the runner's layout,
// names and faces. Every real render goes through `render-directions-video.mjs`; the placeholder below
// carries no faces, so a render driven by it is refused rather than drawn in whatever this machine has.
import { Composition } from "remotion";
import { sizeFor } from "#shared/chart-video/sizes.mjs";
import {
  DirectedConnectedScatterVideo,
  type DirectedConnectedScatterVideoProps,
} from "./DirectedConnectedScatterVideo";
import { CONNECTED_SCATTER_VIDEO_TIMING } from "./timing-contract";

export const COMPOSITION_ID = "video-connected-scatter-lowcarbon-landscape";

const PLACEHOLDER = {
  faces: [],
  timing: CONNECTED_SCATTER_VIDEO_TIMING,
} as unknown as DirectedConnectedScatterVideoProps;

export const RemotionRoot: React.FC = () => {
  const { width, height } = sizeFor("landscape");
  return (
    <Composition
      id={COMPOSITION_ID}
      component={DirectedConnectedScatterVideo}
      durationInFrames={CONNECTED_SCATTER_VIDEO_TIMING.total}
      fps={CONNECTED_SCATTER_VIDEO_TIMING.fps}
      width={width}
      height={height}
      defaultProps={PLACEHOLDER}
    />
  );
};
