// Remotion composition wrapping the SAME DivergingBarChart. Linear master
// timeline (each phase eases itself in the component); a short blank lead-in + an
// end hold. Frame N is a pure function of the frame — reproducible.
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import {
  DivergingBarChart,
  type DivergingBarConfig,
} from "../../src/DivergingBarChart";
import sample from "../../assets/sample-data/diverging-bar.json";

const sampleConfig = sample as unknown as DivergingBarConfig;

const HOLD_IN = 0.02;
const HOLD_OUT = 0.1;

export const DivergingBarReveal: React.FC<{ scale?: number; config?: DivergingBarConfig }> = ({ scale = 1, config = sampleConfig }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const t = frame / (durationInFrames - 1);
  const progress = interpolate(t, [HOLD_IN, 1 - HOLD_OUT], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div style={{ width, height, background: "#FFFFFF" }}>
      <DivergingBarChart
        config={config}
        progress={progress}
        width={width}
        height={height}
        scale={scale}
      />
    </div>
  );
};
