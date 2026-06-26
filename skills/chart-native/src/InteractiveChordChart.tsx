// Thin chord-specific binding over the generic core/InteractiveChart wrapper.
import { ChordChart, type ChordConfig } from "./ChordChart";
import { InteractiveChart, type AnimateOn } from "./core/InteractiveChart";

export interface InteractiveChordChartProps {
  config: ChordConfig;
  animateOn?: AnimateOn;
  durationMs?: number;
  height?: number;
  minWidth?: number;
}

export function InteractiveChordChart({
  config,
  animateOn = "scroll",
  durationMs = 2200,
  height = 480,
  minWidth = 300,
}: InteractiveChordChartProps) {
  return (
    <InteractiveChart
      animateOn={animateOn}
      durationMs={durationMs}
      minWidth={minWidth}
      render={(width, progress) => (
        <ChordChart
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
