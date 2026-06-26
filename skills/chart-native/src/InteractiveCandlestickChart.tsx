// Thin candlestick-specific binding over the generic core/InteractiveChart wrapper.
import { CandlestickChart, type CandlestickConfig } from "./CandlestickChart";
import { InteractiveChart, type AnimateOn } from "./core/InteractiveChart";

export interface InteractiveCandlestickChartProps {
  config: CandlestickConfig;
  animateOn?: AnimateOn;
  durationMs?: number;
  height?: number;
  minWidth?: number;
}

export function InteractiveCandlestickChart({
  config,
  animateOn = "scroll",
  durationMs = 2000,
  height = 480,
  minWidth = 300,
}: InteractiveCandlestickChartProps) {
  return (
    <InteractiveChart
      animateOn={animateOn}
      durationMs={durationMs}
      minWidth={minWidth}
      render={(width, progress) => (
        <CandlestickChart
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
