// Browser entry shared by the static and interactive builds, for either chart.
//  - __CHART__   : "line" | "bar"  (Vite define)
//  - __INTERACTIVE__ : static (fixed, progress=1) vs interactive (responsive +
//    intro reveal). Per-format reveal trigger via ANIMATE_ON.
import { createRoot } from "react-dom/client";
import { LineChart, type ChartConfig } from "./LineChart";
import { InteractiveLineChart, type AnimateOn } from "./InteractiveLineChart";
import { BarChart, type BarConfig } from "./BarChart";
import { InteractiveBarChart } from "./InteractiveBarChart";
import { ScatterChart, type ScatterConfig } from "./ScatterChart";
import { InteractiveScatterChart } from "./InteractiveScatterChart";
import lineSample from "../assets/sample-data/series.json";
import barSample from "../assets/sample-data/bars.json";
import scatterSample from "../assets/sample-data/scatter.json";

declare const __INTERACTIVE__: boolean;
declare const __CHART__: string;
const interactive =
  typeof __INTERACTIVE__ !== "undefined" ? __INTERACTIVE__ : false;
const chart = typeof __CHART__ !== "undefined" ? __CHART__ : "line";

const ANIMATE_ON: AnimateOn = "scroll";
const el = document.getElementById("root")!;
const root = createRoot(el);

if (chart === "scatter") {
  const config = scatterSample as unknown as ScatterConfig;
  root.render(
    interactive ? (
      <InteractiveScatterChart config={config} animateOn={ANIMATE_ON} />
    ) : (
      <ScatterChart config={config} progress={1} width={840} height={480} />
    ),
  );
} else if (chart === "bar") {
  const config = barSample as unknown as BarConfig;
  root.render(
    interactive ? (
      <InteractiveBarChart config={config} animateOn={ANIMATE_ON} />
    ) : (
      <BarChart config={config} progress={1} width={840} height={460} />
    ),
  );
} else {
  const config = lineSample as unknown as ChartConfig;
  root.render(
    interactive ? (
      <InteractiveLineChart config={config} animateOn={ANIMATE_ON} />
    ) : (
      <LineChart config={config} progress={1} width={840} height={480} />
    ),
  );
}
