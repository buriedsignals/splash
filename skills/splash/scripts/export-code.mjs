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
import { cmsDeliveryStatus, embedDeliveryStatus } from "../src/preflight.ts";
import { resolveProfile, resolveProfilePath } from "../src/resolve-profile.ts";
import {
  resolvePlacement,
  placementBlock,
  articleEvidence,
  undeclaredPlacementRefusal,
} from "../src/placement.ts";
import { readDecorState } from "../../../lib/newsroom/decor.ts";
import { resolveLanguage } from "../../../lib/newsroom/language.ts";
import {
  exportProposalCopy,
  placementCopy,
  signoffCopy,
} from "../../../lib/newsroom/ui-copy.ts";

const SELF = fileURLToPath(import.meta.url);
// The interface language for everything this script PRINTS. A fresh install resolves to
// English (issue #6); a newsroom that saved a preference gets it without being asked again;
// SPLASH_UI_LANG overrides both for ONE run and writes nothing.
//
// The profile's `lang:` is deliberately NOT consulted here: it is the DELIVERABLES' language
// (`resolveLanguage`'s `content`), and passing it in would read as if it were a fallback for
// the interface — which it is not, and never was: `resolveLanguage` cannot let it reach `ui`.
//
// `readDecorState`, not `readNewsroomState`: an install that predates newsroom.json has its
// interface language recorded nowhere yet, and reading the state file alone skipped the legacy
// migration — so a French newsroom driven through the skill printed English until something else
// happened to call `loadDecor` (P1 parked finding #3). The read-only derivation applies that
// migration and still writes nothing: this script must never create state as a side effect.
function uiLang() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
  return resolveLanguage({
    override: { ui: process.env.SPLASH_UI_LANG },
    uiLang: readDecorState(root).uiLang,
  }).ui;
}

function uiCopy() {
  return exportProposalCopy(uiLang());
}

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
const PUBLISH_CMS_SCRIPT = join(dirname(SELF), "publish-cms.mjs");

// The newsroom's CMS address — a non-secret setting, so it lives in newsroom.json beside the
// capability it configures, never in .env with the credentials.
function cmsEndpoint() {
  const root = resolve(dirname(SELF), "../../..");
  return (
    readDecorState(root).capabilities?.["embed-cms"]?.settings?.endpoint ?? ""
  );
}

