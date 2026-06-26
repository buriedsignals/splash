// Thin gantt-specific binding over the generic core/InteractiveChart wrapper.
import { GanttChart, type GanttConfig } from "./GanttChart";
import { InteractiveChart, type AnimateOn } from "./core/InteractiveChart";

export interface InteractiveGanttChartProps {
  config: GanttConfig;
  animateOn?: AnimateOn;
  durationMs?: number;
  height?: number;
  minWidth?: number;
}

export function InteractiveGanttChart({
  config,
  animateOn = "scroll",
  durationMs = 2000,
  height = 480,
  minWidth = 300,
}: InteractiveGanttChartProps) {
  return (
    <InteractiveChart
      animateOn={animateOn}
      durationMs={durationMs}
      minWidth={minWidth}
      render={(width, progress) => (
        <GanttChart
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
