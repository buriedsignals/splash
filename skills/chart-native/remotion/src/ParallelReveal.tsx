// Remotion composition wrapping the SAME ParallelChart. Linear master timeline
// (the clip-wipe ease in the component); short blank lead-in + end hold. Frame N
// is a pure function of the frame.
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { ParallelChart, type ParallelConfig } from "../../src/ParallelChart";
import sample from "../../assets/sample-data/parallel.json";

const config = sample as unknown as ParallelConfig;

const HOLD_IN = 0.02;
const HOLD_OUT = 0.12;

export const ParallelReveal: React.FC<{ scale?: number }> = ({ scale = 1 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const t = frame / (durationInFrames - 1);
  const progress = interpolate(t, [HOLD_IN, 1 - HOLD_OUT], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div style={{ width, height, background: "#FFFFFF" }}>
      <ParallelChart
        config={config}
        progress={progress}
        width={width}
        height={height}
        scale={scale}
      />
    </div>
  );
};
