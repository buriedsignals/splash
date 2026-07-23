// EXPORT (code path) — SINGLE-FORMAT delivery. An accepted proposal carries ONE pinned
// VisualFormat (the single-format redesign: one element = one format, produced + delivered
// alone). This script delivers exactly that format's ONE artifact, and for interactive /
// scrolly it delivers exactly the ONE delivery form the journalist chose — built LAZILY,
// only once chosen:
//   static → the media image, handed over directly (no folder machinery, no .html, no menu).
//   video  → the .mp4, handed over directly.
//   interactive / scrolly → a two-phase LAZY delivery:
//       phase 1 (no --form): EMIT the a/b/c delivery-form proposal (the machine-relayable
//                            `EXPORT_FORMS_JSON` line + the human `EXPORT_FORMS_PROPOSAL`
//                            block) describing what each form WOULD be — building NOTHING
//                            (no React bundle, no embed deploy, no file copies).
//       phase 2 (--form <html|code-source|embed>): materialise + deliver ONLY that form:
//           html        → copy the interactive.html / scrolly.html file.
//           code-source → run export-source.mjs NOW → the runnable `<id>-source` React
//                         bundle (chart-native, a straight-copy project), else run
//                         bundle-source.mjs NOW → the runnable `<id>-source` bundle assembled
//                         by closure-tracing the entangled map-native / scrolly src.
//           embed       → run deploy-embed.mjs NOW (Cloudflare Pages) and record the hosted URL in
//                         EMBED_URL.txt (a hosted-DW producer records its already-live
//                         publicUrl — no deploy step).
// There is NO auto no-JS static.html fallback any more: accessibility is a FORMAT choice at
// CADRAGE (picking "static" IS the accessible path), not a file bolted onto every interactive.
// The final gate is assertDelivered(files, { format, form }) — the folder must match the
// (format, chosen form) shape or the export fails loudly instead of shipping a non-delivery.
//
//   bun export-code.mjs <outDir> <exportDir> --results <report.json> --id <proposalId> [--form <html|code-source|embed>]
import {
  readdirSync,
  readFileSync,
  mkdirSync,
  copyFileSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertShippable,
  assertDelivered,
  assertEditoriallyCleared,
  isHostedUrl,
} from "../src/export-guard.ts";
import { assertChainProvenance } from "../src/render-provenance.ts";
import { embedDeliveryStatus } from "../src/preflight.ts";
import { parseNewsroomMarkdown } from "../src/brand-profile.ts";

const SELF = fileURLToPath(import.meta.url);
// The chart-native source-bundle generator — form "code-source" for chart-native is a
// self-contained, runnable Vite project (bun install && bun run build), NOT a built-files
// copy. Resolved relative to this script so it works regardless of cwd.
const EXPORT_SOURCE_SCRIPT = join(
  dirname(SELF),
  "..",
  "..",
  "chart-native",
  "scripts",
  "export-source.mjs",
);
// The engine-agnostic runnable-bundle generator for map-native / scrolly (their src is
// entangled, so bundle-source.mjs closure-copies it; chart-native keeps export-source.mjs).
const BUNDLE_SOURCE_SCRIPT = join(dirname(SELF), "bundle-source.mjs");
const DEPLOY_EMBED_SCRIPT = join(dirname(SELF), "deploy-embed.mjs");

const IMAGE_RE = /\.(png|svg|jpe?g)$/i;
const VIDEO_RE = /\.mp4$/i;
const VALID_FORMS = ["html", "code-source", "embed"];
const NEWSROOM_PROFILE_FILENAME = "NEWSROOM-PROFILE.md";

// S4d editorial gate: resolve which NEWSROOM-PROFILE.md governs THIS export. `--profile`
// always OVERRIDES when given (an explicit path is never second-guessed). Absent, this
// AUTO-DISCOVERS `NEWSROOM-PROFILE.md` in the invoking cwd — the gate was previously plumbed
// but dark: no orchestrator call passes --profile, so requiredSigners never enforced in the
// real flow. Auto-discovery makes it enforce live-by-default whenever a newsroom's profile
// sets requiredSigners, with no flag to remember. Neither present → empty profile (opt-in
// preserved — a directory with no profile still exports unsigned, never blocked). Returns
// the resolved profile PATH (for forwarding into a subprocess, e.g. --form embed's
// deploy-embed.mjs) alongside the parsed profile.
function resolveProfile(flags) {
  const cwdProfile = join(process.cwd(), NEWSROOM_PROFILE_FILENAME);
  const profilePath = flags.profile ?? (existsSync(cwdProfile) ? cwdProfile : null);
  const profile = profilePath
    ? (parseNewsroomMarkdown(readFileSync(profilePath, "utf8")) ?? { palette: [] })
    : { palette: [] };
  return { profilePath, profile };
}

