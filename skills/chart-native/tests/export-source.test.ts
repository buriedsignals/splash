import { describe, it, expect } from "bun:test";
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  writeFileSync,
  existsSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  interactiveRegistryKeys,
  bundlePackageJson,
  bundleMainTsx,
  bundleIndexHtml,
} from "../scripts/export-source.mjs";

describe("interactiveRegistryKeys", () => {
  it("parses both bare and quoted keys from an INTERACTIVE_REGISTRY block", () => {
    const src = `
export const INTERACTIVE_REGISTRY: Record<string, any> = {
  bar: InteractiveBarChart,
  "stacked-area": InteractiveStackedAreaChart,
  "diverging-stacked": InteractiveDivergingStackedChart,
};
`;
    const keys = interactiveRegistryKeys(src);
    expect(keys).toContain("bar");
    expect(keys).toContain("stacked-area");
    expect(keys).toContain("diverging-stacked");
  });
});

describe("bundlePackageJson", () => {
  const versions = {
    react: "19.2.7",
    "react-dom": "19.2.7",
    "d3-array": "3.2.4",
    "d3-chord": "3.0.1",
    "d3-scale": "4.0.2",
    "d3-shape": "3.2.0",
    "d3-time-format": "4.1.0",
    "@types/react": "19.2.17",
    "@types/react-dom": "19.2.3",
    "@types/d3-array": "3.2.2",
    "@types/d3-chord": "3.0.6",
    "@types/d3-scale": "4.0.9",
    "@types/d3-shape": "3.1.8",
    "@types/d3-time-format": "4.0.3",
    "@vitejs/plugin-react": "6.0.3",
    vite: "8.1.0",
    "vite-plugin-singlefile": "2.3.3",
    typescript: "6.0.3",
  };
  it("emits interactive deps with the chart-native versions and NO remotion", () => {
    const pkg = JSON.parse(bundlePackageJson("mychart", versions));
    expect(pkg.name).toBe("mychart-source");
    expect(pkg.dependencies.react).toBe("19.2.7");
    expect(pkg.dependencies["d3-shape"]).toBe("3.2.0");
    expect(pkg.devDependencies.vite).toBe("8.1.0");
    expect(pkg.scripts.build).toBe("vite build");
    // Video-only deps must NOT be pulled into the interactive bundle.
    expect(JSON.stringify(pkg)).not.toContain("remotion");
  });
  it("throws when a required version is missing (so the bundle never ships broken)", () => {
    expect(() => bundlePackageJson("x", { react: "19.2.7" })).toThrow(
      /no version for/,
    );
  });
});

describe("bundleMainTsx", () => {
  it("bakes the chart type and imports config.json + the interactive registry statically", () => {
    const main = bundleMainTsx("bar");
    expect(main).toContain('const CHART_TYPE = "bar"');
    expect(main).toContain('import config from "./config.json"');
    expect(main).toContain(
      'import { INTERACTIVE_REGISTRY } from "./src/component-registry"',
    );
  });
});

describe("bundleIndexHtml", () => {
  it("references /main.tsx and strips angle brackets from the injected title", () => {
    const html = bundleIndexHtml("Wages <b>rise</b>");
    expect(html).toContain('src="/main.tsx"');
    expect(html).toContain("Wages brise");
    expect(html).not.toContain("<b>");
  });
});

describe("export-source CLI — full bundle assembly", () => {
  const scriptPath = join(
    import.meta.dir,
    "..",
    "scripts",
    "export-source.mjs",
  );

  it("assembles a self-contained runnable Vite bundle (src copy + config + entry + package)", () => {
    const work = mkdtempSync(join(tmpdir(), "export-source-cli-"));
    const configPath = join(work, "config.json");
    writeFileSync(
      configPath,
      JSON.stringify({ title: "Power mix", rows: [{ x: "A", y: 1 }] }),
    );
    const dest = join(work, "power-mix-source");
    try {
      const out = execFileSync("bun", [scriptPath, "bar", configPath, dest], {
        encoding: "utf8",
      });
      expect(out).toContain("EXPORT_SOURCE_RESULT");
      // The five deliverable pieces the README promises.
      expect(existsSync(join(dest, "src", "component-registry.tsx"))).toBe(
        true,
      );
      expect(existsSync(join(dest, "config.json"))).toBe(true);
      expect(existsSync(join(dest, "package.json"))).toBe(true);
      expect(existsSync(join(dest, "index.html"))).toBe(true);
      expect(existsSync(join(dest, "main.tsx"))).toBe(true);
      expect(existsSync(join(dest, "README.md"))).toBe(true);
      expect(existsSync(join(dest, "vite.config.ts"))).toBe(true);
      expect(existsSync(join(dest, "tsconfig.json"))).toBe(true);
      // The producer's DOM entry (the only src file importing ../assets) is dropped.
      expect(existsSync(join(dest, "src", "mount.tsx"))).toBe(false);
      // The copied config is the chart's config, not a placeholder.
      const cfg = JSON.parse(readFileSync(join(dest, "config.json"), "utf8"));
      expect(cfg.title).toBe("Power mix");
      // package.json carries the interactive deps and the build script.
      const pkg = JSON.parse(readFileSync(join(dest, "package.json"), "utf8"));
      expect(pkg.dependencies.react).toBeDefined();
      expect(pkg.scripts.build).toBe("vite build");
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  });

  it("refuses (non-zero) a type with no interactive component", () => {
    const work = mkdtempSync(join(tmpdir(), "export-source-cli-bad-"));
    const configPath = join(work, "config.json");
    writeFileSync(configPath, JSON.stringify({ title: "x" }));
    const dest = join(work, "x-source");
    try {
      const proc = Bun.spawnSync(
        ["bun", scriptPath, "not-a-chart-type", configPath, dest],
        { stdout: "pipe", stderr: "pipe" },
      );
      expect(proc.exitCode).not.toBe(0);
      expect(proc.stderr.toString()).toMatch(/not an interactive/i);
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  });
});
