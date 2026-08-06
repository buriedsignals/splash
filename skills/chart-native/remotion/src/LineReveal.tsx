// Remotion composition wrapping the SAME LineChart. Progress is a pure function
// of the current frame with a Disney ease-in/out (Chang & Ungar) — no Date.now,
// no Math.random, no wall-clock. Frame N always produces the identical image.
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { LineChart, type ChartConfig } from "../../src/LineChart";
import sample from "../../assets/sample-data/series.json";
import { RevealStage } from "./RevealStage";

const sampleConfig = sample as unknown as ChartConfig;

// The master timeline is LINEAR — each phase (axes wipe / line draw / label)
// eases itself inside LineChart, so the line gets its own smooth ease-in-out
// over a wide window. A short hold at each end gives readable first/last stills.
const HOLD_IN = 0.02; // brief blank hold before the chart builds from nothing
const HOLD_OUT = 0.1; // fraction held on the complete chart at the end

export const LineReveal: React.FC<{ scale?: number; config?: ChartConfig }> = ({ scale = 1, config = sampleConfig }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const t = frame / (durationInFrames - 1); // 0..1, deterministic

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
      nativeType="line"
    >
      <LineChart
        config={config}
        progress={progress}
        width={width}
        height={height}
        scale={scale}
      />
    </RevealStage>
  );
};
