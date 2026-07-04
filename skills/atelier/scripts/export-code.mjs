// EXPORT (code path): bundle a producer's artifacts into a hand-over folder with an embed snippet
// and a README, so a technical journalist can drop the visual into their CMS.
//   bun export-code.mjs <outDir> <exportDir>
import { readdirSync, mkdirSync, copyFileSync, writeFileSync } from "node:fs";
import { join, basename, extname } from "node:path";

export function embedSnippet(file) {
  const name = basename(file);
  const ext = extname(file).toLowerCase();
  if (ext === ".html")
    return `<iframe src="${name}" style="width:100%;border:0;aspect-ratio:16/10" loading="lazy" title="visual"></iframe>`;
  if (ext === ".png" || ext === ".jpg")
    return `<img src="${name}" alt="visual" style="max-width:100%;height:auto" />`;
  if (ext === ".mp4")
    return `<video src="${name}" controls playsinline style="max-width:100%"></video>`;
  throw new Error(`unsupported artifact extension: ${ext}`);
}

if (import.meta.main) {
  const [outDir, exportDir] = process.argv.slice(2);
  if (!outDir || !exportDir) {
    console.error("usage: export-code.mjs <outDir> <exportDir>");
    process.exit(1);
  }
  mkdirSync(exportDir, { recursive: true });
  const artifacts = readdirSync(outDir).filter((f) =>
    [".html", ".png", ".jpg", ".mp4"].includes(extname(f).toLowerCase()),
  );
  if (!artifacts.length) {
    console.error(`no exportable artifacts in ${outDir}`);
    process.exit(1);
  }
  // The primary embeddable artifact: prefer an interactive/scrolly HTML, else the first.
  const primary =
    artifacts.find((f) => f.endsWith(".html")) ?? artifacts[0];
  for (const f of artifacts) copyFileSync(join(outDir, f), join(exportDir, f));
  writeFileSync(
    join(exportDir, "EMBED.md"),
    `# Embed\n\nPaste this where the visual should appear:\n\n\`\`\`html\n${embedSnippet(primary)}\n\`\`\`\n\nAll files in this folder must be uploaded together (the embed references them by relative path).\n`,
  );
  writeFileSync(
    join(exportDir, "README.txt"),
    `Atelier export — ${artifacts.length} file(s): ${artifacts.join(", ")}.\nPrimary embed: ${primary}. See EMBED.md.\n`,
  );
  console.log("EXPORT_CODE_RESULT " + JSON.stringify({ exportDir, primary, artifacts }));
}
