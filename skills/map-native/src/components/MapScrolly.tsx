import React from "react";
import { ChoroplethScrolly } from "./ChoroplethScrolly";
import { SymbolScrolly } from "./SymbolScrolly";
import { RouteScrolly } from "./RouteScrolly";
import { LocatorScrolly } from "./LocatorScrolly";

export const MapScrolly: React.FC<{ config: any }> = ({ config }) => {
  if (config?.type === "symbol") return <SymbolScrolly config={config} />;
  if (config?.type === "route") return <RouteScrolly config={config} />;
  if (config?.type === "locator") return <LocatorScrolly config={config} />;
  return <ChoroplethScrolly config={config} />;
};
