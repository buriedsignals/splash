// Remotion composition wrapping the SAME BeeswarmChart. Linear master timeline
// (the chrome wipe + per-dot scale-in ease in the component); short blank lead-in
// + end hold. Frame N is a pure function of the frame.
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { BeeswarmChart, type BeeswarmConfig } from "../../src/BeeswarmChart";
import sample from "../../assets/sample-data/beeswarm.json";

const sampleConfig = sample as unknown as BeeswarmConfig;

const HOLD_IN = 0.02;
const HOLD_OUT = 0.12;

export const BeeswarmReveal: React.FC<{ scale?: number; config?: BeeswarmConfig }> = ({ scale = 1, config = sampleConfig }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const t = frame / (durationInFrames - 1);
  const progress = interpolate(t, [HOLD_IN, 1 - HOLD_OUT], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div style={{ width, height, background: "#FFFFFF" }}>
      <BeeswarmChart
        config={config}
        progress={progress}
        width={width}
        height={height}
        scale={scale}
      />
    </div>
  );
};
