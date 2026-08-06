// Remotion composition wrapping the SAME LollipopChart. Linear master timeline
// (each phase eases itself in the component); a short blank lead-in + an end hold.
// Frame N is a pure function of the frame — reproducible.
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { LollipopChart, type LollipopConfig } from "../../src/LollipopChart";
import sample from "../../assets/sample-data/lollipop.json";
import { RevealStage } from "./RevealStage";
import { steppedFrame } from "../../src/core/walk";

const sampleConfig = sample as unknown as LollipopConfig;

const HOLD_IN = 0.02;
const HOLD_OUT = 0.1;

export const LollipopReveal: React.FC<{ scale?: number; config?: LollipopConfig }> = ({ scale = 1, config = sampleConfig }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const t = frame / (durationInFrames - 1);
  const progress = interpolate(t, [HOLD_IN, 1 - HOLD_OUT], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // ★ A STEPPED VIDEO IS THE SCROLLY, IN TIME. The chart stands complete and each step
  // accents the subject its sentence is about — `ScrollyChart`'s own staging, with the
  // clock turning the pages. Null without a walk, so an un-storyboarded video is unchanged.
  const step = steppedFrame("lollipop", config, progress);

  return (
    <RevealStage
      config={config}
      progress={progress}
      width={width}
      height={height}
      scale={scale}
      nativeType="lollipop"
    >
      <LollipopChart
        config={step ? ({ ...config, ...step.accent } as typeof config) : config}
        progress={step ? step.chartProgress : progress}
        width={width}
        height={height}
        scale={scale}
      />
    </RevealStage>
  );
};
