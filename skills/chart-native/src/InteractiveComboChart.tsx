// Thin combo-specific binding over the generic core/InteractiveChart wrapper.
import { ComboChart, type ComboConfig } from "./ComboChart";
import { InteractiveChart, type AnimateOn } from "./core/InteractiveChart";

export interface InteractiveComboChartProps {
  config: ComboConfig;
  animateOn?: AnimateOn;
  durationMs?: number;
  height?: number;
  minWidth?: number;
}

export function InteractiveComboChart({
  config,
  animateOn = "scroll",
  durationMs = 2000,
  height = 480,
  minWidth = 280,
}: InteractiveComboChartProps) {
  return (
    <InteractiveChart
      animateOn={animateOn}
      durationMs={durationMs}
      minWidth={minWidth}
      render={(width, progress) => (
        <ComboChart
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
