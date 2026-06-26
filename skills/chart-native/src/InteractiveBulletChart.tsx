// Thin bullet-specific binding over the generic core/InteractiveChart wrapper.
import { BulletChart, type BulletConfig } from "./BulletChart";
import { InteractiveChart, type AnimateOn } from "./core/InteractiveChart";

export interface InteractiveBulletChartProps {
  config: BulletConfig;
  animateOn?: AnimateOn;
  durationMs?: number;
  height?: number;
  minWidth?: number;
}

export function InteractiveBulletChart({
  config,
  animateOn = "scroll",
  durationMs = 2000,
  height = 480,
  minWidth = 280,
}: InteractiveBulletChartProps) {
  return (
    <InteractiveChart
      animateOn={animateOn}
      durationMs={durationMs}
      minWidth={minWidth}
      render={(width, progress) => (
        <BulletChart
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
