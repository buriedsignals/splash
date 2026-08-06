// Remotion composition wrapping the SAME TreemapChart. Linear master timeline
// (the per-cell scale-in ease in the component); short blank lead-in + end hold.
// Frame N is a pure function of the frame.
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { TreemapChart, type TreemapConfig } from "../../src/TreemapChart";
import sample from "../../assets/sample-data/treemap.json";
import { RevealStage } from "./RevealStage";

const sampleConfig = sample as unknown as TreemapConfig;

const HOLD_IN = 0.02;
const HOLD_OUT = 0.12;

export const TreemapReveal: React.FC<{ scale?: number; config?: TreemapConfig }> = ({ scale = 1, config = sampleConfig }) => {
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
      nativeType="treemap"
    >
      <TreemapChart
        config={config}
        progress={progress}
        width={width}
        height={height}
        scale={scale}
      />
    </RevealStage>
  );
};
