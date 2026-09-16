// This beat's own Remotion root: one composition, sized from the video size table, timed from the contract.
// No usable `defaultProps`: every real render goes through `render-directions-video.mjs`, which writes the proxied map
// plan and the faces into the props; with neither there is no map and no word.
import { Composition } from "remotion";
import { sizeFor } from "#shared/chart-video/sizes.mjs";
import { DirectedCold2CoalShareEuropeVideo, type DirectedCold2CoalShareEuropeVideoProps } from "./DirectedCold2CoalShareEuropeVideo";
import { COLD2_COAL_SHARE_EUROPE_VIDEO_TIMING } from "./timing-contract";

export const COMPOSITION_ID = "video-cold2-coal-share-europe-landscape";

const PLACEHOLDER = { faces: [], mapPlanProxied: null, timing: COLD2_COAL_SHARE_EUROPE_VIDEO_TIMING } as unknown as DirectedCold2CoalShareEuropeVideoProps;

export const RemotionRoot: React.FC = () => {
  const { width, height } = sizeFor("landscape");
  return (
    <Composition
      id={COMPOSITION_ID}
      component={DirectedCold2CoalShareEuropeVideo}
      durationInFrames={COLD2_COAL_SHARE_EUROPE_VIDEO_TIMING.total}
      fps={COLD2_COAL_SHARE_EUROPE_VIDEO_TIMING.fps}
      width={width}
      height={height}
      defaultProps={PLACEHOLDER}
    />
  );
};
