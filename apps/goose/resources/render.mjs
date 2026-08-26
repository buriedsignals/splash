import { readFile } from "node:fs/promises";
import { join } from "node:path";

const APP_MARKER = "/*__SPLASH_APP__*/";
const CSS_MARKER = "/*__SPLASH_CSS__*/";

export async function renderAppHtml() {
  const root = join(import.meta.dirname);
  const [template, css, build] = await Promise.all([
    readFile(join(root, "splash-app.html"), "utf8"),
    readFile(join(root, "splash-app.css"), "utf8"),
    Bun.build({
      entrypoints: [join(root, "splash-app.mjs")],
      format: "esm",
      minify: true,
      target: "browser",
    }),
  ]);
  if (!build.success || build.outputs.length !== 1)
    throw new Error("could not bundle the Splash app");
  if (!template.includes(APP_MARKER) || !template.includes(CSS_MARKER))
    throw new Error("Splash app template markers are missing");
  const bundled = await build.outputs[0].text();
  return template
    .replace(CSS_MARKER, () => css)
    .replace(APP_MARKER, () => bundled);
}
