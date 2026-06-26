// Thin calendar-specific binding over the generic core/InteractiveChart wrapper.
import { CalendarChart, type CalendarConfig } from "./CalendarChart";
import { InteractiveChart, type AnimateOn } from "./core/InteractiveChart";

export interface InteractiveCalendarChartProps {
  config: CalendarConfig;
  animateOn?: AnimateOn;
  durationMs?: number;
  height?: number;
  minWidth?: number;
}

export function InteractiveCalendarChart({
  config,
  animateOn = "scroll",
  durationMs = 2200,
  height = 360,
  minWidth = 320,
}: InteractiveCalendarChartProps) {
  return (
    <InteractiveChart
      animateOn={animateOn}
      durationMs={durationMs}
      minWidth={minWidth}
      render={(width, progress) => (
        <CalendarChart
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
