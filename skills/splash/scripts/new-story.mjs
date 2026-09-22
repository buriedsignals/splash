import { lstat, mkdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

export function storyAgentGuidance() {
  return `# Splash story workspace

## Canonical output locations

- \`STORYBOARD.md\` is the persisted editorial contract. Read it before changing an output.
- \`beats/<outputId>/\` is the editable source of truth. Custom outputs keep their component, data,
  brief, render script, and \`renders/\` here. Datawrapper outputs keep \`spec.json\`,
  \`DATAWRAPPER.json\`, and \`renders/\` here.
- \`export/<outputId>/\` is the latest delivered form. Never edit it to change a visual; delivery
  replaces it from the matching beat after review.
- A hosted output records \`DEPLOYMENT.json\`, \`EMBED_URL.txt\`, and \`EMBED_CODE.html\` under its
  export directory. \`DEPLOYMENT.json.editableSource\` points back to the beat.

## Editor-feedback revisions

1. Identify the output from \`export/<outputId>/DEPLOYMENT.json\` or its handover, then work only in
   the matching \`beats/<outputId>/\` directory.
2. Record the editor's request in \`beats/<outputId>/FEEDBACK.md\`, edit the canonical component or
   Datawrapper \`spec.json\`, and rerun that beat's existing renderer/producer. In Datawrapper mode,
   use the receipt-preserving CLI from the Splash root:
   \`bun run skills/dw-beat/scripts/produce.mjs stories <slug> <outputId> <static|web> [size] --story-output\`.
   It reuses \`DATAWRAPPER.json.chartId\`; direct edits made only in Datawrapper's web editor are
   not canonical and may be overwritten by the persisted spec.
   Creating or updating \`FEEDBACK.md\` is the revision trigger: \`whereIs\` reopens production
   until a valid \`OUTPUT-REVIEW.json\` binds both the current feedback digest and current render,
   then reopens delivery until its manifest binds that feedback, review, and render.
3. Inspect the new render and obtain a new bound \`OUTPUT-REVIEW.json\` approval. An approval for the
   previous render digest cannot authorize the revision.
4. Materialise the same delivery form again. The previous export stays intact until replacement is
   complete. Hosted custom outputs redeploy to the same per-output Cloudflare project and keep the
   same public embed URL. Before promising URL continuity, inspect the existing
   \`DEPLOYMENT.json\`: a legacy receipt with \`stableAcrossRevisions: false\` must be migrated by the
   next approved deployment, and its CMS iframe must be replaced once with the new stable URL.
   Cloudflare completion and local export replacement are two phases: if local publication fails
   after the remote update, rerun delivery so its hosted-operation receipt reconciles the deployment
   and writes the matching local handover.

Never modify frozen material under \`source/\` to satisfy visual feedback, and never treat a file in
\`export/\` as production source.
`;
}

export function slugify(title) {
  return title
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Add revision guidance to a pre-feature story without overwriting story-specific instructions. */
export async function ensureStoryGuidance({ storyDir }) {
  const root = await lstat(storyDir);
  if (root.isSymbolicLink() || !root.isDirectory()) {
    throw new Error(`story workspace must be a real directory: ${storyDir}`);
  }
  for (const child of ["source", "beats", "export"]) {
    const path = join(storyDir, child);
    const found = await lstat(path);
    if (found.isSymbolicLink() || !found.isDirectory()) {
      throw new Error(`story workspace marker must be a real directory: ${path}`);
    }
  }
  const path = join(storyDir, "AGENTS.md");
  try {
    const found = await lstat(path);
    if (found.isSymbolicLink() || !found.isFile()) {
      throw new Error(`story guidance must be a regular file: ${path}`);
    }
    return { path, created: false };
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  try {
    await writeFile(path, storyAgentGuidance(), { flag: "wx" });
    return { path, created: true };
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
    const found = await lstat(path);
    if (found.isSymbolicLink() || !found.isFile()) {
      throw new Error(`story guidance must be a regular file: ${path}`);
    }
    return { path, created: false };
  }
}

/**
 * A root a beat cannot render from is not a root, and saying so here costs nothing. A story
 * created in a bare directory walked intake, framing and storyboard and into production before
 * anything noticed; the first symptom would have been an unresolved `#shared/...` specifier deep
 * in a render, several gates after the mistake. `package.json` carries the `#shared/*` mapping and
 * `shared/` is what it maps to, so those two are the whole question.
 */
async function assertRootCanRender(root) {
  const missing = [];
  for (const [name, said, wanted] of [
    ["package.json", "package.json", "file"],
    ["shared", "shared/", "directory"],
  ]) {
    try {
      const found = await stat(join(root, name));
      if (wanted === "directory" ? !found.isDirectory() : !found.isFile()) missing.push(said);
    } catch {
      missing.push(said);
    }
  }
  if (missing.length === 0) return;
  throw new Error(
    `${root} is not a Splash root: it carries no ${missing.join(" and no ")}. A beat written there cannot resolve "#shared/..." and cannot render. Create the story under the root the installer provisioned, or run the installer against this one.`,
  );
}

export async function createStory({ root, title }) {
  await assertRootCanRender(root);
  const slug = slugify(title);
  if (!slug) {
    throw new Error(`title carries no usable content for a folder name`);
  }
  const dir = join(root, "stories", slug);
  try {
    await stat(dir);
    throw new Error(`story "${slug}" already exists at ${dir}`);
  } catch (error) {
    if (!error.message.includes("already exists")) {
      for (const child of ["source", "beats", "export"]) {
        await mkdir(join(dir, child), { recursive: true });
      }
      await ensureStoryGuidance({ storyDir: dir });
      return { slug, dir };
    }
    throw error;
  }
}
