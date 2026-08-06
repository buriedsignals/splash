// Remotion composition wrapping the SAME GroupedBarChart. Linear master timeline
// (each phase eases itself in the component); a short blank lead-in + an end hold
// on the complete chart. Frame N is a pure function of the frame — reproducible.
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { GroupedBarChart, type GroupedConfig } from "../../src/GroupedBarChart";
import sample from "../../assets/sample-data/grouped.json";
import { RevealStage } from "./RevealStage";

const sampleConfig = sample as unknown as GroupedConfig;

const HOLD_IN = 0.02;
const HOLD_OUT = 0.1;

export const GroupedBarReveal: React.FC<{ scale?: number; config?: GroupedConfig }> = ({ scale = 1, config = sampleConfig }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const t = frame / (durationInFrames - 1);
  const progress = interpolate(t, [HOLD_IN, 1 - HOLD_OUT], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <RevealStage
      config={config}
      progress={progress}
      width={width}
      height={height}
      scale={scale}
      nativeType="grouped"
    >
      <GroupedBarChart
        config={config}
        progress={progress}
        width={width}
        height={height}
        scale={scale}
      />
    </RevealStage>
  );
};
