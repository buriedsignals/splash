// Thin pictogram-specific binding over the generic core/InteractiveChart wrapper.
import { PictogramChart, type PictogramConfig } from "./PictogramChart";
import { InteractiveChart, type AnimateOn } from "./core/InteractiveChart";

export interface InteractivePictogramChartProps {
  config: PictogramConfig;
  animateOn?: AnimateOn;
  durationMs?: number;
  height?: number;
  minWidth?: number;
}

export function InteractivePictogramChart({
  config,
  animateOn = "scroll",
  durationMs = 2000,
  height = 480,
  minWidth = 280,
}: InteractivePictogramChartProps) {
  return (
    <InteractiveChart
      animateOn={animateOn}
      durationMs={durationMs}
      minWidth={minWidth}
      render={(width, progress) => (
        <PictogramChart
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
