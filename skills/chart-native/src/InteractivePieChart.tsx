// Thin pie-specific binding over the generic core/InteractiveChart wrapper.
import { PieChart, type PieConfig } from "./PieChart";
import { InteractiveChart, type AnimateOn } from "./core/InteractiveChart";

export interface InteractivePieChartProps {
  config: PieConfig;
  animateOn?: AnimateOn;
  durationMs?: number;
  height?: number;
  minWidth?: number;
}

export function InteractivePieChart({
  config,
  animateOn = "scroll",
  durationMs = 2000,
  height = 460,
  minWidth = 280,
}: InteractivePieChartProps) {
  return (
    <InteractiveChart
      animateOn={animateOn}
      durationMs={durationMs}
      minWidth={minWidth}
      render={(width, progress) => (
        <PieChart
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
