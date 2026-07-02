import React from "react";
import { createRoot } from "react-dom/client";
import { Scrolly } from "./Scrolly";
import type { ScrollyMapConfig } from "./ScrollyMap";
import type { ScrollySymbolConfig } from "./ScrollySymbolMap";
import type { ScrollyHexConfig } from "./ScrollyHexMap";
// Fallback sample: reuse map-native's choropleth config (same shape). The build
// bakes the real config via the Vite `__CONFIG__` define; this is the dev default.
import sampleConfig from "../../map-native/assets/sample-data/choropleth.json";

declare const __CONFIG__:
  ScrollyMapConfig | ScrollySymbolConfig | ScrollyHexConfig | null;

const config: ScrollyMapConfig | ScrollySymbolConfig | ScrollyHexConfig =
  typeof __CONFIG__ !== "undefined" && __CONFIG__ !== null
    ? __CONFIG__
    : (sampleConfig as ScrollyMapConfig);

const root = document.getElementById("root");
if (!root) throw new Error("no #root element");

createRoot(root).render(<Scrolly config={config} />);
