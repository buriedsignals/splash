// Remotion composition wrapping the SAME GanttChart. Linear master timeline (the
// grow-from-start ease in the component); short blank lead-in + end hold. Frame N
// is a pure function of the frame.
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { GanttChart, type GanttConfig } from "../../src/GanttChart";
import sample from "../../assets/sample-data/gantt.json";

const sampleConfig = sample as unknown as GanttConfig;

const HOLD_IN = 0.02;
const HOLD_OUT = 0.12;

export const GanttReveal: React.FC<{ scale?: number; config?: GanttConfig }> = ({ scale = 1, config = sampleConfig }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const t = frame / (durationInFrames - 1);
  const progress = interpolate(t, [HOLD_IN, 1 - HOLD_OUT], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div style={{ width, height, background: "#FFFFFF" }}>
      <GanttChart
        config={config}
        progress={progress}
        width={width}
        height={height}
        scale={scale}
      />
    </div>
  );
};
