// Remotion composition wrapping the SAME BumpChart. Linear master timeline (the
// chrome wipe + left→right line-draw ease in the component); short blank lead-in
// + end hold. Frame N is a pure function of the frame.
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { BumpChart, type BumpConfig } from "../../src/BumpChart";
import sample from "../../assets/sample-data/bump.json";

const config = sample as unknown as BumpConfig;

const HOLD_IN = 0.02;
const HOLD_OUT = 0.12;

export const BumpReveal: React.FC<{ scale?: number }> = ({ scale = 1 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const t = frame / (durationInFrames - 1);
  const progress = interpolate(t, [HOLD_IN, 1 - HOLD_OUT], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div style={{ width, height, background: "#FFFFFF" }}>
      <BumpChart
        config={config}
        progress={progress}
        width={width}
        height={height}
        scale={scale}
      />
    </div>
  );
};
