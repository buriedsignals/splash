// EXPORT (embed-link path): upload a produced HTML to the JOURNALIST'S OWN fly.io host app and print
// an iframe-ready URL. The host lives on the journalist's fly.io account, not a shared central one —
// so the app name must be supplied (fly.io app names are globally unique; there is no shared default).
// Requires a one-time host setup on the journalist's account (see skills/atelier/SKILL.md).
//   bun deploy-embed.mjs <htmlFile> <slug> --results <report.json> --id <proposalId> [appName]
//   (appName falls back to $ATELIER_EMBED_APP)
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

// The journalist's own fly.io app name — from the CLI arg or $ATELIER_EMBED_APP. Required: there is
// no shared fallback, because a fixed name could only ever belong to one fly.io account worldwide.
export function resolveApp(argApp, env = process.env) {
  const app = (argApp ?? env.ATELIER_EMBED_APP ?? "").trim();
  if (!app)
    throw new Error(
      "no fly.io app: pass the journalist's own app name as the 3rd argument or set $ATELIER_EMBED_APP (see skills/atelier/SKILL.md for one-time setup)",
    );
  return app;
}

export function embedUrl(app, slug) {
  return `https://${app}.fly.dev/${slug}/`;
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
  try {
    const report = JSON.parse(readFileSync(resultsPath, "utf8"));
    assertShippable(report, id);
  } catch (e) {
    console.error(e.message);
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
    console.error("fly upload failed — is the host app set up? see skills/atelier/SKILL.md");
    process.exit(1);
  }
  console.log("EMBED_URL " + embedUrl(APP, slug));
}
