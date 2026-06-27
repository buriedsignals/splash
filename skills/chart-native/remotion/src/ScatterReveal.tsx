// Remotion composition wrapping the SAME ScatterChart. Linear master timeline
// (each phase eases itself); brief blank lead-in + end hold. Frame N is a pure
// function of the frame.
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { ScatterChart, type ScatterConfig } from "../../src/ScatterChart";
import sample from "../../assets/sample-data/scatter.json";

const sampleConfig = sample as unknown as ScatterConfig;

const HOLD_IN = 0.02;
const HOLD_OUT = 0.1;

export const ScatterReveal: React.FC<{ scale?: number; config?: ScatterConfig }> = ({ scale = 1, config = sampleConfig }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const t = frame / (durationInFrames - 1);
  const progress = interpolate(t, [HOLD_IN, 1 - HOLD_OUT], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div style={{ width, height, background: "#FFFFFF" }}>
      <ScatterChart
        config={config}
        progress={progress}
        width={width}
        height={height}
        scale={scale}
      />
    </div>
  );
};
