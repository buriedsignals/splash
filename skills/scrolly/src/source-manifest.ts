// Entry marker for the EXPORT "code source" generator (bundle-source.mjs). A scrolly is
// multi-visual, so it records the host kind (chart | map | image) rather than a single type.
export function scrollySourceManifest(config: {
  nativeType?: string;
  type?: string;
  visual?: string;
}): { engine: "scrolly"; kind: "map" | "chart" | "image" } {
  const kind =
    config.visual === "image"
      ? "image"
      : "nativeType" in config && config.nativeType != null
        ? "chart"
        : "map";
  return { engine: "scrolly", kind };
}
