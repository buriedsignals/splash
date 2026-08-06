// Lazy by design: nothing is built before the journalist has chosen. `offerForms` and
// `materialise` read the same `FORMS` table — one source of truth — so "not an offered form"
// can never drift from what was actually offered.

import { copyFile, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

const REACT_VERSION = "^19.1.0";

const FORMS = {
  "owned-file": {
    label: "The file itself",
    gives: "a PNG and an SVG the newsroom owns outright, nothing else to run",
  },
  "source-bundle": {
    label: "Runnable source",
    gives:
      "a folder with this chart's component and data, plus a real build.ts that bun install and bun run build actually execute",
  },
};

export function offerForms({ medium, genre }) {
  // SP1 has one genre. `medium` is accepted for the interface's own future (a map beat's
  // forms will not read identically to a chart beat's), but is not yet branched on.
  if (genre !== "static") {
    throw new Error(`SP1 delivers the static genre only, got ${JSON.stringify(genre)}`);
  }
  return Object.keys(FORMS).map((id) => ({ id, ...FORMS[id] }));
}

// Recursively copies one directory's contents into another, collecting every file path
// written. Directories are walked, never handed to `copyFile` directly — a beat carrying a
// subdirectory anywhere other than "renders" (an "assets" folder, say) must be copied whole,
// not throw EISDIR.
async function copyTree(srcDir, destDir, written) {
  await mkdir(destDir, { recursive: true });
  for (const entry of await readdir(srcDir, { withFileTypes: true })) {
    const srcPath = join(srcDir, entry.name);
    const destPath = join(destDir, entry.name);
    if (entry.isDirectory()) {
      await copyTree(srcPath, destPath, written);
    } else {
      await copyFile(srcPath, destPath);
      written.push(destPath);
    }
  }
}

// A real, dependency-free build entry point: Bun's own bundler ships inside the Bun runtime,
// so "bun install && bun run build" genuinely executes. It does not reproduce the raster
// pipeline that made the owned PNG/SVG — that pipeline belongs to the chart-beat skill, and
// duplicating it here would be exactly the shared-utility coupling this codebase avoids. It
// bundles the component source it was actually given, which is a claim this file can back.
const BUILD_SCRIPT = `// Bundles this beat's own component source with Bun's native bundler.
// This reproduces the runnable source, not the raster pipeline that made the owned PNG/SVG.
import { readdir } from "node:fs/promises";

const entrypoints = (await readdir(".")).filter((file) => file.endsWith(".tsx"));
if (entrypoints.length === 0) throw new Error("no .tsx component found to build");

const result = await Bun.build({ entrypoints, outdir: "./dist" });
if (!result.success) {
  for (const log of result.logs) console.error(log);
  throw new Error("build failed");
}
console.log(\`built \${entrypoints.join(", ")} -> ./dist\`);
`;

export async function materialise({ form, beatDir, exportDir }) {
  if (!FORMS[form]) throw new Error(`${form} is not an offered form`);

  // A journalist can change their mind. exportDir may already hold a previous choice's
  // files — clear it first so the chosen form is the ONLY thing delivered, never a mix of
  // this choice and the last one. Validation above runs before this, so a rejected form never
  // destroys whatever was already delivered.
  await rm(exportDir, { recursive: true, force: true });
  await mkdir(exportDir, { recursive: true });
  const written = [];

  if (form === "owned-file") {
    await copyTree(join(beatDir, "renders"), exportDir, written);
    return written;
  }

  for (const entry of await readdir(beatDir, { withFileTypes: true })) {
    if (entry.name === "renders") continue;
    const srcPath = join(beatDir, entry.name);
    const destPath = join(exportDir, entry.name);
    if (entry.isDirectory()) {
      await copyTree(srcPath, destPath, written);
    } else {
      await copyFile(srcPath, destPath);
      written.push(destPath);
    }
  }

  const buildPath = join(exportDir, "build.ts");
  await writeFile(buildPath, BUILD_SCRIPT);
  written.push(buildPath);

  const manifestPath = join(exportDir, "package.json");
  await writeFile(
    manifestPath,
    JSON.stringify(
      {
        name: "splash-beat",
        private: true,
        type: "module",
        dependencies: { react: REACT_VERSION },
        scripts: { build: "bun run build.ts" },
      },
      null,
      2,
    ),
  );
  written.push(manifestPath);

  return written;
}
