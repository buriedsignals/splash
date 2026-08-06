// Remotion composition wrapping the SAME BoxplotChart. Linear master timeline
// (the chrome wipe + per-box grow-from-median ease in the component); short blank
// lead-in + end hold. Frame N is a pure function of the frame.
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { BoxplotChart, type BoxplotConfig } from "../../src/BoxplotChart";
import sample from "../../assets/sample-data/boxplot.json";
import { RevealStage } from "./RevealStage";

const sampleConfig = sample as unknown as BoxplotConfig;

const HOLD_IN = 0.02;
const HOLD_OUT = 0.1;

export const BoxplotReveal: React.FC<{ scale?: number; config?: BoxplotConfig }> = ({ scale = 1, config = sampleConfig }) => {
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
      nativeType="boxplot"
    >
      <BoxplotChart
        config={config}
        progress={progress}
        width={width}
        height={height}
        scale={scale}
      />
    </RevealStage>
  );
};
