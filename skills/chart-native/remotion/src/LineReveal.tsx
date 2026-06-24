// Remotion composition wrapping the SAME LineChart. Progress is a pure function
// of the current frame with a Disney ease-in/out (Chang & Ungar) — no Date.now,
// no Math.random, no wall-clock. Frame N always produces the identical image.
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { LineChart, type ChartConfig } from "../../src/LineChart";
import sample from "../../assets/sample-data/series.json";

const config = sample as unknown as ChartConfig;

// reveal occupies the middle of the timeline; a short hold at each end so the
// first/last frames are readable stills.
const HOLD_IN = 0.08; // fraction of duration before the line starts
const HOLD_OUT = 0.12; // fraction held on the full chart at the end

export const LineReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const t = frame / (durationInFrames - 1); // 0..1, deterministic

  const progress = interpolate(t, [HOLD_IN, 1 - HOLD_OUT], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic), // Disney ease-in/out
  });

  return (
    <div style={{ width, height, background: "#FFFFFF" }}>
      <LineChart
        config={config}
        progress={progress}
        width={width}
        height={height}
      />
    </div>
  );
};
