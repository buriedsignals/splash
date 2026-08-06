// Remotion composition wrapping the SAME RadialBarChart. Linear master timeline
// (the grow-outward stagger lives in the component); a short blank lead-in + an
// end hold on the complete chart. Frame N is a pure function of the frame.
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { RadialBarChart, type RadialBarConfig } from "../../src/RadialBarChart";
import sample from "../../assets/sample-data/radial-bar.json";
import { RevealStage } from "./RevealStage";

const sampleConfig = sample as unknown as RadialBarConfig;

const HOLD_IN = 0.02;
const HOLD_OUT = 0.12;

export const RadialBarReveal: React.FC<{ scale?: number; config?: RadialBarConfig }> = ({ scale = 1, config = sampleConfig }) => {
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
      nativeType="radial-bar"
    >
      <RadialBarChart
        config={config}
        progress={progress}
        width={width}
        height={height}
        scale={scale}
      />
    </RevealStage>
  );
};
