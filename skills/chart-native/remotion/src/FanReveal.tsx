// Remotion composition wrapping the SAME FanChart. Linear master timeline (the
// clip-wipe ease in the component); short blank lead-in + end hold. Frame N is a
// pure function of the frame.
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { FanChart, type FanConfig } from "../../src/FanChart";
import sample from "../../assets/sample-data/fan.json";
import { RevealStage } from "./RevealStage";

const sampleConfig = sample as unknown as FanConfig;

const HOLD_IN = 0.02;
const HOLD_OUT = 0.12;

export const FanReveal: React.FC<{ scale?: number; config?: FanConfig }> = ({ scale = 1, config = sampleConfig }) => {
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
      nativeType="fan"
    >
      <FanChart
        config={config}
        progress={progress}
        width={width}
        height={height}
        scale={scale}
      />
    </RevealStage>
  );
};
