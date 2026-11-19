// MapTiler's own label layers as DATA, for the card images baked under the live map. The live drive
// (`locator-drive.mjs`, inlined into the page) filters and fades these layers itself; the bake cannot run the drive,
// so it replays this list instead. `test/locator-scrolly-native-labels-bake.test.ts` holds the two to the same map
// state, so neither can drift from the other.
//
//   setup     ["filter", id, expr] | ["paint", id, property, value] | ["layout", id, property, value] | ["zoomRange", id, min, max]
//   bindings  [id, property, { $state }] — bound to the card's state, like a plan layer's `bindings`

const PLACE_LAYERS = ["City labels", "Town labels", "Village labels", "Place labels", "State labels"];
const WATER_LAYERS = ["Sea labels", "Ocean labels", "Lakeline labels"];

// The same class scopes as the drive's CLASS_SCOPE (modern expression syntax; see the drive for why).
const CLASS_SCOPE = {
  "City labels": ["all", ["==", ["get", "class"], "city"], ["has", "rank"]],
  "Town labels": ["==", ["get", "class"], "town"],
  "Village labels": ["==", ["get", "class"], "village"],
  "Place labels": ["!", ["in", ["get", "class"], ["literal", ["city", "continent", "country", "province", "state", "town", "village", "place"]]]],
  "State labels": ["all", ["==", ["get", "class"], "state"], ["==", ["get", "rank"], 1]],
};

/** The set-up and the per-card bindings of the native label layers this beat names. */
export function nativeLabelOps(native) {
  const field = ["coalesce", ["get", `name:${native.lang ?? "en"}`], ["get", "name:latin"], ["get", "name"]];
  const setup = ["Country labels", ...PLACE_LAYERS, ...WATER_LAYERS].map((id) => ["layout", id, "text-field", field]);
  setup.push(
    ["filter", "Country labels", ["all", ["==", ["get", "class"], "country"], ["has", "iso_a2"], ["in", ["get", "iso_a2"], ["literal", native.countryCodes]]]],
    ["paint", "Country labels", "text-color", native.countryColor],
    ["paint", "Country labels", "text-halo-color", native.landHalo],
  );
  const named = (key) => ["in", ["coalesce", ["get", key], ""], ["literal", native.placeNames]];
  const placeFilter = ["any", named("name:latin"), named("name"), named("name:en"), named(`name:${native.lang ?? "en"}`)];
  for (const id of PLACE_LAYERS)
    setup.push(
      ["filter", id, ["all", CLASS_SCOPE[id], placeFilter]],
      ["zoomRange", id, 0, 24],
      ["layout", id, "text-anchor", "left"],
      ["layout", id, "text-offset", [0.6, 0]],
      ["paint", id, "text-color", native.placeColor],
      ["paint", id, "text-halo-color", native.landHalo],
    );
  const waterFilter = ["in", ["get", "name"], ["literal", native.waterNames]];
  setup.push(
    ["filter", "Sea labels", ["all", ["==", ["get", "class"], "sea"], ["has", "name"], waterFilter]],
    ["filter", "Ocean labels", ["all", ["==", ["get", "class"], "ocean"], ["has", "name"], waterFilter]],
    ["filter", "Lakeline labels", ["all", ["has", "name"], waterFilter]],
  );
  for (const id of WATER_LAYERS) setup.push(["paint", id, "text-color", native.waterColor]);
  const bindings = ["Country labels", ...PLACE_LAYERS, ...WATER_LAYERS].map((id) => [id, "text-opacity", { $state: "places" }]);
  return { setup, bindings };
}
