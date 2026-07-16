// EXPORT (embed-link path): upload a produced HTML to the JOURNALIST'S OWN fly.io host app and print
// an iframe-ready URL. The host lives on the journalist's fly.io account, not a shared central one —
// so the app name must be supplied (fly.io app names are globally unique; there is no shared default).
// Requires a one-time host setup on the journalist's account (see skills/splash/SKILL.md).
//   bun deploy-embed.mjs <htmlFile> <slug> --results <report.json> --id <proposalId> [appName]
//   (appName falls back to $SPLASH_EMBED_APP)
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
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

export function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// The journalist's own fly.io app name — from the CLI arg or $SPLASH_EMBED_APP. Required: there is
// no shared fallback, because a fixed name could only ever belong to one fly.io account worldwide.
export function resolveApp(argApp, env = process.env) {
  const app = (argApp ?? env.SPLASH_EMBED_APP ?? env.ATELIER_EMBED_APP ?? "").trim();
  if (!app)
    throw new Error(
      "no fly.io app: pass the journalist's own app name as the 3rd argument or set $SPLASH_EMBED_APP (see skills/splash/SKILL.md for one-time setup)",
    );
  return app;
}

export function embedUrl(app, slug) {
  return `https://${app}.fly.dev/${slug}/`;
}

// Whether a fly.io deploy is even POSSIBLE here: flyctl authenticates via FLY_API_TOKEN. Without
// it the upload stalls, so a self-hosted embed cannot be delivered — the caller must refuse up
// front rather than half-deploy or hand back a placeholder URL that fakes "delivered".
export function flyTokenConfigured(env = process.env) {
  return (env.FLY_API_TOKEN ?? "").trim() !== "";
}

if (import.meta.main) {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const [htmlFile, rawSlug, argApp] = positional;
  const { results: resultsPath, id } = flags;
  if (!htmlFile || !rawSlug || !resultsPath || !id) {
    console.error(
      "usage: deploy-embed.mjs <htmlFile> <slug> --results <report.json> --id <proposalId> [appName]",
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
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  // FAIL-FAST, before any flyctl call: a self-hosted embed needs FLY_API_TOKEN to deploy. Without
  // it (and with no already-live hosted publicUrl to fall back to), refuse now with an actionable
  // message — never let the upload stall mid-deploy or hand back a placeholder that fakes delivery.
  if (!flyTokenConfigured() && !hostedUrl) {
    console.error(
      "embed delivery needs FLY_API_TOKEN (create a deploy token with `flyctl tokens create deploy`) — add it to /splash/.env, or choose the standalone HTML form (b) instead",
    );
    process.exit(1);
  }
  let APP;
  try {
    APP = resolveApp(argApp);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  // htmlFile is interpolated unquoted into the sftp command stream below — whitespace would
  // break the `put` line, a newline could inject a second sftp command. Reject rather than
  // quote: a valid built artifact path should never contain either.
  if (/\s/.test(htmlFile)) {
    console.error(
      `refusing to upload: htmlFile path contains whitespace/newline ("${htmlFile}") — this would break or inject into the sftp command stream. Move the file to a path without spaces.`,
    );
    process.exit(1);
  }
  const slug = slugify(rawSlug);
  // Upload htmlFile → /data/<slug>/index.html on the host app via flyctl sftp.
  try {
    execFileSync(
      "flyctl",
      ["ssh", "sftp", "shell", "-a", APP],
      { input: `put ${htmlFile} /data/${slug}/index.html\n`, stdio: ["pipe", "inherit", "inherit"] },
    );
  } catch (e) {
    console.error("fly upload failed — is the host app set up? see skills/splash/SKILL.md");
    process.exit(1);
  }
  console.log("EMBED_URL " + embedUrl(APP, slug));
}
