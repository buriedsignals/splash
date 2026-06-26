// Thin waterfall-specific binding over the generic core/InteractiveChart wrapper.
import { WaterfallChart, type WaterfallConfig } from "./WaterfallChart";
import { InteractiveChart, type AnimateOn } from "./core/InteractiveChart";

export interface InteractiveWaterfallChartProps {
  config: WaterfallConfig;
  animateOn?: AnimateOn;
  durationMs?: number;
  height?: number;
  minWidth?: number;
}

export function InteractiveWaterfallChart({
  config,
  animateOn = "scroll",
  durationMs = 2000,
  height = 480,
  minWidth = 280,
}: InteractiveWaterfallChartProps) {
  return (
    <InteractiveChart
      animateOn={animateOn}
      durationMs={durationMs}
      minWidth={minWidth}
      render={(width, progress) => (
        <WaterfallChart
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
