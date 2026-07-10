// EXPORT (code path): bundle a producer's artifacts into a hand-over folder covering the
// delivery forms — (1) CODE SOURCE: all the built files, self-host + customise; (2) HTML STATIQUE:
// a single self-contained static.html (the image inlined, no JS, embeds anywhere); (3) COMPOSANT
// EMBED: run deploy-embed on interactive.html for a hosted link.
// An interactive delivery has NO standalone image form: the producer's raw "static.png" byproduct
// (chart-native/map-native always build one regardless of the requested format) is used ONLY to
// build the static.html fallback below and is never copied into the export folder as its own file.
//
// TWO producer shapes, both must yield a COMPLETE folder (never crash / never empty):
//   • FILE-BASED (chart-native / map-native / scrolly): emit a self-contained interactive.html
//     (or scrolly.html) + a canonically-named "static.png" byproduct. Forms 1 (code source) +
//     2 (static.html) + 3 (deploy-embed on the local html).
//   • HOSTED DW (dw-chart / map-dw): emit NO local html — the interactive form IS the already-
//     published Datawrapper embed (the report's `publicUrl`) — and name their static export
//     "<id>.png" (adapters.ts: `${p.id}.png`), NOT "static.png". Detected here via the report
//     (publicUrl present + no local html); the static image is recognised via the producer's
//     OWN declared `outputs` (authoritative, never a stray screenshot). Forms: hosted embed +
//     static.html a11y fallback. Never calls embedSnippet on a missing local file.
//   bun export-code.mjs <outDir> <exportDir> --results <report.json> --id <proposalId>
import {
  readdirSync,
  readFileSync,
  mkdirSync,
  copyFileSync,
  writeFileSync,
} from "node:fs";
import { join, basename, extname, resolve } from "node:path";
import { assertShippable, assertDelivered } from "../src/export-guard.ts";

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
  let result;
  try {
    const report = JSON.parse(readFileSync(resultsPath, "utf8"));
    assertShippable(report, id);
    // assertShippable guarantees this proposal exists in the report.
    result = report.results.find((x) => x.id === id);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  // Cloud/hosted producers (dw-chart / map-dw) record a hosted `publicUrl` — that hosted
  // Datawrapper embed IS their "interactive" form; they emit NO local interactive.html and
  // name their static export "<id>.png" (adapters.ts dispatches with `${p.id}.png`), not
  // "static.png". File-based producers (chart-native / map-native / scrolly) never set it.
  const hostedUrl = result?.publicUrl ?? null;
  mkdirSync(exportDir, { recursive: true });
  const candidates = readdirSync(outDir).filter((f) =>
    [".html", ".png", ".jpg", ".mp4"].includes(extname(f).toLowerCase()),
  );
  if (!candidates.length) {
    console.error(`no exportable artifacts in ${outDir}`);
    process.exit(1);
  }

  // The interactive (embeddable) artifact — a self-contained .html when present. A hosted
  // DW producer emits none: its interactive form is the hosted embed (hostedUrl), so this
  // stays null and the delivery is driven by hostedUrl below.
  const interactive = candidates.find((f) => f.endsWith(".html")) ?? null;
  // A hosted-embed delivery: a cloud producer published a hosted URL AND left no local html
  // to self-host. This is the dw-chart / map-dw shape — its owned deliverable is the
  // static.html a11y fallback + an EMBED.md pointing at the already-live hosted embed.
  const isHostedEmbed = hostedUrl != null && interactive == null;
  // The producer's raw static-image byproduct — used ONLY to build the self-contained
  // static.html fallback below. chart-native / map-native canonically name it
  // "static.png"/"static.jpg"; matched by name (not "any png/jpg") so a stray review
  // screenshot like "interactive.png" is never picked up by mistake. A hosted DW producer
  // instead names it "<id>.png", so when there is no canonical "static.*" AND this is a
  // hosted delivery, recognise it via the producer's OWN declared output (`result.outputs`
  // from the report) — the authoritative record of what it wrote, which by construction can
  // never be a stray screenshot (screenshots are not in `outputs`).
  let png = candidates.find((f) => /^static\.(png|jpg)$/i.test(f)) ?? null;
  if (!png && isHostedEmbed) {
    const declared = (result.outputs ?? [])
      .map((p) => basename(p))
      .find((f) => /\.(png|jpg)$/i.test(f) && candidates.includes(f));
    png = declared ?? null;
  }

  // Copy every artifact EXCEPT raw images (.png/.jpg) — an interactive/scrolly delivery has no
  // standalone image form; the three forms are code source, static HTML (no JS), and the hosted
  // embed link (see SKILL.md EXPORT §6).
  const artifacts = candidates.filter((f) => !/\.(png|jpg)$/i.test(f));
  for (const f of artifacts) copyFileSync(join(outDir, f), join(exportDir, f));

  let staticFile = null;
  if (png) {
    const ext = extname(png).toLowerCase() === ".jpg" ? "jpeg" : "png";
    const dataUri = `data:image/${ext};base64,${readFileSync(join(outDir, png)).toString("base64")}`;
    staticFile = "static.html";
    writeFileSync(join(exportDir, staticFile), staticHtml(dataUri));
  }

  const forms = [];
  if (isHostedEmbed) {
    // Hosted DW producer (dw-chart / map-dw): the interactive form is the ALREADY-LIVE
    // hosted Datawrapper embed — there is no local file to self-host, so no "code source"
    // form; the owned deliverable is the no-JS static.html a11y fallback below.
    forms.push(
      `## 1. Composant en lien embed (hosted, already live)\nThe interactive visual is hosted on Datawrapper — embed it directly (no deploy step, it is already published):\n\n\`\`\`html\n<iframe title="visual" src="${hostedUrl}" scrolling="no" frameborder="0" style="width:0;min-width:100%;border:none;" height="400"></iframe>\n\`\`\`\n\nHosted URL: ${hostedUrl}`,
    );
  } else {
    forms.push(
      `## 1. Code source (self-host + customise)\nAll files in this folder. Upload them together; embed the ${interactive ? "interactive" : "static"} visual with:\n\n\`\`\`html\n${embedSnippet(interactive ?? artifacts[0])}\n\`\`\``,
    );
  }
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
    `# Export — ${forms.length} delivery form${forms.length > 1 ? "s" : ""}\n\n${forms.join("\n\n")}\n`,
  );
  const deliveredFiles = [...artifacts, staticFile].filter(Boolean);
  writeFileSync(
    join(exportDir, "README.txt"),
    `Atelier export — files: ${deliveredFiles.join(", ") || "(none — hosted embed only)"}.\ninteractive: ${interactive ?? (isHostedEmbed ? `hosted embed (${hostedUrl})` : "none")} · static: ${staticFile ?? "none"}. See EMBED.md for the delivery forms.\n`,
  );
  // Mechanical teeth: self-verify this folder IS a real delivery before reporting success —
  // the a11y static.html fallback must be present for an interactive (a scrolly is exempt).
  // A build that dropped the fallback fails here loudly instead of shipping inaccessible.
  const isScrolly = interactive != null && /scrolly/i.test(interactive);
  assertDelivered(readdirSync(exportDir), { scrolly: isScrolly });

  console.log(
    "EXPORT_CODE_RESULT " +
      JSON.stringify({ exportDir, interactive, staticFile, artifacts }),
  );
}
