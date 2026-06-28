import { Config } from "@remotion/cli/config";

// Adding this config file moved the Remotion root to the package dir, so the public
// folder must be pointed at remotion/public (where geo/world.geojson lives and is
// fetched via staticFile at render time). Without this the fetch 404s and the map
// renders blank. Path is relative to this config file (the Remotion root).
Config.setPublicDir("remotion/public");

// Add JSON loader for .geojson files (webpack 5 built-in JSON parser only covers .json)
Config.overrideWebpackConfig((config) => {
  return {
    ...config,
    module: {
      ...config.module,
      rules: [
        ...(config.module?.rules ?? []),
        {
          test: /\.geojson$/,
          type: "json",
        },
      ],
    },
  };
});
