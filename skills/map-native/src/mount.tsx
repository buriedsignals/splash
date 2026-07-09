import React from "react";
import { createRoot } from "react-dom/client";
import { ChoroplethMap, type ChoroplethConfig } from "./ChoroplethMap";
import { SymbolMap, type SymbolConfig } from "./SymbolMap";
import { wantsStaticFallbackLabels } from "./symbol-labels";
import { RouteMap, type RouteConfig } from "./RouteMap";
import { LocatorMap } from "./LocatorMap";
import { DotDensityMap } from "./DotDensityMap";
import { HexGridMap } from "./HexGridMap";
import { CartogramMap } from "./CartogramMap";
import type {
  LocatorConfigShape,
  DotDensityConfigShape,
  HexGridConfigShape,
  CartogramConfigShape,
} from "./validate-config";
import sampleChoropleth from "../assets/sample-data/choropleth.json";

type AnyConfig =
  | ChoroplethConfig
  | SymbolConfig
  | RouteConfig
  | LocatorConfigShape
  | DotDensityConfigShape
  | HexGridConfigShape
  | CartogramConfigShape;

declare const __CONFIG__: AnyConfig | null;
declare const __INTERACTIVE__: boolean;

const config: AnyConfig =
  typeof __CONFIG__ !== "undefined" && __CONFIG__ !== null
    ? __CONFIG__
    : (sampleChoropleth as ChoroplethConfig);

const interactive =
  typeof __INTERACTIVE__ !== "undefined" ? __INTERACTIVE__ : true;

// The a11y-fallback snapshot of an interactive build appends `?staticLabels=1`, asking the
// symbol map to render its direct labels (the no-JS fallback has no hover). A real reader
// never sets this, so the live interactive page stays hover-only. No-op for non-symbol types.
const staticFallbackLabels =
  typeof window !== "undefined" &&
  wantsStaticFallbackLabels(window.location.search);

const root = document.getElementById("root");
if (!root) throw new Error("no #root element");

const configType = (config as { type?: string }).type;
const isSymbol = configType === "symbol";
const isRoute = configType === "route";
const isLocator = configType === "locator";
const isDotDensity = configType === "dot-density";
const isHexGrid = configType === "hex-grid";
const isCartogram = configType === "cartogram";

createRoot(root).render(
  <div style={{ width: "100vw", height: "100vh" }}>
    {isCartogram ? (
      <CartogramMap
        config={config as CartogramConfigShape}
        progress={1}
        interactive={interactive}
      />
    ) : isHexGrid ? (
      <HexGridMap
        config={config as HexGridConfigShape}
        progress={1}
        interactive={interactive}
      />
    ) : isDotDensity ? (
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
        staticFallbackLabels={staticFallbackLabels}
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
