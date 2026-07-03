// Shared basemap treatment for all cartogram components (CartogramMap, scrolly driver, video scene).
// grid variant: hide all basemap layers, set a neutral flat background so cells render on a clean canvas.
// scaled variant: keep the real basemap but strip symbol/label clutter.
import * as maptilersdk from "@maptiler/sdk";

export function applyCartogramBasemap(
  map: maptilersdk.Map,
  dark: boolean,
  variant: "scaled" | "grid",
): void {
  if (variant === "grid") {
    // Abstract tile-grid — hide all basemap layers so cells render on a flat neutral canvas.
    // Symbol layers are removed; every remaining basemap layer is hidden. A neutral background
    // is set via the style's "background" layer or injected as a new one if absent.
    const neutralBg = dark ? "#1b1d21" : "#f2f3f5";
    const baseLayers = map.getStyle()?.layers ?? [];
    for (const layer of baseLayers) {
      if (layer.type === "symbol") {
        map.removeLayer(layer.id);
      } else if (layer.id === "background") {
        map.setPaintProperty("background", "background-color", neutralBg);
      } else {
        map.setLayoutProperty(layer.id, "visibility", "none");
      }
    }
    // If no "background" layer existed, add one at the very bottom.
    if (!baseLayers.some((l) => l.id === "background")) {
      map.addLayer(
        {
          id: "neutral-background",
          type: "background",
          paint: { "background-color": neutralBg },
        },
        // Insert before the first existing layer (bottom of stack).
        baseLayers[0]?.id,
      );
    }
  } else {
    // Scaled variant: keep the real basemap — only strip symbol/label clutter.
    const baseLayers = map.getStyle()?.layers ?? [];
    for (const layer of baseLayers) {
      if (layer.type === "symbol") map.removeLayer(layer.id);
    }
  }
}
