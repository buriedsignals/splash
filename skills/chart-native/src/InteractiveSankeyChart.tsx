// Thin sankey-specific binding over the generic core/InteractiveChart wrapper.
import { SankeyChart, type SankeyConfig } from "./SankeyChart";
import { InteractiveChart, type AnimateOn } from "./core/InteractiveChart";

export interface InteractiveSankeyChartProps {
  config: SankeyConfig;
  animateOn?: AnimateOn;
  durationMs?: number;
  height?: number;
  minWidth?: number;
}

export function InteractiveSankeyChart({
  config,
  animateOn = "scroll",
  durationMs = 2200,
  height = 480,
  minWidth = 320,
}: InteractiveSankeyChartProps) {
  return (
    <InteractiveChart
      animateOn={animateOn}
      durationMs={durationMs}
      minWidth={minWidth}
      render={(width, progress) => (
        <SankeyChart
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
