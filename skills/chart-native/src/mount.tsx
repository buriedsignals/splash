// Browser entry shared by the static and interactive builds. The build sets
// __INTERACTIVE__ via Vite define; otherwise both mount the SAME LineChart at
// progress=1 (the final frame).
import { createRoot } from "react-dom/client";
import { LineChart, type ChartConfig } from "./LineChart";
import sample from "../assets/sample-data/series.json";

declare const __INTERACTIVE__: boolean;
const interactive =
  typeof __INTERACTIVE__ !== "undefined" ? __INTERACTIVE__ : false;

const config = sample as unknown as ChartConfig;

const el = document.getElementById("root")!;
createRoot(el).render(
  <LineChart config={config} progress={1} interactive={interactive} />,
);
