// Thin connected-scatter binding over the generic core/InteractiveChart wrapper.
import {
  ConnectedScatterChart,
  type ConnectedScatterConfig,
} from "./ConnectedScatterChart";
import { InteractiveChart, type AnimateOn } from "./core/InteractiveChart";

export interface InteractiveConnectedScatterChartProps {
  config: ConnectedScatterConfig;
  animateOn?: AnimateOn;
  durationMs?: number;
  height?: number;
  minWidth?: number;
}

export function InteractiveConnectedScatterChart({
  config,
  animateOn = "scroll",
  durationMs = 2000,
  height = 480,
  minWidth = 280,
}: InteractiveConnectedScatterChartProps) {
  return (
    <InteractiveChart
      animateOn={animateOn}
      durationMs={durationMs}
      minWidth={minWidth}
      render={(width, progress) => (
        <ConnectedScatterChart
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