// Splits argv into positionals and `--flag value` pairs, so the required --results/--id and
// the optional --form/--profile flags can sit alongside the positional args in any order.
function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (
      a === "--results" ||
      a === "--id" ||
      a === "--form" ||
      a === "--profile"
    )
      flags[a.slice(2)] = argv[++i];
    else positional.push(a);
  }
  return { positional, flags };
}

// True when a path resolves into a temporary / session-scratch location that gets cleaned —
// the journalist would lose the deliverable. EXPORT must write to a stable project path
// (exports/<slug>) instead.
export function isEphemeralPath(p) {
  const abs = resolve(p);
  return (
    /(^|\/)(tmp|scratchpad)(\/|$)/.test(abs) ||
    abs.includes("/private/tmp/") ||
    abs.includes("/var/folders/")
  );
}

// The single static image the producer left in outDir: chart-native / map-native name it
// "static.png" (or .svg); a hosted-DW producer names it "<id>.png" and declares it in the
// report's `outputs` (authoritative — never a stray review screenshot). Falls back to a sole
// image if unambiguous.
function resolveStaticMedia(files, result) {
  const canonical = files.find((f) => /^static\.(png|svg|jpe?g)$/i.test(f));
  if (canonical) return canonical;
  const declared = (result.outputs ?? [])
    .map((p) => basename(p))
    .find((f) => IMAGE_RE.test(f) && files.includes(f));
  if (declared) return declared;
  const imgs = files.filter((f) => IMAGE_RE.test(f));
  return imgs.length === 1 ? imgs[0] : null;
}

