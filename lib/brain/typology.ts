// The typology: the KB sheets, read as data. One sheet per type, ONE file — the machine
// facets in the header, the prose the header points at in the body. There is no second
// registry to drift from (spec §5).
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { INTENTS } from "./intents";
import { splitFrontmatter } from "./frontmatter";
import { VISUAL_FORMATS } from "../core/vocabulary";
import { isRenderable } from "../core/registry";

const here = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = resolve(here, "../../knowledge/references");
// The families of sheets, in load order. A family with no directory is skipped, so a KB
// that does not ship maps still loads.
const FAMILIES = ["chart/types", "map/types", "image/types"];

const HeaderSchema = z.object({
  id: z.string().min(1),
  engines: z
    .record(z.string(), z.string())
    .refine((e) => Object.keys(e).length > 0, {
      message: "engines: a sheet must name at least one engine",
    }),
  intent: z.array(z.enum(INTENTS)).min(1),
  shape: z.string().min(1),
  limits: z.record(z.string(), z.number()).default({}),
  formats: z.array(z.enum(VISUAL_FORMATS)).min(1),
  bestFor: z.array(z.string().min(1)).min(1),
  notFor: z.array(z.string().min(1)).min(1),
});

export type TypeSheet = z.infer<typeof HeaderSchema> & {
  sheetPath: string;
  body: string;
};

export function loadTypology(root: string = DEFAULT_ROOT): TypeSheet[] {
  const sheets: TypeSheet[] = [];
  for (const family of FAMILIES) {
    const dir = join(root, family);
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".md"))) {
      const path = join(dir, file);
      const { data, body } = splitFrontmatter(readFileSync(path, "utf8"));
      const parsed = HeaderSchema.safeParse(data);
      if (!parsed.success)
        throw new Error(
          `typology: ${relative(root, path)} — ${parsed.error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; ")}`,
        );
      if (parsed.data.id !== file.replace(/\.md$/, ""))
        throw new Error(
          `typology: ${relative(root, path)} — id "${parsed.data.id}" disagrees with its filename`,
        );
      sheets.push({
        ...parsed.data,
        sheetPath: join(family, file),
        body,
      });
    }
  }
  return sheets;
}

export type RenderableSheet = { sheet: TypeSheet; engine: string; key: string };

// A sheet is only offerable through an engine that can render it TODAY. This is the join
// that makes a deferred type structurally unofferable (spec §3): nothing downstream has to
// remember to filter it, because it never enters the candidate set.
export function renderableSheets(
  sheets: TypeSheet[] = loadTypology(),
): RenderableSheet[] {
  const out: RenderableSheet[] = [];
  for (const sheet of sheets)
    for (const [engine, key] of Object.entries(sheet.engines))
      if (isRenderable(engine, key)) out.push({ sheet, engine, key });
  return out;
}
