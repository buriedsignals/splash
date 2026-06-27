// Remotion composition wrapping the SAME WaterfallChart. Linear master timeline
// (each phase eases itself in the component); a short blank lead-in + an end hold.
// Frame N is a pure function of the frame — reproducible.
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { WaterfallChart, type WaterfallConfig } from "../../src/WaterfallChart";
import sample from "../../assets/sample-data/waterfall.json";

const sampleConfig = sample as unknown as WaterfallConfig;

const HOLD_IN = 0.02;
const HOLD_OUT = 0.1;

export const WaterfallReveal: React.FC<{ scale?: number; config?: WaterfallConfig }> = ({ scale = 1, config = sampleConfig }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const t = frame / (durationInFrames - 1);
  const progress = interpolate(t, [HOLD_IN, 1 - HOLD_OUT], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div style={{ width, height, background: "#FFFFFF" }}>
      <WaterfallChart
        config={config}
        progress={progress}
        width={width}
        height={height}
        scale={scale}
      />
    </div>
  );
};
