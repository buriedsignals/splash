// Remotion composition wrapping the SAME ComboChart. Linear master timeline (the
// grow-up + wipe-in eases live in the component); a short blank lead-in + an end
// hold on the complete chart. Frame N is a pure function of the frame.
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { ComboChart, type ComboConfig } from "../../src/ComboChart";
import sample from "../../assets/sample-data/combo.json";

const config = sample as unknown as ComboConfig;

const HOLD_IN = 0.02;
const HOLD_OUT = 0.12;

export const ComboReveal: React.FC<{ scale?: number }> = ({ scale = 1 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const t = frame / (durationInFrames - 1);
  const progress = interpolate(t, [HOLD_IN, 1 - HOLD_OUT], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div style={{ width, height, background: "#FFFFFF" }}>
      <ComboChart
        config={config}
        progress={progress}
        width={width}
        height={height}
        scale={scale}
      />
    </div>
  );
};
