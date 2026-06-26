// Thin parallel-specific binding over the generic core/InteractiveChart wrapper.
import { ParallelChart, type ParallelConfig } from "./ParallelChart";
import { InteractiveChart, type AnimateOn } from "./core/InteractiveChart";

export interface InteractiveParallelChartProps {
  config: ParallelConfig;
  animateOn?: AnimateOn;
  durationMs?: number;
  height?: number;
  minWidth?: number;
}

export function InteractiveParallelChart({
  config,
  animateOn = "scroll",
  durationMs = 2000,
  height = 480,
  minWidth = 320,
}: InteractiveParallelChartProps) {
  return (
    <InteractiveChart
      animateOn={animateOn}
      durationMs={durationMs}
      minWidth={minWidth}
      render={(width, progress) => (
        <ParallelChart
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
