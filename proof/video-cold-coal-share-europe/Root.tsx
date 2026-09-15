// The beat's Remotion root: one composition at the size BRIEF.md pins (landscape); duration and fps from the timing
// contract. No usable defaultProps — every real render goes through `render-directions-video.mjs`.
import { Composition } from "remotion";
import { sizeFor } from "#shared/chart-video/sizes.mjs";
import { CoalVideo, type CoalVideoProps } from "./CoalVideo";
import { COAL_VIDEO_TIMING } from "./timing-contract";

export const COMPOSITION_ID = "video-cold-coal-share-europe-landscape";

export const RemotionRoot: React.FC = () => {
  const { width, height } = sizeFor("landscape");
  return (
    <Composition
      id={COMPOSITION_ID}
      component={CoalVideo}
      durationInFrames={COAL_VIDEO_TIMING.total}
      fps={COAL_VIDEO_TIMING.fps}
      width={width}
      height={height}
      defaultProps={
        {
          faces: [],
          mapPlanProxied: null,
          timing: COAL_VIDEO_TIMING,
        } as unknown as CoalVideoProps
      }
    />
  );
};
