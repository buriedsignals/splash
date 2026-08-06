// Remotion composition wrapping the SAME ConnectedScatterChart. Linear master
// timeline (each phase eases itself in the component); short blank lead-in + end
// hold. Frame N is a pure function of the frame — reproducible.
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import {
  ConnectedScatterChart,
  type ConnectedScatterConfig,
} from "../../src/ConnectedScatterChart";
import sample from "../../assets/sample-data/connected-scatter.json";
import { RevealStage } from "./RevealStage";

const sampleConfig = sample as unknown as ConnectedScatterConfig;

const HOLD_IN = 0.02;
const HOLD_OUT = 0.1;

export const ConnectedScatterReveal: React.FC<{ scale?: number; config?: ConnectedScatterConfig }> = ({ scale = 1, config = sampleConfig }) => {
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
      nativeType="connected-scatter"
    >
      <ConnectedScatterChart
        config={config}
        progress={progress}
        width={width}
        height={height}
        scale={scale}
      />
    </RevealStage>
  );
};
