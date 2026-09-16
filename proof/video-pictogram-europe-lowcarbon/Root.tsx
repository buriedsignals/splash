// This beat's own Remotion root: one composition, at the size BRIEF.md pins (landscape).
//
// The duration and fps come from the timing contract and the frame from the video size table, so neither
// is typed here. There is no usable `defaultProps`: the beat cannot be drawn without the runner's layout,
// names and faces. Every real render goes through `render-directions-video.mjs`; the placeholder below
// carries no faces, so a render driven by it is refused rather than drawn in whatever this machine has.
import { Composition } from "remotion";
import { sizeFor } from "#shared/chart-video/sizes.mjs";
import { DirectedPictogramVideo, type DirectedPictogramVideoProps } from "./DirectedPictogramVideo";
import { PICTOGRAM_VIDEO_TIMING } from "./timing-contract";

export const COMPOSITION_ID = "video-pictogram-europe-lowcarbon-landscape";

const PLACEHOLDER = {
  faces: [],
  timing: PICTOGRAM_VIDEO_TIMING,
} as unknown as DirectedPictogramVideoProps;

export const RemotionRoot: React.FC = () => {
  const { width, height } = sizeFor("landscape");
  return (
    <Composition
      id={COMPOSITION_ID}
      component={DirectedPictogramVideo}
      durationInFrames={PICTOGRAM_VIDEO_TIMING.total}
      fps={PICTOGRAM_VIDEO_TIMING.fps}
      width={width}
      height={height}
      defaultProps={PLACEHOLDER}
    />
  );
};
