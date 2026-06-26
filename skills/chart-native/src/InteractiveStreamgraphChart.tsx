// Thin streamgraph-specific binding over the generic core/InteractiveChart wrapper.
import { StreamgraphChart, type StreamgraphConfig } from "./StreamgraphChart";
import { InteractiveChart, type AnimateOn } from "./core/InteractiveChart";

export interface InteractiveStreamgraphChartProps {
  config: StreamgraphConfig;
  animateOn?: AnimateOn;
  durationMs?: number;
  height?: number;
  minWidth?: number;
}

export function InteractiveStreamgraphChart({
  config,
  animateOn = "scroll",
  durationMs = 2200,
  height = 480,
  minWidth = 300,
}: InteractiveStreamgraphChartProps) {
  return (
    <InteractiveChart
      animateOn={animateOn}
      durationMs={durationMs}
      minWidth={minWidth}
      render={(width, progress) => (
        <StreamgraphChart
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
