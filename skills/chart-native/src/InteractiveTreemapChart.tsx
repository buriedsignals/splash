// Thin treemap-specific binding over the generic core/InteractiveChart wrapper.
import { TreemapChart, type TreemapConfig } from "./TreemapChart";
import { InteractiveChart, type AnimateOn } from "./core/InteractiveChart";

export interface InteractiveTreemapChartProps {
  config: TreemapConfig;
  animateOn?: AnimateOn;
  durationMs?: number;
  height?: number;
  minWidth?: number;
}

export function InteractiveTreemapChart({
  config,
  animateOn = "scroll",
  durationMs = 2000,
  height = 480,
  minWidth = 280,
}: InteractiveTreemapChartProps) {
  return (
    <InteractiveChart
      animateOn={animateOn}
      durationMs={durationMs}
      minWidth={minWidth}
      render={(width, progress) => (
        <TreemapChart
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
