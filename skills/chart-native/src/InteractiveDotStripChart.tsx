// Thin dot-strip-specific binding over the generic core/InteractiveChart wrapper.
import { DotStripChart, type DotStripConfig } from "./DotStripChart";
import { InteractiveChart, type AnimateOn } from "./core/InteractiveChart";

export interface InteractiveDotStripChartProps {
  config: DotStripConfig;
  animateOn?: AnimateOn;
  durationMs?: number;
  height?: number;
  minWidth?: number;
}

export function InteractiveDotStripChart({
  config,
  animateOn = "scroll",
  durationMs = 2000,
  height = 480,
  minWidth = 280,
}: InteractiveDotStripChartProps) {
  return (
    <InteractiveChart
      animateOn={animateOn}
      durationMs={durationMs}
      minWidth={minWidth}
      render={(width, progress) => (
        <DotStripChart
          config={config}
          progress={progress}
          width={width}
          height={height}
          interactive
          responsive
        />
      )}
    />
  );
}