function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const [outDir, exportDir] = positional;
  const { results: resultsPath, id, form: rawForm } = flags;
  if (!outDir || !exportDir || !resultsPath || !id) {
    console.error(
      "usage: export-code.mjs <outDir> <exportDir> --results <report.json> --id <proposalId> [--form <html|code-source|embed>] [--profile <NEWSROOM-PROFILE.md>]",
    );
    process.exit(1);
  }
  // Path-safety (audit gap #1, same class the spine's id-safety.ts guards) — the LLM-
  // supplied --id becomes a path component here: the code-source form writes its bundle to
  // `join(exportDir, `${id}-source`)`. A traversal id ("../../evil") would escape exportDir
  // and write outside the journalist's chosen export folder. Reject anything but a plain
  // slug BEFORE any find/copy/exec runs. Kept inline (mirrors id-safety.ts's regex) so this
  // standalone script carries no cross-module dependency.
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) {
    console.error(
      `--id "${id}" is not a safe slug (letters, digits, - and _ only, 1-128 chars) — ` +
        `the id becomes a directory name under the export folder, so a path separator, ` +
        `"..", or an absolute path could write outside it`,
    );
    process.exit(1);
  }
  const form = rawForm ?? null;
  if (form !== null && !VALID_FORMS.includes(form)) {
    console.error(
      `invalid --form "${form}" (expected one of: ${VALID_FORMS.join(", ")})`,
    );
    process.exit(1);
  }
  if (isEphemeralPath(exportDir)) {
    console.error(
      `refusing to export to an ephemeral path (${resolve(exportDir)}) — it will be cleaned and the journalist will lose the file. Pass a stable location like exports/<slug>.`,
    );
    process.exit(1);
  }

  // The one MECHANICAL gate, before any copy/write: refuse unless this exact proposal was
  // actually produced AND the human approved the render. assertChainProvenance (S1 strict
  // production seam) then verifies the delivered result traces the sanctioned chain
  // candidates.json → accepted.json → produce-all → outputs — a hand-authored spec never on
  // the suggester's menu, a spec edited after acceptance, or a planted/stale artifact is
  // refused here too, before any copy/write.
  let result;
  let report; // hoisted out of the try so editorialGate (below) can read it
  try {
    report = JSON.parse(readFileSync(resultsPath, "utf8"));
    assertShippable(report, id);
    assertChainProvenance(report, id, exportDir, resultsPath);
    result = report.results.find((x) => x.id === id);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }

  const format = result.format;
  if (!format) {
    console.error(`report result ${id} has no pinned format`);
    process.exit(1);
  }
  const hostedUrl = result.publicUrl ?? null;
  const files = readdirSync(outDir);
  const absExportDir = resolve(exportDir);

  const fail = (msg) => {
    console.error(msg);
    process.exit(1);
  };
  const done = (payload) =>
    console.log("EXPORT_CODE_RESULT " + JSON.stringify(payload));

  // S4d editorial gate: re-verify human sign-offs against the exact bytes about to ship.
  // Resolved via resolveProfile — --profile OVERRIDES, else auto-discovered from cwd (see
  // resolveProfile above). Throws (via fail(), matching the rest of this script's refusal
  // shape) when a requiredSigner is missing/stale/invalid; with no requiredSigners it never
  // blocks — just prints the honest signed/unsigned state so it is recorded in the export
  // transcript.
  const { profilePath: resolvedProfilePath, profile } = resolveProfile(flags);
  const editorialGate = (artifactBytes) => {
    try {
      const { signedBy, unsigned } = assertEditoriallyCleared(
        report,
        id,
        profile,
        artifactBytes,
      );
      console.log(
        unsigned
          ? "EDITORIAL: unsigned — LLM render-approval only"
          : `EDITORIAL: signed by ${signedBy.join(", ")}`,
      );
    } catch (e) {
      fail(e.message);
    }
  };

  // ---- STATIC: hand over the lone media image directly. ----
  if (format === "static") {
    if (form !== null) fail(`static format takes no --form (got "${form}")`);
    const media = resolveStaticMedia(files, result);
    if (!media) fail(`no static image (.png/.svg/.jpg) found in ${outDir}`);
    // Gate BEFORE any write: a requiredSigners refusal must leave exportDir untouched — the
    // owned artifact never ships despite refusal (S4d fix — was gated after the copy).
    editorialGate(readFileSync(join(outDir, media)));
    mkdirSync(exportDir, { recursive: true });
    copyFileSync(join(outDir, media), join(exportDir, media));
    assertDelivered(readdirSync(exportDir), { format, form: null });
    done({ format, media: join(absExportDir, media), exportDir: absExportDir });
    return;
  }

  // ---- VIDEO: hand over the lone .mp4 directly (the review still is not a deliverable). ----
  if (format === "video") {
    if (form !== null) fail(`video format takes no --form (got "${form}")`);
    const mp4 = files.find((f) => VIDEO_RE.test(f));
    if (!mp4) fail(`no .mp4 found in ${outDir}`);
    // Gate BEFORE any write — see the static branch above for why.
    editorialGate(readFileSync(join(outDir, mp4)));
    mkdirSync(exportDir, { recursive: true });
    copyFileSync(join(outDir, mp4), join(exportDir, mp4));
    assertDelivered(readdirSync(exportDir), { format, form: null });
    done({ format, media: join(absExportDir, mp4), exportDir: absExportDir });
    return;
  }

  // ---- INTERACTIVE / SCROLLY: two-phase lazy delivery. ----
  const isScrolly = format === "scrolly";
  const wantHtml = isScrolly ? "scrolly.html" : "interactive.html";
  const interactive = files.includes(wantHtml)
    ? wantHtml
    : (files.find((f) => f.toLowerCase().endsWith(".html")) ?? null);
  // Hosted DW producers (dw-chart / map-dw) record a hosted `publicUrl` and emit NO local
  // html — that hosted embed IS their interactive form.
  const isHostedEmbed = hostedUrl != null && interactive == null;
  if (!isHostedEmbed && !interactive)
    fail(`no interactive .html found in ${outDir} for a ${format} delivery`);
  // chart-native drops config.json + native-source.json so export-source.mjs can assemble a
  // runnable React bundle (its src is a straight-copy project). map-native / scrolly instead
  // drop config.json + source-manifest.json (see hasSourceManifest below) so bundle-source.mjs
  // can closure-copy their entangled src into a runnable bundle. When NEITHER marker exists a
  // code-source delivery fails loudly (a lone html is not a runnable bundle) — see the fail() below.
  const hasNativeSource =
    existsSync(join(outDir, "native-source.json")) &&
    existsSync(join(outDir, "config.json"));
  // map-native / scrolly drop source-manifest.json + config.json → their code-source form is a
  // runnable bundle assembled by bundle-source.mjs (NOT the old lone-html copy).
  const hasSourceManifest =
    existsSync(join(outDir, "source-manifest.json")) &&
    existsSync(join(outDir, "config.json")) &&
    !hasNativeSource;

  // ---- Phase 1: emit the proposal, build NOTHING. ----
  if (form === null) {
    emitProposal({
      id,
      outDir,
      exportDir,
      resultsPath,
      format,
      isScrolly,
      isHostedEmbed,
      hostedUrl,
      interactive,
      hasNativeSource,
      hasSourceManifest,
      absExportDir,
    });
    return;
  }

  // ---- Phase 2: materialise + deliver ONLY the chosen form. ----
  // exportDir is created per-branch, AFTER its editorial gate — a requiredSigners refusal must
  // leave no trace (not even an empty exportDir) rather than shipping the artifact first and
  // throwing after (S4d fix — was created + populated, then gated).

  if (form === "html") {
    if (!interactive)
      fail(
        `${format} form=html has no standalone HTML file — a hosted Datawrapper interactive delivers via --form embed`,
      );
    editorialGate(readFileSync(join(outDir, interactive)));
    mkdirSync(exportDir, { recursive: true });
    copyFileSync(join(outDir, interactive), join(exportDir, interactive));
    assertDelivered(readdirSync(exportDir), { format, form: "html" });
    done({
      format,
      form: "html",
      file: join(absExportDir, interactive),
      exportDir: absExportDir,
    });
    return;
  }

  if (form === "code-source") {
    if (isHostedEmbed)
      fail(
        `${format} form=code-source is not available for a hosted Datawrapper interactive (there is no React source to rebuild) — deliver via --form embed`,
      );
    // The source bundle REPRODUCES the rendered interactive.html the editor signed off on — gate
    // against those SAME local html bytes, before assembling/copying anything (S4d gap: this
    // branch previously shipped an owned deliverable with no editorial gate at all). `interactive`
    // is guaranteed non-null here (isHostedEmbed is false and the earlier
    // `!isHostedEmbed && !interactive` check already refused a markerless-html outDir).
    editorialGate(readFileSync(join(outDir, interactive)));
    mkdirSync(exportDir, { recursive: true });
    if (hasNativeSource) {
      let bundleType = null;
      try {
        bundleType = JSON.parse(
          readFileSync(join(outDir, "native-source.json"), "utf8"),
        ).type;
      } catch {
        bundleType = null;
      }
      if (!bundleType)
        fail("native-source.json has no chart type; cannot build the React source bundle");
      const bundleDir = join(absExportDir, `${id}-source`);
      execFileSync(
        "bun",
        [EXPORT_SOURCE_SCRIPT, bundleType, join(outDir, "config.json"), bundleDir],
        { stdio: "inherit" },
      );
      assertDelivered(readdirSync(bundleDir), { format, form: "code-source" });
      done({
        format,
        form: "code-source",
        kind: "react-source-bundle",
        path: bundleDir,
        exportDir: absExportDir,
      });
      return;
    }
    if (hasSourceManifest) {
      const bundleDir = join(absExportDir, `${id}-source`);
      execFileSync(
        "bun",
        [
          BUNDLE_SOURCE_SCRIPT,
          join(outDir, "source-manifest.json"),
          join(outDir, "config.json"),
          bundleDir,
        ],
        { stdio: "inherit" },
      );
      assertDelivered(readdirSync(bundleDir), { format, form: "code-source" });
      done({
        format,
        form: "code-source",
        kind: "react-source-bundle",
        path: bundleDir,
        exportDir: absExportDir,
      });
      return;
    }
    // No source marker at all: a runnable code-source bundle cannot be assembled (there is no
    // native-source.json / source-manifest.json to drive export-source.mjs / bundle-source.mjs),
    // and a lone interactive.html is NOT a valid code-source delivery (assertDelivered requires a
    // runnable Vite project). This is unreachable from a real producer (chart-native emits
    // native-source.json, map-native / scrolly emit source-manifest.json, hosted-DW is handled
    // above) — only a stale / hand-made outDir lands here. Fail loudly with an actionable path
    // instead of copying an html the code-source gate would reject.
    fail(
      `${format} form=code-source: no source marker (native-source.json / source-manifest.json) found in ${outDir} — re-produce this element to generate a runnable code-source bundle, or deliver it with --form html / --form embed.`,
    );
    return;
  }

  if (form === "embed") {
    let url;
    if (isHostedEmbed) {
      // A hosted DW interactive is already published — no deploy step, record the live URL.
      // No owned bytes exist to re-verify a sign-off against (the artifact lives on the
      // provider's servers) — say so explicitly rather than silently skipping the gate.
      url = hostedUrl;
      console.log(
        "EDITORIAL: skipped (hosted embed — no owned bytes to re-verify; see S4d follow-up)",
      );
    } else {
      if (!interactive)
        fail(`${format} form=embed found no html to deploy in ${outDir}`);
      let out;
      try {
        out = execFileSync(
          "bun",
          [
            DEPLOY_EMBED_SCRIPT,
            join(outDir, interactive),
            id,
            "--results",
            resolve(resultsPath),
            "--id",
            id,
            // Forward the SAME profile export-code resolved (explicit --profile or the
            // discovered cwd NEWSROOM-PROFILE.md) — deploy-embed also auto-discovers from its
            // inherited cwd, but forwarding the exact resolved path is explicit + robust (a
            // requiredSigners-unmet embed must refuse before any Cloudflare publish).
            ...(resolvedProfilePath ? ["--profile", resolve(resolvedProfilePath)] : []),
          ],
          { encoding: "utf8" },
        );
      } catch (e) {
        // deploy-embed fail-fasts (e.g. missing CLOUDFLARE_API_TOKEN) or the upload fails — surface its
        // actionable message and refuse. Never fall through to write a placeholder EMBED_URL.txt.
        const msg = (e.stderr || e.stdout || e.message || "").toString().trim();
        fail(msg || `${format} form=embed deploy failed`);
      }
      const line = out.split("\n").find((l) => l.startsWith("EMBED_URL "));
      if (!line) fail("deploy-embed did not return an EMBED_URL");
      url = line.slice("EMBED_URL ".length).trim();
    }
    // The URL must look like a resolvable hosted https link before we record it as delivered —
    // a stalled deploy or a malformed publicUrl must not be written out as a real embed.
    if (!isHostedUrl(url))
      fail(
        `${format} form=embed did not resolve a hosted https URL (got ${JSON.stringify(url)})`,
      );
    writeFileSync(join(exportDir, "EMBED_URL.txt"), url + "\n");
    assertDelivered(readdirSync(exportDir), {
      format,
      form: "embed",
      dir: exportDir,
    });
    done({ format, form: "embed", url, exportDir: absExportDir });
    return;
  }
}

