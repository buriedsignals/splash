import * as maptilersdk from "@maptiler/sdk";
import { storyCopy } from "../../../lib/core/story-copy";

// Set a free-pan maxBounds envelope, but ONLY when it is a real sub-global box. On a
// wide/short viewport the map view can WRAP, so getBounds() returns UNWRAPPED longitudes
// (e.g. east 307.9 = -52 + 360); building a maxBounds from that yields a >360°-wide box
// which MapLibre mishandles — it pins the map to a zoomed-in wrong-hemisphere corner
// (observed: zoom 7.6 centred in the Atlantic for a Pacific dataset, F12). A near-global
// envelope constrains nothing anyway, so in that case leave the map unbounded. Shared by
// every <Type>Map so no sibling type can reintroduce the bug.
export function safeSetMaxBounds(
  map: maptilersdk.Map,
  sw: [number, number],
  ne: [number, number],
): void {
  if (ne[0] - sw[0] < 355 && ne[1] - sw[1] < 175) map.setMaxBounds([sw, ne]);
}

/** Minimal IControl that resets the map to the initial data bounds. */
export function makeResetControl(
  dataBounds: [number, number, number, number],
  options: { dark?: boolean; lang?: string } = {},
): maptilersdk.IControl {
  let _map: maptilersdk.Map | null = null;
  let _btn: HTMLButtonElement | null = null;

  return {
    onAdd(map: maptilersdk.Map): HTMLElement {
      _map = map;
      const container = document.createElement("div");
      container.className = "maplibregl-ctrl maplibregl-ctrl-group";

      const btn = document.createElement("button");
      btn.type = "button";
      // The one piece of map CHROME with a name of its own. English here shipped into every
      // non-English interactive map — a screen reader announced "Reset map view" on a French
      // page whose every other word came from the locale table.
      btn.setAttribute("aria-label", storyCopy(options.lang).resetMapView);
      btn.textContent = "⌂";
      const bg = options.dark ? "rgba(28,28,31,0.92)" : "#fff";
      const color = options.dark ? "#f4f4f5" : "#333";
      btn.style.cssText = `width:29px;height:29px;font-size:16px;cursor:pointer;background:${bg};color:${color};border:none;border-radius:4px;display:flex;align-items:center;justify-content:center;line-height:1;`;
      btn.addEventListener("click", () => {
        _map?.fitBounds(dataBounds, { padding: 48, duration: 600 });
      });
      _btn = btn;

      container.appendChild(btn);
      return container;
    },
    onRemove(): void {
      _btn?.remove();
      _btn = null;
      _map = null;
    },
  };
}
