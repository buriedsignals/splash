// Remotion composition wrapping the SAME MarimekkoChart. Linear master timeline
// (each phase eases itself in the component); short blank lead-in + end hold.
// Frame N is a pure function of the frame — reproducible.
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { MarimekkoChart, type MarimekkoConfig } from "../../src/MarimekkoChart";
import sample from "../../assets/sample-data/marimekko.json";

const config = sample as unknown as MarimekkoConfig;

const HOLD_IN = 0.02;
const HOLD_OUT = 0.1;

export const MarimekkoReveal: React.FC<{ scale?: number }> = ({
  scale = 1,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const t = frame / (durationInFrames - 1);
  const progress = interpolate(t, [HOLD_IN, 1 - HOLD_OUT], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div style={{ width, height, background: "#FFFFFF" }}>
      <MarimekkoChart
        config={config}
        progress={progress}
        width={width}
        height={height}
        scale={scale}
      />
    </div>
  );
};
