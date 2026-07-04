// EXPORT (embed-link path): upload a produced HTML to the persistent fly.io host app and print an
// iframe-ready URL. Requires a one-time host setup (see skills/atelier/SKILL.md).
//   bun deploy-embed.mjs <htmlFile> <slug>
import { execFileSync } from "node:child_process";

const APP = process.env.ATELIER_EMBED_APP ?? "atelier-embeds";

export function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function embedUrl(app, slug) {
  return `https://${app}.fly.dev/${slug}/`;
}

if (import.meta.main) {
  const [htmlFile, rawSlug] = process.argv.slice(2);
  if (!htmlFile || !rawSlug) {
    console.error("usage: deploy-embed.mjs <htmlFile> <slug>");
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
