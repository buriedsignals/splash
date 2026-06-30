import * as maptilersdk from "@maptiler/sdk";

/** Minimal IControl that resets the map to the initial data bounds. */
export function makeResetControl(
  dataBounds: [number, number, number, number],
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
      btn.setAttribute("aria-label", "Reset map view");
      btn.textContent = "⌂";
      btn.style.cssText =
        "width:29px;height:29px;font-size:16px;cursor:pointer;background:#fff;border:none;border-radius:4px;display:flex;align-items:center;justify-content:center;line-height:1;";
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
