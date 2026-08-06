// Remotion composition wrapping the SAME CandlestickChart. Linear master timeline
// (the left→right grow-from-open ease in the component); short blank lead-in +
// end hold. Frame N is a pure function of the frame.
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import {
  CandlestickChart,
  type CandlestickConfig,
} from "../../src/CandlestickChart";
import sample from "../../assets/sample-data/candlestick.json";
import { RevealStage } from "./RevealStage";

const sampleConfig = sample as unknown as CandlestickConfig;

const HOLD_IN = 0.02;
const HOLD_OUT = 0.12;

export const CandlestickReveal: React.FC<{ scale?: number; config?: CandlestickConfig }> = ({ scale = 1, config = sampleConfig }) => {
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
      nativeType="candlestick"
    >
      <CandlestickChart
        config={config}
        progress={progress}
        width={width}
        height={height}
        scale={scale}
      />
    </RevealStage>
  );
};
