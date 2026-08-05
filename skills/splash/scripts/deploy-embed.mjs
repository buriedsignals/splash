// EXPORT (embed-link path): publish a produced artifact to the JOURNALIST'S OWN Cloudflare
// Pages account and print an iframe-ready URL. The project lives on the journalist's account,
// not a shared central one — SPLASH_EMBED_PROJECT names it and must identify the newsroom,
// because it becomes the public URL <visual>.<project>.pages.dev.
//   bun deploy-embed.mjs <htmlFileOrDir> <slug> --results <report.json> --id <proposalId>
//
// Pure fetch — no wrangler CLI, no Node.js runtime requirement. Protocol + measurements:
// docs/superpowers/specs/2026-07-19-cloudflare-pages-embed-adapter-design.md
import { mkdtempSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assertEditoriallyCleared, assertShippable } from "../src/export-guard.ts";
import { resolveProfile } from "../src/resolve-profile.ts";
import { readDecorState } from "../../../lib/newsroom/decor.ts";
import { resolveLanguage } from "../../../lib/newsroom/language.ts";
import { signoffCopy } from "../../../lib/newsroom/ui-copy.ts";
import {
  deployDirectory,
  embedSlug,
  ensureProject,
  resolveAliasUrl,
  resolveEmbedConfig,
  servedMatcher,
  stageArtifact,
  verifyServed,
} from "../src/cloudflare-pages.ts";

export {
  embedSlug,
  embedTokenConfigured,
  servedMatcher,
  stageArtifact,
} from "../src/cloudflare-pages.ts";

// The sign-off state is printed twice: the machine token (guards + QA checks key on it) and,
// beside it, the sentence a journalist can read. Same resolution as export-code.mjs's uiCopy —
// SPLASH_UI_LANG overrides for one run, else the newsroom's saved interface language, else
// English. Read-only: this script must never create state as a side effect.
function signoffSay() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
  const { ui } = resolveLanguage({
    override: { ui: process.env.SPLASH_UI_LANG },
    uiLang: readDecorState(root).uiLang,
  });
  return signoffCopy(ui);
}

// Splits argv into positionals and `--flag value` pairs, so the required --results/--id
// flags can sit alongside the existing positional args in any order.
function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (
      a === "--results" ||
      a === "--id" ||
      a === "--format" ||
      a === "--profile"
    )
      flags[a.slice(2)] = argv[++i];
    else positional.push(a);
  }
  return { positional, flags };
}

if (import.meta.main) {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const [artifactPath, rawSlug] = positional;
  const { results: resultsPath, id } = flags;
  if (!artifactPath || !rawSlug || !resultsPath || !id) {
    console.error(
      "usage: deploy-embed.mjs <htmlFileOrDir> <slug> --results <report.json> --id <proposalId>",
    );
    process.exit(1);
  }

  // The one mechanical gate, before any upload: refuse unless this exact proposal was
  // actually produced AND the human approved the render.
  let hostedUrl = null;
  try {
    const report = JSON.parse(readFileSync(resultsPath, "utf8"));
    assertShippable(report, id);
    hostedUrl = report.results.find((x) => x.id === id)?.publicUrl ?? null;

    // S4d editorial gate: re-verify human sign-offs against the exact bytes staged for upload,
    // BEFORE any network/staging step — a refusal must leave nothing partially deployed and no
    // faked URL. --profile OVERRIDES when given (export-code forwards its resolved path here);
    // absent, auto-discovered from cwd (resolveProfile); neither → empty profile (opt-in
    // default, never blocks). When the positional is a directory (no single owned artifact)
    // there is nothing to re-verify a sign-off against — that IS a bypass when requiredSigners
    // is set (an unsigned directory artifact would otherwise publish unchecked), so refuse
    // outright rather than silently skip. With no requiredSigners the skip+proceed stays
    // (opt-in preserved).
    const profile = resolveProfile(flags);
    const bytes = statSync(artifactPath).isFile()
      ? readFileSync(artifactPath)
      : null;
    if (bytes) {
      const { signedBy, unsigned } = assertEditoriallyCleared(
        report,
        id,
        profile,
        bytes,
      );
      const say = signoffSay();
      console.log(
        unsigned
          ? "EDITORIAL: unsigned — LLM render-approval only"
          : `EDITORIAL: signed by ${signedBy.join(", ")}`,
      );
      console.log(unsigned ? say.unsigned : say.signed(signedBy.join(", ")));
    } else if ((profile.requiredSigners ?? []).length > 0) {
      throw new Error(
        "refusing to deploy a directory artifact with requiredSigners set — no single artifact to re-verify (S4d)",
      );
    } else {
      console.log(
        "EDITORIAL: skipped (artifact is a directory — no single owned artifact to re-verify; see S4d follow-up)",
      );
      console.log(signoffSay().skipped);
    }
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }

  // FAIL-FAST, before any network call: without credentials the embed cannot be delivered.
  // Never let the upload stall mid-deploy or hand back a placeholder that fakes delivery.
  let cfg;
  try {
    cfg = resolveEmbedConfig(process.env);
  } catch (e) {
    if (!hostedUrl) {
      console.error(e.message);
      process.exit(1);
    }
  }

  if (hostedUrl && !cfg) {
    console.log("EMBED_URL " + hostedUrl);
    process.exit(0);
  }

  const slug = embedSlug(rawSlug);
  const stageDir = join(mkdtempSync(join(tmpdir(), "splash-embed-")), "site");
  // The FORMAT decides the served filename and content type (index.html / index.png / index.mp4).
  // Omitting it made artifactMediaFor fall through to its html default, so an mp4 would have been
  // uploaded as index.html — served with the wrong type, and then "verified" by reading binary as
  // text. Defaults to interactive, which is what every caller meant before video had a form.
  const artifactFormat = flags.format ?? "interactive";
  let stagedName;
  try {
    stagedName = stageArtifact(artifactPath, stageDir, artifactFormat);
  } catch (e) {
    console.error(`cannot stage ${artifactPath} for upload: ${e.message}`);
    process.exit(1);
  }

  try {
    await ensureProject(cfg);
    const { deploymentId } = await deployDirectory(stageDir, slug, cfg);
    const url = await resolveAliasUrl(deploymentId, cfg);

    // A brand-new project needs ~100s of edge provisioning; this can legitimately take a
    // while on a newsroom's FIRST embed, and silence would read as a hang.
    console.error(`embed uploaded — waiting for ${url} to serve the artifact...`);
    // Always verify against the staged entry point — that is literally what the edge serves.
    // Verified against what was ACTUALLY staged, not against a hard-coded index.html. For a
    // media file the proof is its byte length: servedMatcher's text slice is meaningless on
    // binary, and reading an mp4 as utf8 would corrupt the comparison rather than fail it.
    const stagedPath = join(stageDir, stagedName);
    await verifyServed(
      url,
      stagedName.endsWith(".html")
        ? servedMatcher(readFileSync(stagedPath, "utf8"))
        : ((bytes) => bytes.length === statSync(stagedPath).size),
    );

    console.log("EMBED_URL " + url);
  } catch (e) {
    console.error(`cloudflare pages deploy failed: ${e.message}`);
    process.exit(1);
  }
}
