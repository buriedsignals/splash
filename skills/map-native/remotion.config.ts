import { Config } from "@remotion/cli/config";

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
