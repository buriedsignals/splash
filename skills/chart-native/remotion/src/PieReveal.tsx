// Remotion composition wrapping the SAME PieChart. Linear master timeline; the
// pie phase (angle sweep) eases itself inside PieChart. Frame N is pure.
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { PieChart, type PieConfig } from "../../src/PieChart";
import sample from "../../assets/sample-data/pie.json";
import { RevealStage } from "./RevealStage";

const sampleConfig = sample as unknown as PieConfig;

const HOLD_IN = 0.02;
const HOLD_OUT = 0.1;

export const PieReveal: React.FC<{ scale?: number; config?: PieConfig }> = ({ scale = 1, config = sampleConfig }) => {
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
      nativeType="pie"
    >
      <PieChart
        config={config}
        progress={progress}
        width={width}
        height={height}
        scale={scale}
      />
    </RevealStage>
  );
};
