// The entry marker the EXPORT "code source" generator (skills/splash/scripts/bundle-source.mjs)
// reads to build a runnable bundle. Mirrors chart-native's native-source.json but engine-tagged.
export function mapSourceManifest(config: { type?: string }): {
  engine: "map-native";
  type: string;
} {
  // choropleth is this producer's implicit default type (see the conformance guard).
  return { engine: "map-native", type: config.type ?? "choropleth" };
}
