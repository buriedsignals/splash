// This beat's own Remotion root: one composition, sized from the video size table, timed from the contract.
// No usable `defaultProps`: every real render goes through `render-directions-video.mjs`, and a render driven
// by the facesless placeholder is refused rather than drawn in whatever this machine has.
import { Composition } from "remotion";
import { sizeFor } from "#shared/chart-video/sizes.mjs";
import { DirectedPopulationVideo, type DirectedPopulationVideoProps } from "./DirectedPopulationVideo";
import { POPULATION_VIDEO_TIMING } from "./timing-contract";

export const COMPOSITION_ID = "video-cold-world-population-landscape";

const PLACEHOLDER = { faces: [], timing: POPULATION_VIDEO_TIMING } as unknown as DirectedPopulationVideoProps;

export const RemotionRoot: React.FC = () => {
  const { width, height } = sizeFor("landscape");
  return (
    <Composition
      id={COMPOSITION_ID}
      component={DirectedPopulationVideo}
      durationInFrames={POPULATION_VIDEO_TIMING.total}
      fps={POPULATION_VIDEO_TIMING.fps}
      width={width}
      height={height}
      defaultProps={PLACEHOLDER}
    />
  );
};
