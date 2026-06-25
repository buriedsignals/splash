// Remotion composition wrapping the SAME DumbbellChart. Linear master timeline
// (each phase eases itself in the component); a short blank lead-in + an end hold
// on the complete chart. Frame N is a pure function of the frame — reproducible.
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { DumbbellChart, type DumbbellConfig } from "../../src/DumbbellChart";
import sample from "../../assets/sample-data/dumbbell.json";

const config = sample as unknown as DumbbellConfig;

const HOLD_IN = 0.02;
const HOLD_OUT = 0.1;

export const DumbbellReveal: React.FC<{ scale?: number }> = ({ scale = 1 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const t = frame / (durationInFrames - 1);
  const progress = interpolate(t, [HOLD_IN, 1 - HOLD_OUT], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div style={{ width, height, background: "#FFFFFF" }}>
      <DumbbellChart
        config={config}
        progress={progress}
        width={width}
        height={height}
        scale={scale}
      />
    </div>
  );
};
