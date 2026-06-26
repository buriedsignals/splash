// Thin waffle-specific binding over the generic core/InteractiveChart wrapper.
import { WaffleChart, type WaffleConfig } from "./WaffleChart";
import { InteractiveChart, type AnimateOn } from "./core/InteractiveChart";

export interface InteractiveWaffleChartProps {
  config: WaffleConfig;
  animateOn?: AnimateOn;
  durationMs?: number;
  height?: number;
  minWidth?: number;
}

export function InteractiveWaffleChart({
  config,
  animateOn = "scroll",
  durationMs = 2000,
  height = 480,
  minWidth = 280,
}: InteractiveWaffleChartProps) {
  return (
    <InteractiveChart
      animateOn={animateOn}
      durationMs={durationMs}
      minWidth={minWidth}
      render={(width, progress) => (
        <WaffleChart
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
