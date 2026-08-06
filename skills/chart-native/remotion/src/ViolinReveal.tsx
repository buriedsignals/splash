// Remotion composition wrapping the SAME ViolinChart. Linear master timeline (the
// inflate ease lives in the component); a short blank lead-in + an end hold on
// the complete chart. Frame N is a pure function of the frame.
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { ViolinChart, type ViolinConfig } from "../../src/ViolinChart";
import sample from "../../assets/sample-data/violin.json";
import { RevealStage } from "./RevealStage";

const sampleConfig = sample as unknown as ViolinConfig;

const HOLD_IN = 0.02;
const HOLD_OUT = 0.12;

export const ViolinReveal: React.FC<{ scale?: number; config?: ViolinConfig }> = ({ scale = 1, config = sampleConfig }) => {
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
      nativeType="violin"
    >
      <ViolinChart
        config={config}
        progress={progress}
        width={width}
        height={height}
        scale={scale}
      />
    </RevealStage>
  );
};
