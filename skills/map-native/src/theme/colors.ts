// Framework-neutral basemap colours, shared by the interactive component
// (ChoroplethMap) and the video component (ChoroplethStory). Kept in their own
// module with NO MapTiler / Vite `?raw` imports so the Remotion/webpack bundle can
// import them without dragging in Vite-only syntax.

// No-data regions: a distinct mid grey — darker than the light land basemap (so
// "no data" reads as present-but-unknown), clearly not the water blue.
export const NO_DATA_COLOR = "#b9b9b9";

// Water/ocean: a blue tint (cartographic convention — water is never grey).
export const WATER_COLOR = "#cfe3f1";
