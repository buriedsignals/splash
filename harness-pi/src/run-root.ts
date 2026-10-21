// A run root is a Splash root outside the repository: the harness never runs a story inside the
// checkout's own stories/, because two repository tests pin what that directory contains and the
// key-scanning test reads every untracked byte of the checkout.
import { cp, copyFile, mkdir, stat, symlink } from "node:fs/promises";
import { existsSync, realpathSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import { createStory } from "../../skills/splash/scripts/new-story.mjs";
import { freezeSource } from "../../skills/intake/scripts/freeze.mjs";

const TEMPLATE = join("skills", "splash", "assets", "root-template");

function isInside(child: string, parent: string): boolean {
  const rel = relative(parent, child);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function realOrSelf(path: string): string {
  return existsSync(path) ? realpathSync(path) : path;
}

export async function createRunRoot({
  checkout,
  dir,
  install = true,
}: {
  checkout: string;
  dir: string;
  install?: boolean;
}): Promise<string> {
  const root = resolve(dir);
  if (isInside(realOrSelf(root), realpathSync(checkout))) {
    throw new Error(
      `run root ${root} is inside the checkout ${checkout}; choose a directory outside it`,
    );
  }
  if (existsSync(root)) throw new Error(`run root ${root} already exists`);

  const template = join(checkout, TEMPLATE);
  await mkdir(join(root, "stories"), { recursive: true });
  await copyFile(join(template, "package.json"), join(root, "package.json"));
  await copyFile(join(template, "tsconfig.json"), join(root, "tsconfig.json"));
  await copyFile(
    join(template, "NEWSROOM.example.md"),
    join(root, "NEWSROOM.md"),
  );
  // shared/ is vendored byte for byte: preflight refuses a root whose copy differs from the template.
  await cp(join(template, "shared"), join(root, "shared"), { recursive: true });
  // skills/ and proof/ are linked, never copied: scaffolds copy worked examples out of proof/.
  await symlink(join(checkout, "skills"), join(root, "skills"), "dir");
  await symlink(join(checkout, "proof"), join(root, "proof"), "dir");

  if (install) {
    const proc = Bun.spawn(["bun", "install"], {
      cwd: root,
      stdout: "pipe",
      stderr: "pipe",
    });
    const code = await proc.exited;
    if (code !== 0) {
      const err = await new Response(proc.stderr).text();
      throw new Error(`bun install failed in run root ${root}: ${err.trim()}`);
    }
  }
  return root;
}

export async function stageStory({
  root,
  checkout,
  slug,
}: {
  root: string;
  checkout: string;
  slug: string;
}): Promise<{ storyDir: string }> {
  const source = join(checkout, "stories", slug, "source");
  const articlePath = join(source, "article.md");
  const dataPath = join(source, "data.csv");
  for (const path of [articlePath, dataPath]) {
    try {
      await stat(path);
    } catch {
      throw new Error(
        `story "${slug}" cannot be staged: ${relative(checkout, path)} is missing`,
      );
    }
  }
  const { slug: created, dir } = await createStory({ root, title: slug });
  if (created !== slug)
    throw new Error(`story "${slug}" was created as "${created}"`);
  await freezeSource({ storyDir: dir, articlePath, dataPath });
  return { storyDir: dir };
}
