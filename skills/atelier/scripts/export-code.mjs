// EXPORT (code path): bundle a producer's artifacts into a hand-over folder covering the three
// delivery forms — (1) CODE SOURCE: all the built files, self-host + customise; (2) HTML STATIQUE:
// a single self-contained static.html (the image inlined, no JS, embeds anywhere); (3) COMPOSANT
// EMBED: run deploy-embed on interactive.html for a hosted link. Homogeneous across producers now
// that every interactive producer emits a self-contained interactive.html.
//   bun export-code.mjs <outDir> <exportDir> --results <report.json> --id <proposalId>
import {
  readdirSync,
  readFileSync,
  mkdirSync,
  copyFileSync,
  writeFileSync,
} from "node:fs";
import { join, basename, extname, resolve } from "node:path";
import { assertShippable } from "../src/export-guard.ts";

// Splits argv into positionals and `--flag value` pairs, so the required --results/--id
// flags can sit alongside the existing positional args in any order.
function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--results" || a === "--id") flags[a.slice(2)] = argv[++i];
    else positional.push(a);
  }
  return { positional, flags };
}

// True when a path resolves into a temporary / session-scratch location that gets
// cleaned — the journalist would lose the deliverable. EXPORT must write to a stable
// project path (exports/<slug>) instead.
export function isEphemeralPath(p) {
  const abs = resolve(p);
  return (
    /(^|\/)(tmp|scratchpad)(\/|$)/.test(abs) ||
    abs.includes("/private/tmp/") ||
    abs.includes("/var/folders/")
  );
}

// The iframe/img/video snippet for a single artifact (used for the interactive/embed forms).
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

// A fully self-contained STATIC html: the image inlined as a data URI, no JS, no external refs —
// the "HTML statique" delivery form (works in any CMS / email / offline).
export function staticHtml(dataUri, alt = "visual") {
  return `<!doctype html><meta charset="utf-8"><title>${alt}</title><body style="margin:0"><img src="${dataUri}" alt="${alt}" style="display:block;max-width:100%;height:auto" /></body>`;
}

if (import.meta.main) {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const [outDir, exportDir] = positional;
  const { results: resultsPath, id } = flags;
  if (!outDir || !exportDir || !resultsPath || !id) {
    console.error(
      "usage: export-code.mjs <outDir> <exportDir> --results <report.json> --id <proposalId>",
    );
    process.exit(1);
  }
  if (isEphemeralPath(exportDir)) {
    console.error(
      `refusing to export to an ephemeral path (${resolve(exportDir)}) — it will be cleaned and the journalist will lose the file. Pass a stable location like exports/<slug>.`,
    );
    process.exit(1);
  }
  // The one mechanical gate, before any copy/write: refuse unless this exact proposal was
  // actually produced AND the human approved the render.
  try {
    const report = JSON.parse(readFileSync(resultsPath, "utf8"));
    assertShippable(report, id);
  } catch (e) {
    console.error(e.message);
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
  for (const f of artifacts) copyFileSync(join(outDir, f), join(exportDir, f));

  // The interactive (embeddable) artifact — a self-contained .html when present.
  const interactive = artifacts.find((f) => f.endsWith(".html")) ?? null;
  // The static image, if any → build a self-contained static.html (image inlined).
  const png = artifacts.find((f) => /\.(png|jpg)$/i.test(f)) ?? null;
  let staticFile = null;
  if (png) {
    const ext = extname(png).toLowerCase() === ".jpg" ? "jpeg" : "png";
    const dataUri = `data:image/${ext};base64,${readFileSync(join(outDir, png)).toString("base64")}`;
    staticFile = "static.html";
    writeFileSync(join(exportDir, staticFile), staticHtml(dataUri));
  }

  const forms = [];
  forms.push(
    `## 1. Code source (self-host + customise)\nAll files in this folder. Upload them together; embed the ${interactive ? "interactive" : "static"} visual with:\n\n\`\`\`html\n${embedSnippet(interactive ?? png ?? artifacts[0])}\n\`\`\``,
  );
  if (staticFile)
    forms.push(
      `## 2. HTML statique (one self-contained file, no JS)\n\`${staticFile}\` — the image is inlined; it embeds anywhere with no dependencies:\n\n\`\`\`html\n<iframe src="${staticFile}" style="width:100%;border:0" title="visual"></iframe>\n\`\`\``,
    );
  if (interactive)
    forms.push(
      `## 3. Composant en lien embed (hosted)\nGet a hosted URL:\n\n\`\`\`sh\nbun skills/atelier/scripts/deploy-embed.mjs <this-folder>/${interactive} <slug> --results ${resultsPath} --id ${id}\n\`\`\`\n\nRe-hosting later (or re-running this) requires a produced + render-approved report for proposal \`${id}\` — keep \`${resultsPath}\` (or an equivalent report) alongside this export.`,
    );
  writeFileSync(
    join(exportDir, "EMBED.md"),
    `# Export — three delivery forms\n\n${forms.join("\n\n")}\n`,
  );
  writeFileSync(
    join(exportDir, "README.txt"),
    `Atelier export — files: ${artifacts.join(", ")}${staticFile ? ", " + staticFile : ""}.\ninteractive: ${interactive ?? "none"} · static: ${staticFile ?? "none"}. See EMBED.md for the three delivery forms.\n`,
  );
  console.log(
    "EXPORT_CODE_RESULT " +
      JSON.stringify({ exportDir, interactive, staticFile, artifacts }),
  );
}
