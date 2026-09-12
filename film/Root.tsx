// The film's Remotion root. One composition: the launch film, 1920×1080 at 30 fps.
//
// The duration is not a literal here — it is `LAUNCH_TIMING.total`, and the film
// itself checks the two back against each other on the first frame it paints.

import React from "react";
import { Composition } from "remotion";
import { SplashLaunch } from "./SplashLaunch";
import { LAUNCH_TIMING } from "./timing";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="splash-launch"
    component={SplashLaunch}
    durationInFrames={LAUNCH_TIMING.total}
    fps={LAUNCH_TIMING.fps}
    width={1920}
    height={1080}
  />
);
