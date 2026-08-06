import { mkdir, stat } from "node:fs/promises";
import { join } from "node:path";

export function slugify(title) {
  return title
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function createStory({ root, title }) {
  const slug = slugify(title);
  const dir = join(root, "stories", slug);
  try {
    await stat(dir);
    throw new Error(`story "${slug}" already exists at ${dir}`);
  } catch (error) {
    if (!error.message.includes("already exists")) {
      for (const child of ["source", "beats", "export"]) {
        await mkdir(join(dir, child), { recursive: true });
      }
      return { slug, dir };
    }
    throw error;
  }
}
