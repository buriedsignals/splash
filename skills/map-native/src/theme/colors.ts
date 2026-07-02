// Framework-neutral theme colours, shared by all map formats. Kept in their own
// module with NO MapTiler / Vite `?raw` imports so the Remotion/webpack bundle can
// import them without dragging in Vite-only syntax.

// No-data regions: a distinct mid grey — darker than the default light basemap
// water (so "no data" land is clearly distinguishable from the ocean), and outside
// the data colour ramp (so absence is never mistaken for a low value).
export const NO_DATA_COLOR = "#b9b9b9";

// Water / ocean fill on the dataviz-light basemap. Used to recolour water layers
// so they match the interactive map treatment.
export const WATER_COLOR = "#aac9e0";
