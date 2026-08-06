// Remotion composition wrapping the SAME CalendarChart. Linear master timeline
// (the chronological wipe ease in the component); short blank lead-in + end hold.
// Frame N is a pure function of the frame.
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { CalendarChart, type CalendarConfig } from "../../src/CalendarChart";
import sample from "../../assets/sample-data/calendar.json";
import { RevealStage } from "./RevealStage";

const sampleConfig = sample as unknown as CalendarConfig;

const HOLD_IN = 0.02;
const HOLD_OUT = 0.12;

export const CalendarReveal: React.FC<{ scale?: number; config?: CalendarConfig }> = ({ scale = 1, config = sampleConfig }) => {
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
      nativeType="calendar"
    >
      <CalendarChart
        config={config}
        progress={progress}
        width={width}
        height={height}
        scale={scale}
      />
    </RevealStage>
  );
};
