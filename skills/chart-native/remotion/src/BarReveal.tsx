// Remotion composition wrapping the SAME BarChart. Linear master timeline (each
// phase eases itself in BarChart); a short blank lead-in + an end hold on the
// complete chart. Frame N is a pure function of the frame — reproducible.
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { BarChart, type BarConfig } from "../../src/BarChart";
import sample from "../../assets/sample-data/bars.json";

const sampleConfig = sample as unknown as BarConfig;

const HOLD_IN = 0.02; // brief blank before the bars build
const HOLD_OUT = 0.1; // hold on the complete chart at the end

export const BarReveal: React.FC<{ scale?: number; config?: BarConfig }> = ({ scale = 1, config = sampleConfig }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const t = frame / (durationInFrames - 1);
  const progress = interpolate(t, [HOLD_IN, 1 - HOLD_OUT], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ width, height, background: "#FFFFFF" }}>
      <BarChart
        config={config}
        progress={progress}
        width={width}
        height={height}
        scale={scale}
      />
    </div>
  );
};