// The lazy delivery-form PROPOSAL for an interactive / scrolly. Emitted as a FIXED,
// machine-relayable block so the orchestrator relays THIS message verbatim (killing the
// "Livré." with-nothing failure mode) and gets the a/b/c answer — THEN re-invokes this
// script with --form <chosen> to build ONLY that form. Nothing is built here.
//   a — Code source: a runnable React source bundle (built on --form code-source) — via
//       export-source.mjs for chart-native, via bundle-source.mjs for map-native / scrolly
//       with a source-manifest. Omitted entirely when NEITHER source marker is present (a
//       markerless outDir has no code-source deliverable — only b / c are offered).
//   b — HTML autonome: the single self-contained interactive.html / scrolly.html.
//   c — Embed (hébergé): deploy the html to the newsroom's Cloudflare Pages project (or, for a hosted
//       DW producer, the already-live publicUrl — no deploy step).
function emitProposal(ctx) {
  const {
    id,
    outDir,
    exportDir,
    resultsPath,
    format,
    isScrolly,
    isHostedEmbed,
    hostedUrl,
    interactive,
    hasNativeSource,
    hasSourceManifest,
    absExportDir,
  } = ctx;
  const deliverBase = `bun ${SELF} ${outDir} ${exportDir} --results ${resolve(resultsPath)} --id ${id}`;
  const forms = {};

  if (isHostedEmbed) {
    // Datawrapper interactive: the interactive IS the already-live hosted embed. The only
    // delivery form is that embed (no React source, no local html — static.html was dropped).
    forms.c = {
      label: "Embed (hébergé, déjà en ligne)",
      url: hostedUrl,
      deliver: `${deliverBase} --form embed`,
    };
  } else {
    // Form a (Code source = a runnable React bundle) is only offered when a source marker is
    // present — export-source.mjs (chart-native) or bundle-source.mjs (map-native / scrolly) can
    // then assemble it on --form code-source. A markerless non-hosted outDir (only reachable by
    // re-exporting a stale / hand-made folder) has no code-source deliverable — do NOT advertise
    // one the delivery gate would reject; the journalist takes form b (HTML) or form c (Embed).
    if (hasNativeSource || hasSourceManifest) {
      forms.a = {
        kind: "react-source-bundle",
        label: "Code source (bundle React)",
        path: join(absExportDir, `${id}-source`),
        pending: true,
        deliver: `${deliverBase} --form code-source`,
      };
    }
    forms.b = {
      label: "HTML autonome",
      path: join(absExportDir, interactive),
      deliver: `${deliverBase} --form html`,
    };
    // A hosted embed can only ship by deploying to the newsroom's own Cloudflare Pages project.
    // If a credential is missing, form c cannot be delivered AS IS — but it is KEY-FIXABLE, so
    // the reason carries what is missing and where to get it (same prerequisite flow as an
    // engine key). The orchestrator collects it rather than silently steering to form b.
    const embedStatus = embedDeliveryStatus();
    const embedReady = embedStatus.ready;
    forms.c = {
      label: "Embed (hébergé)",
      available: embedReady,
      ...(embedReady
        ? {}
        : {
            reason: `Clé(s) manquante(s) pour l'embed hébergé : ${embedStatus.reason}. Fournissez-la/les (elles seront enregistrées via save-key.mjs) pour livrer en c), ou choisissez b) (HTML autonome).`,
            missingKeys: embedStatus.missing,
          }),
      command: `bun ${DEPLOY_EMBED_SCRIPT} ${join(absExportDir, interactive)} ${id} --results ${resolve(resultsPath)} --id ${id}`,
      deliver: `${deliverBase} --form embed`,
    };
  }

  console.log(
    "EXPORT_FORMS_JSON " +
      JSON.stringify({
        proposalId: id,
        format,
        scrolly: isScrolly,
        hosted: isHostedEmbed,
        exportDir: absExportDir,
        forms,
      }),
  );

  // A clean, human-readable relay block (same content) — the orchestrator prints it verbatim,
  // asks which form (a / b / c), then re-runs export-code with --form <choice>.
  const relay = [
    "EXPORT_FORMS_PROPOSAL",
    "Le visuel est produit. Choisissez la forme de livraison (rien n'est encore construit — la forme choisie est générée à la demande) :",
  ];
  // forms.a, when present, is always the runnable React source bundle (a markerless outDir has
  // no code-source deliverable, so form a is simply omitted — see above).
  if (forms.a)
    relay.push(
      `  a) Code source — projet React autonome à rebuilder/personnaliser (bun install && bun run build) : ${forms.a.path}`,
    );
  if (forms.b)
    relay.push(
      `  b) HTML autonome — un seul fichier autonome à déposer n'importe où : ${forms.b.path}`,
    );
  if (forms.c)
    relay.push(
      forms.c.url
        ? `  c) Embed (hébergé) — lien déjà en ligne, réutilisable partout : ${forms.c.url}`
        : forms.c.available === false
          ? `  c) Embed (hébergé) — nécessite une clé manquante (${forms.c.missingKeys.join(", ")}). Je peux vous la demander et l'enregistrer, puis livrer en c) ; sinon prenez b) (fichier HTML autonome équivalent).`
          : `  c) Embed (hébergé) — publier sur votre projet Cloudflare Pages pour obtenir un lien à réutiliser`,
    );
  relay.push(
    `Quelle forme souhaitez-vous ? (${Object.keys(forms).join(" / ")}) — puis relancer export-code avec --form <html|code-source|embed>.`,
    // The explicit WAIT instruction, at the point of temptation. Observed violation (QA wave 10,
    // w9-double-opportunite-energie): the orchestrator emitted this proposal for two hosted-DW
    // elements, announced "Je finalise la livraison sous cette forme pour les deux", and ran
    // --form embed for both without a single journalist turn in between. The choice is the
    // journalist's — even when only one form is offered, and never presumed across elements.
    "ATTENDRE la réponse du journaliste à CETTE proposition avant tout --form : ne jamais choisir à sa place — même quand une seule forme est possible, c'est le journaliste qui la confirme, et sur plusieurs éléments jamais de « pour les deux » présumé (une réponse groupée n'est valable que si c'est LUI qui la donne).",
    "END_EXPORT_FORMS_PROPOSAL",
  );
  console.log(relay.join("\n"));
}

if (import.meta.main) main();
