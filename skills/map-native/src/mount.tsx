import React from "react";
import { createRoot } from "react-dom/client";
import { ChoroplethMap, type ChoroplethConfig } from "./ChoroplethMap";
import { SymbolMap, type SymbolConfig } from "./SymbolMap";
import { RouteMap, type RouteConfig } from "./RouteMap";
import { LocatorMap } from "./LocatorMap";
import { DotDensityMap } from "./DotDensityMap";
import type {
  LocatorConfigShape,
  DotDensityConfigShape,
} from "./validate-config";
import sampleChoropleth from "../assets/sample-data/choropleth.json";

type AnyConfig =
  | ChoroplethConfig
  | SymbolConfig
  | RouteConfig
  | LocatorConfigShape
  | DotDensityConfigShape;

declare const __CONFIG__: AnyConfig | null;
declare const __INTERACTIVE__: boolean;

const config: AnyConfig =
  typeof __CONFIG__ !== "undefined" && __CONFIG__ !== null
    ? __CONFIG__
    : (sampleChoropleth as ChoroplethConfig);

const interactive =
  typeof __INTERACTIVE__ !== "undefined" ? __INTERACTIVE__ : true;

const root = document.getElementById("root");
if (!root) throw new Error("no #root element");

const configType = (config as { type?: string }).type;
const isSymbol = configType === "symbol";
const isRoute = configType === "route";
const isLocator = configType === "locator";
const isDotDensity = configType === "dot-density";

createRoot(root).render(
  <div style={{ width: "100vw", height: "100vh" }}>
    {isDotDensity ? (
      <DotDensityMap
        config={config as DotDensityConfigShape}
        progress={1}
        interactive={interactive}
      />
    ) : isLocator ? (
      <LocatorMap
        config={config as LocatorConfigShape}
        interactive={interactive}
      />
    ) : isRoute ? (
      <RouteMap config={config as RouteConfig} interactive={interactive} />
    ) : isSymbol ? (
      <SymbolMap
        config={config as SymbolConfig}
        progress={1}
        interactive={interactive}
      />
    ) : (
      <ChoroplethMap
        config={config as ChoroplethConfig}
        progress={1}
        interactive={interactive}
      />
    )}
  </div>,
);
