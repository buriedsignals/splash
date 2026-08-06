// Remotion composition wrapping the SAME HistogramChart. Linear master timeline
// (each phase eases itself in the component); a short blank lead-in + an end hold
// on the complete chart. Frame N is a pure function of the frame — reproducible.
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { HistogramChart, type HistogramConfig } from "../../src/HistogramChart";
import sample from "../../assets/sample-data/histogram.json";
import { RevealStage } from "./RevealStage";

const sampleConfig = sample as unknown as HistogramConfig;

const HOLD_IN = 0.02;
const HOLD_OUT = 0.1;

export const HistogramReveal: React.FC<{ scale?: number; config?: HistogramConfig }> = ({ scale = 1, config = sampleConfig }) => {
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
      nativeType="histogram"
    >
      <HistogramChart
        config={config}
        progress={progress}
        width={width}
        height={height}
        scale={scale}
      />
    </RevealStage>
  );
};