const IMAGE_RE = /\.(png|svg|jpe?g)$/i;
const VIDEO_RE = /\.mp4$/i;
const VALID_FORMS = ["html", "code-source", "embed", "cms"];

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
      a === "--article" ||
      a === "--after" ||
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
  const { results: resultsPath, id, form: rawForm, article, after } = flags;
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

  // WHERE this element goes in the article (register D03). accepted.json is guaranteed present and
  // parseable at this point — assertChainProvenance above has just read it and would have refused
  // the export otherwise — so this read cannot introduce a new failure mode for a legitimate
  // delivery. It is still wrapped: a placement is a SENTENCE, and no sentence may cost a journalist
  // an artifact that passed every gate.
  //
  // The run directory is dirname(report.json), NOT exportDir — the same convention
  // assertChainProvenance documents at length (render-provenance.ts): accepted.json/candidates.json
  // live beside report.json, never inside the delivery folder.
  const runDir = dirname(resolve(resultsPath));
  let acceptedEntry = null;
  try {
    const list = JSON.parse(readFileSync(join(runDir, "accepted.json"), "utf8"));
    acceptedEntry = (Array.isArray(list) ? list : []).find(
      (a) => a && typeof a === "object" && a.id === id,
    );
  } catch {
    acceptedEntry = null;
  }
  const placement = resolvePlacement(acceptedEntry);

  // Spec § 6: once a run has read an article, stating the placement is REQUIRED — the element is
  // fine, but a hand-over that says nothing about where it goes is not a hand-over. Refused HERE,
  // before any mkdir/copy, so a refusal leaves the journalist's export folder untouched (the same
  // discipline as the S4d editorial gate below). The fix is an entry-level field, so it costs no
  // re-produce: the chain hash is over `spec` (render-provenance.ts), not over the entry.
  const evidence = articleEvidence({
    opportunitiesPresent: existsSync(join(runDir, "opportunities.json")),
    skillsInvoked: acceptedEntry?.skillsInvoked,
  });
  const placementRefusal = undeclaredPlacementRefusal(id, evidence, placement);
  if (placementRefusal) {
    console.error(placementRefusal);
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
  // EXPORT_CODE_RESULT is the machine line; the placement follows it on EVERY delivered format and
  // form (static, video, html, code-source, embed). Wrapping `done` rather than editing each of the
  // six hand-over sites is what keeps a future seventh from silently shipping without it.
  const done = (payload) => {
    console.log("EXPORT_CODE_RESULT " + JSON.stringify(payload));
    if (placement.kind === "undeclared") return;
    console.log(
      "PLACEMENT_JSON " + JSON.stringify({ proposalId: id, placement }),
    );
    console.log(placementBlock(id, placement, placementCopy(uiLang())));
  };

  // S4d editorial gate: re-verify human sign-offs against the exact bytes about to ship.
  // Resolved via resolveProfile — --profile OVERRIDES, else auto-discovered from cwd (see
  // resolveProfile above). Throws (via fail(), matching the rest of this script's refusal
  // shape) when a requiredSigner is missing/stale/invalid; with no requiredSigners it never
  // blocks — just prints the honest signed/unsigned state so it is recorded in the export
  // transcript.
  const resolvedProfilePath = resolveProfilePath(flags);
  const profile = resolveProfile(flags);
  const editorialGate = (artifactBytes) => {
    try {
      const { signedBy, unsigned } = assertEditoriallyCleared(
        report,
        id,
        profile,
        artifactBytes,
      );
      // TWO lines, one state: the machine token (guards, transcript and QA checks key on it)
      // and the sentence a person can read. SKILL.md's voice rule relays the second, never
      // the first — "LLM render-approval only" is the orchestrator talking to itself.
      const say = signoffCopy(uiLang());
      console.log(
        unsigned
          ? "EDITORIAL: unsigned — LLM render-approval only"
          : `EDITORIAL: signed by ${signedBy.join(", ")}`,
      );
      console.log(unsigned ? say.unsigned : say.signed(signedBy.join(", ")));
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
      // `skippedHosted`, never `skipped`: this delivery is not a folder, it is bytes the
      // newsroom does not own. SKILL.md relays the SIGNOFF line and not the machine one, so a
      // reused wrong reason here would be the ONLY thing the journalist is told, on the routine
      // hosted-DW interactive path.
      console.log(signoffCopy(uiLang()).skippedHosted);
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
    // The embed is ALREADY LIVE at `url` by this point (either just deployed, or the hosted
    // producer's pre-existing publicUrl) — mkdir + write are only local bookkeeping standing
    // between "live" and "recorded as delivered". Every other delivery form mkdirs exportDir
    // right before its write; mirror that here instead of inventing a different shape. But
    // unlike a local media copy, losing THIS write does not just mean "no file" — it means a
    // live, untracked public deployment nobody can find. True atomicity across a network
    // deploy and a local fs write is not achievable (two different systems, no shared
    // transaction), so the goal is narrower: never let that URL vanish into an uncaught crash.
    // Any failure here (still possible after the mkdir fix — a full disk, a permission error)
    // is caught and reported through the same fail() path as every other refusal in this
    // script, with the live URL spelled out, instead of an unhandled exception whose raw stack
    // trace does not say "this is already public" or "here is the link to save".
    try {
      mkdirSync(exportDir, { recursive: true });
      writeFileSync(join(exportDir, "EMBED_URL.txt"), url + "\n");
    } catch (e) {
      fail(
        `${format} form=embed: the embed is LIVE at ${url} but recording it under ${absExportDir} failed (${e.message}) — ` +
          `this is a live, UNTRACKED deployment: save the URL now, then re-run the --form embed delivery to retry recording it locally.`,
      );
    }
    assertDelivered(readdirSync(exportDir), {
      format,
      form: "embed",
      dir: exportDir,
    });
    done({ format, form: "embed", url, exportDir: absExportDir });
    return;
  }

  if (form === "cms") {
    // The article is the journalist's answer, not a default. Refusing here rather than in
    // publish-cms keeps the "never invent a slug" rule at BOTH doors — this is the one an
    // orchestrator relaying the proposal's deliver command actually walks through.
    if (!article)
      fail(
        `${format} form=cms needs --article <slug>: ask the journalist which of their articles the visual belongs in — never choose one.`,
      );
    if (!after)
      fail(
        `${format} form=cms needs --after <position|end>: SHOW the journalist where the visual would go and get their answer before writing into their article. ` +
          `"end" is a valid answer; a missing flag is not.`,
      );
    if (isHostedEmbed)
      fail(
        `${format} form=cms is not available for a hosted Datawrapper interactive: the CMS block carries the visual's own bytes, and this one lives on the provider's servers — deliver it with --form embed and paste that link into the article.`,
      );
    if (!interactive)
      fail(`${format} form=cms found no html to insert in ${outDir}`);
    let out;
    try {
      out = execFileSync(
        "bun",
        [
          PUBLISH_CMS_SCRIPT,
          join(outDir, interactive),
          "--article",
          article,
          "--after",
          after,
          "--results",
          resolve(resultsPath),
          "--id",
          id,
          ...(resolvedProfilePath
            ? ["--profile", resolve(resolvedProfilePath)]
            : []),
        ],
        { encoding: "utf8" },
      );
    } catch (e) {
      // publish-cms refuses on an unconfigured route, an unknown article, or a block it cannot
      // round-trip. Every one of those messages names the cause and the way out — surface it
      // whole rather than falling through to record a delivery that did not happen.
      const msg = (e.stderr || e.stdout || e.message || "").toString().trim();
      fail(msg || `${format} form=cms insertion failed`);
    }
    const line = out.split("\n").find((l) => l.startsWith("CMS_ARTICLE_URL "));
    if (!line) fail("publish-cms did not return a CMS_ARTICLE_URL");
    const url = line.slice("CMS_ARTICLE_URL ".length).trim();
    if (!isHostedUrl(url))
      fail(
        `${format} form=cms did not resolve a hosted https URL (got ${JSON.stringify(url)})`,
      );
    // publish-cms already wrote CMS_ARTICLE_URL.txt beside the artifact; the export folder is
    // what the journalist is handed, so the record belongs here too.
    try {
      mkdirSync(exportDir, { recursive: true });
      writeFileSync(join(exportDir, "CMS_ARTICLE_URL.txt"), url + "\n");
    } catch (e) {
      fail(
        `${format} form=cms: the visual IS in the article's draft at ${url} but recording it under ${absExportDir} failed (${e.message}) — save that link, then re-run the delivery.`,
      );
    }
    // Relayed verbatim by the orchestrator: the one fact a journalist could otherwise get
    // wrong is that nothing is live yet.
    const draftLine = out.split("\n").find((l) => l.startsWith("CMS_DRAFT_ONLY "));
    if (draftLine) console.log(draftLine);
    assertDelivered(readdirSync(exportDir), {
      format,
      form: "cms",
      dir: exportDir,
    });
    done({ format, form: "cms", url, exportDir: absExportDir });
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
            reason: uiCopy().missingEmbedKeysReason(embedStatus.reason),
            missingKeys: embedStatus.missing,
          }),
      command: `bun ${DEPLOY_EMBED_SCRIPT} ${join(absExportDir, interactive)} ${id} --results ${resolve(resultsPath)} --id ${id}`,
      deliver: `${deliverBase} --form embed`,
    };
    // Form d — INTO the journalist's own article. Offered only when the newsroom's CMS route is
    // actually configured: an unconfigured one is announced at INPUT as "le CMS n'est pas
    // branché", and repeating the offer here would promise a delivery that refuses at the write.
    //
    // Unlike a/b/c it needs one thing from the journalist that no script can derive — WHICH
    // article. `needsArticle` says so in the machine line, so the orchestrator asks instead of
    // inventing a slug, and the deliver command carries the placeholder it must replace.
    const cmsStatus = cmsDeliveryStatus({ endpoint: cmsEndpoint() });
    forms.d = {
      label: "Directement dans l'article (CMS)",
      available: cmsStatus.ready,
      needsArticle: true,
      // The second thing no script can derive: WHERE in the piece. The anchor suggest-article
      // computed is a proposal, not an answer — the journalist confirms it before anything is
      // written into their article.
      needsPosition: true,
      ...(cmsStatus.ready
        ? {}
        : { reason: cmsStatus.reason, missingKeys: cmsStatus.missing }),
      command: `bun ${PUBLISH_CMS_SCRIPT} ${join(absExportDir, interactive)} --article <slug> --after <position|end> --results ${resolve(resultsPath)} --id ${id}`,
      deliver: `${deliverBase} --form cms --article <slug> --after <position|end>`,
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
  // asks which form (a / b / c), then re-runs export-code with --form <choice>. Localised via
  // the interface-language copy layer (issue #6): a fresh install speaks English here, never
  // the shipped French literals of before.
  const copy = uiCopy();
  const relay = ["EXPORT_FORMS_PROPOSAL", copy.intro];
  // forms.a, when present, is always the runnable React source bundle (a markerless outDir has
  // no code-source deliverable, so form a is simply omitted — see above).
  if (forms.a) relay.push(copy.formCodeSource(forms.a.path));
  if (forms.b) relay.push(copy.formHtml(forms.b.path));
  if (forms.c)
    relay.push(
      forms.c.url
        ? copy.formEmbedLive(forms.c.url)
        : forms.c.available === false
          ? copy.formEmbedMissingKeys(forms.c.missingKeys.join(", "))
          : copy.formEmbedAvailable,
    );
  if (forms.d)
    relay.push(
      forms.d.available === false
        ? copy.formCmsMissingKeys(
            [...forms.d.missingKeys, ...(forms.d.missingKeys.length ? [] : ["endpoint"])].join(", "),
          )
        : copy.formCmsAvailable,
    );
  relay.push(
    copy.question(Object.keys(forms).join(" / ")),
    // The explicit WAIT instruction, at the point of temptation. Observed violation (QA wave 10,
    // w9-double-opportunite-energie): the orchestrator emitted this proposal for two hosted-DW
    // elements, announced "Je finalise la livraison sous cette forme pour les deux", and ran
    // --form embed for both without a single journalist turn in between. The choice is the
    // journalist's — even when only one form is offered, and never presumed across elements.
    copy.waitInstruction,
    "END_EXPORT_FORMS_PROPOSAL",
  );
  console.log(relay.join("\n"));
}

if (import.meta.main) main();
