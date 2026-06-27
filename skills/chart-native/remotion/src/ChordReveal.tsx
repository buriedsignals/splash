// Remotion composition wrapping the SAME ChordChart. Linear master timeline (the
// bloom-from-centre ease in the component); short blank lead-in + end hold. Frame
// N is a pure function of the frame.
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { ChordChart, type ChordConfig } from "../../src/ChordChart";
import sample from "../../assets/sample-data/chord.json";

const sampleConfig = sample as unknown as ChordConfig;

const HOLD_IN = 0.02;
const HOLD_OUT = 0.12;

export const ChordReveal: React.FC<{ scale?: number; config?: ChordConfig }> = ({ scale = 1, config = sampleConfig }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const t = frame / (durationInFrames - 1);
  const progress = interpolate(t, [HOLD_IN, 1 - HOLD_OUT], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div style={{ width, height, background: "#FFFFFF" }}>
      <ChordChart
        config={config}
        progress={progress}
        width={width}
        height={height}
        scale={scale}
      />
    </div>
  );
};
