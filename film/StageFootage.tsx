// THE PICTURE — the landing itself, played under the type.
//
// `capture.mjs` drove the real page in a real browser with the interface turned off
// and screencast the viewport; this is that recording. Nothing here re-draws any of
// it. What this component owns is only where the recording is entered, and how it is
// given up at the end so the mark can stand on the ink alone.
//
// `OffthreadVideo` rather than `<Video>`: Remotion extracts the exact frame with
// ffmpeg instead of asking a `<video>` element to seek, which is the difference
// between a deterministic render and one that lands a frame or two off depending on
// how the decoder felt.

import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  OffthreadVideo,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { HOUSE } from "./house";
import { LAUNCH_TIMING } from "./timing";

export const StageFootage: React.FC = () => {
  const frame = useCurrentFrame();
  const { footageIn, footageOut } = LAUNCH_TIMING;

  // The recording goes out on a fade, not a cut. A cut here would land on the plate
  // field mid-drift and read as a dropped frame; the fade reads as the field settling
  // back into the ink it was floating in.
  const present = interpolate(frame, [footageOut.in, footageOut.out], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.4, 0, 0.2, 1),
  });

  if (present <= 0) return null;

  return (
    <AbsoluteFill style={{ background: HOUSE.ink, opacity: present }}>
      <OffthreadVideo
        src={staticFile("stage.mp4")}
        startFrom={footageIn}
        muted
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </AbsoluteFill>
  );
};
