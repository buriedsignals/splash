// Remotion composition wrapping the SAME RadarChart. Linear master timeline
// (the chrome fade + per-series grow-from-centre ease in the component); short
// blank lead-in + end hold. Frame N is a pure function of the frame.
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { RadarChart, type RadarConfig } from "../../src/RadarChart";
import sample from "../../assets/sample-data/radar.json";

const sampleConfig = sample as unknown as RadarConfig;

const HOLD_IN = 0.02;
const HOLD_OUT = 0.1;

export const RadarReveal: React.FC<{ scale?: number; config?: RadarConfig }> = ({ scale = 1, config = sampleConfig }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const t = frame / (durationInFrames - 1);
  const progress = interpolate(t, [HOLD_IN, 1 - HOLD_OUT], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div style={{ width, height, background: "#FFFFFF" }}>
      <RadarChart
        config={config}
        progress={progress}
        width={width}
        height={height}
        scale={scale}
      />
    </div>
  );
};
