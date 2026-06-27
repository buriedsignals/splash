// Remotion composition wrapping the SAME PopulationPyramidChart. Linear master
// timeline (each phase eases itself in the component); short blank lead-in + end
// hold. Frame N is a pure function of the frame — reproducible.
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import {
  PopulationPyramidChart,
  type PopulationPyramidConfig,
} from "../../src/PopulationPyramidChart";
import sample from "../../assets/sample-data/population-pyramid.json";

const sampleConfig = sample as unknown as PopulationPyramidConfig;

const HOLD_IN = 0.02;
const HOLD_OUT = 0.1;

export const PopulationPyramidReveal: React.FC<{ scale?: number; config?: PopulationPyramidConfig }> = ({ scale = 1, config = sampleConfig }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const t = frame / (durationInFrames - 1);
  const progress = interpolate(t, [HOLD_IN, 1 - HOLD_OUT], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div style={{ width, height, background: "#FFFFFF" }}>
      <PopulationPyramidChart
        config={config}
        progress={progress}
        width={width}
        height={height}
        scale={scale}
      />
    </div>
  );
};
