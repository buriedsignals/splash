import React from "react";
import { createRoot } from "react-dom/client";
import { ChoroplethMap, type ChoroplethConfig } from "./ChoroplethMap";
import sampleConfig from "../assets/sample-data/choropleth.json";

declare const __CONFIG__: ChoroplethConfig | null;
declare const __INTERACTIVE__: boolean;

const config: ChoroplethConfig =
  typeof __CONFIG__ !== "undefined" && __CONFIG__ !== null
    ? __CONFIG__
    : (sampleConfig as ChoroplethConfig);

const interactive =
  typeof __INTERACTIVE__ !== "undefined" ? __INTERACTIVE__ : true;

const root = document.getElementById("root");
if (!root) throw new Error("no #root element");

createRoot(root).render(
  <div style={{ width: "100vw", height: "100vh" }}>
    <ChoroplethMap config={config} interactive={interactive} />
  </div>,
);
