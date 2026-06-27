// Remotion composition wrapping the SAME SlopeChart. Linear master timeline (each
// phase eases itself in the component); a short blank lead-in + an end hold on the
// complete chart. Frame N is a pure function of the frame — reproducible.
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { SlopeChart, type SlopeConfig } from "../../src/SlopeChart";
import sample from "../../assets/sample-data/slope.json";

const sampleConfig = sample as unknown as SlopeConfig;

const HOLD_IN = 0.02;
const HOLD_OUT = 0.1;

export const SlopeReveal: React.FC<{ scale?: number; config?: SlopeConfig }> = ({ scale = 1, config = sampleConfig }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const t = frame / (durationInFrames - 1);
  const progress = interpolate(t, [HOLD_IN, 1 - HOLD_OUT], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div style={{ width, height, background: "#FFFFFF" }}>
      <SlopeChart
        config={config}
        progress={progress}
        width={width}
        height={height}
        scale={scale}
      />
    </div>
  );
};
