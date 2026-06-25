// Thin dumbbell-specific binding over the generic core/InteractiveChart wrapper.
import { DumbbellChart, type DumbbellConfig } from "./DumbbellChart";
import { InteractiveChart, type AnimateOn } from "./core/InteractiveChart";

export interface InteractiveDumbbellChartProps {
  config: DumbbellConfig;
  animateOn?: AnimateOn;
  durationMs?: number;
  height?: number;
  minWidth?: number;
}

export function InteractiveDumbbellChart({
  config,
  animateOn = "scroll",
  durationMs = 2000,
  height = 480,
  minWidth = 280,
}: InteractiveDumbbellChartProps) {
  return (
    <InteractiveChart
      animateOn={animateOn}
      durationMs={durationMs}
      minWidth={minWidth}
      render={(width, progress) => (
        <DumbbellChart
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
