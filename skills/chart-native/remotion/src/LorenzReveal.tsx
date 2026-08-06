// Remotion composition wrapping the SAME LorenzChart. Linear master timeline (the
// clip-wipe ease in the component); short blank lead-in + end hold. Frame N is a
// pure function of the frame.
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { LorenzChart, type LorenzConfig } from "../../src/LorenzChart";
import sample from "../../assets/sample-data/lorenz.json";
import { RevealStage } from "./RevealStage";

const sampleConfig = sample as unknown as LorenzConfig;

const HOLD_IN = 0.02;
const HOLD_OUT = 0.12;

export const LorenzReveal: React.FC<{ scale?: number; config?: LorenzConfig }> = ({ scale = 1, config = sampleConfig }) => {
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
      nativeType="lorenz"
    >
      <LorenzChart
        config={config}
        progress={progress}
        width={width}
        height={height}
        scale={scale}
      />
    </RevealStage>
  );
};
