// Remotion composition wrapping the SAME ArcChart. Linear master timeline (the
// sweep-open ease lives in the component); a short blank lead-in + an end hold on
// the complete chart. Frame N is a pure function of the frame.
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { ArcChart, type ArcConfig } from "../../src/ArcChart";
import sample from "../../assets/sample-data/arc.json";

const sampleConfig = sample as unknown as ArcConfig;

const HOLD_IN = 0.02;
const HOLD_OUT = 0.12;

export const ArcReveal: React.FC<{ scale?: number; config?: ArcConfig }> = ({ scale = 1, config = sampleConfig }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const t = frame / (durationInFrames - 1);
  const progress = interpolate(t, [HOLD_IN, 1 - HOLD_OUT], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div style={{ width, height, background: "#FFFFFF" }}>
      <ArcChart
        config={config}
        progress={progress}
        width={width}
        height={height}
        scale={scale}
      />
    </div>
  );
};
