import React from "react";
import { createRoot } from "react-dom/client";
import { Scrolly } from "./Scrolly";
import type { ScrollyMapConfig } from "./ScrollyMap";
import type { ScrollySymbolConfig } from "./ScrollySymbolMap";
import type { ScrollyHexConfig } from "./ScrollyHexMap";
import type { ScrollyDotDensityConfig } from "./ScrollyDotDensityMap";
import type { ScrollyLocatorConfig } from "./ScrollyLocatorMap";
import type { ScrollyCartogramConfig } from "./ScrollyCartogramMap";
import type { ChartScrollyConfig } from "./ScrollyChart";
import type { ImageScrollyConfig } from "./ScrollyImage";
// Fallback sample: reuse map-native's choropleth config (same shape). The build
// bakes the real config via the Vite `__CONFIG__` define; this is the dev default.
import sampleConfig from "../../map-native/assets/sample-data/choropleth.json";

declare const __CONFIG__:
  | ChartScrollyConfig
  | ScrollyMapConfig
  | ScrollySymbolConfig
  | ScrollyHexConfig
  | ScrollyDotDensityConfig
  | ScrollyLocatorConfig
  | ScrollyCartogramConfig
  | ImageScrollyConfig
  | null;

const config:
  | ChartScrollyConfig
  | ScrollyMapConfig
  | ScrollySymbolConfig
  | ScrollyHexConfig
  | ScrollyDotDensityConfig
  | ScrollyLocatorConfig
  | ScrollyCartogramConfig
  | ImageScrollyConfig =
  typeof __CONFIG__ !== "undefined" && __CONFIG__ !== null
    ? __CONFIG__
    : (sampleConfig as ScrollyMapConfig);

// Expose config type for the smoke harness — lets it assert the correct layer id
// without guessing from the HTML.
// Chart configs carry `nativeType` instead of `type`; expose `type` only when present.
(window as unknown as Record<string, unknown>).__config_type__ =
  "type" in config ? config.type : undefined;

const root = document.getElementById("root");
if (!root) throw new Error("no #root element");

createRoot(root).render(<Scrolly config={config} />);
