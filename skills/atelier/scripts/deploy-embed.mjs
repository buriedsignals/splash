// EXPORT (embed-link path): upload a produced HTML to the JOURNALIST'S OWN fly.io host app and print
// an iframe-ready URL. The host lives on the journalist's fly.io account, not a shared central one —
// so the app name must be supplied (fly.io app names are globally unique; there is no shared default).
// Requires a one-time host setup on the journalist's account (see skills/atelier/SKILL.md).
//   bun deploy-embed.mjs <htmlFile> <slug> [appName]   (appName falls back to $ATELIER_EMBED_APP)
import { execFileSync } from "node:child_process";

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
  const [htmlFile, rawSlug, argApp] = process.argv.slice(2);
  if (!htmlFile || !rawSlug) {
    console.error("usage: deploy-embed.mjs <htmlFile> <slug> [appName]");
    process.exit(1);
  }
  let APP;
  try {
    APP = resolveApp(argApp);
  } catch (e) {
    console.error(e.message);
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
