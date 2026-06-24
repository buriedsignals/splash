// Browser entry shared by the static and interactive builds. The build sets
// __INTERACTIVE__ via Vite define:
//  - static      : the fixed-size LineChart at progress=1 (final frame) → PNG.
//  - interactive : the responsive wrapper (ResizeObserver re-layout + intro
//                  reveal), so it fills its container and animates 0→1.
import { createRoot } from "react-dom/client";
import { LineChart, type ChartConfig } from "./LineChart";
import { InteractiveLineChart, type AnimateOn } from "./InteractiveLineChart";
import sample from "../assets/sample-data/series.json";

declare const __INTERACTIVE__: boolean;
const interactive =
  typeof __INTERACTIVE__ !== "undefined" ? __INTERACTIVE__ : false;

// Per-format knob: when the reveal plays in the interactive embed.
// "scroll" = on first viewport entry (article use); "load" = on open; "none" = off.
const ANIMATE_ON: AnimateOn = "scroll";

const config = sample as unknown as ChartConfig;
const el = document.getElementById("root")!;

createRoot(el).render(
  interactive ? (
    <InteractiveLineChart config={config} animateOn={ANIMATE_ON} />
  ) : (
    <LineChart config={config} progress={1} width={840} height={480} />
  ),
);
