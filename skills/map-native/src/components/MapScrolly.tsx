import React from "react";
import { ChoroplethScrolly } from "./ChoroplethScrolly";
import { SymbolScrolly } from "./SymbolScrolly";
import { RouteScrolly } from "./RouteScrolly";
import { LocatorScrolly } from "./LocatorScrolly";
import { DotDensityScrolly } from "./DotDensityScrolly";
import { HexGridScrolly } from "./HexGridScrolly";
import { CartogramScrolly } from "./CartogramScrolly";

export const MapScrolly: React.FC<{ config: any }> = ({ config }) => {
  if (config?.type === "symbol") return <SymbolScrolly config={config} />;
  if (config?.type === "route") return <RouteScrolly config={config} />;
  if (config?.type === "locator") return <LocatorScrolly config={config} />;
  if (config?.type === "dot-density")
    return <DotDensityScrolly config={config} />;
  if (config?.type === "hex-grid") return <HexGridScrolly config={config} />;
  if (config?.type === "cartogram") return <CartogramScrolly config={config} />;
  return <ChoroplethScrolly config={config} />;
};
