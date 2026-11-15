/**
 * PLACE NAMES IN THE STORY'S LANGUAGE (owner, 2026-11-15: « translate »).
 *
 * A French story drew "Russia" and "Czechia" on its plate: data.json carried the source's English names
 * and nothing else, and every craft guard matches the marks against data.json, so a beat could not
 * write "Russie" without drawing a name the data does not hold. The analyst adds the names in the
 * story's language as one more column, derived from the ISO code beside them, and says so in
 * DATA-NOTES.md; the source column is untouched.
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createStory } from "../../splash/scripts/new-story.mjs";
import { freezeSource } from "../../intake/scripts/freeze.mjs";
import { buildData, localizePlaces } from "../scripts/build-data.mjs";

const TEMPLATE = join(
  import.meta.dirname,
  "..",
  "..",
  "splash",
  "assets",
  "root-template",
);

const ARTICLE = `---
source: A newsroom
url: https://example.org/a-story
byline: A reporter
published: 2026-09-01
---

# Le bas-carbone par pays

Compté par pays, le bas-carbone pèse 60 % de la production.
`;

// ISO alpha-3 codes beside English names, as Our World in Data ships them; one aggregate has none.
const DATA = `entity,code,share
Russia,RUS,35.9
Czechia,CZE,58.2
Germany,DEU,61.0
Kosovo,OWID_KOS,4.1
`;

function storyboard(language: string) {
  return `---
takeaway: "Compté par pays, le bas-carbone pèse 60 % de la production."
subject: "Les pays européens"
comparison: "La Russie"
limits: "Électricité, 2024."
placement: "Après le premier paragraphe."
credit: "Ember"
effectiveDate: "2026-09-23"
grounding: unverifiable
language: ${language}
slots:
  - id: share
    proves: "Compté par pays, le bas-carbone pèse 60 %."
    medium: chart
    format: static
    size: landscape
    reachable: yes
    intent: "rank or compare one value per category"
    candidates: ["Bar and column", "Lollipop"]
    interaction: none
    chosen: "Bar and column"
    producer: custom
---

# Storyboard
`;
}

async function provisionRoot(target: string) {
  const manifest = JSON.parse(
    await readFile(join(TEMPLATE, "package.json"), "utf8"),
  );
  await writeFile(
    join(target, "package.json"),
    `${JSON.stringify({ ...manifest, name: "splash-root" }, null, 2)}\n`,
  );
  await cp(join(TEMPLATE, "shared"), join(target, "shared"), {
    recursive: true,
  });
  for (const name of Object.keys(manifest.dependencies ?? {})) {
    const dir = join(target, "node_modules", name);
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, "package.json"),
      `${JSON.stringify({ name, version: "0.0.0" })}\n`,
    );
  }
}

let root: string;
let storyDir: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "splash-place-names-"));
  await provisionRoot(root);
  const made = await createStory({
    root,
    title: "Low carbon by country",
  });
  storyDir = made.dir;
  const articlePath = join(root, "article.md");
  const dataPath = join(root, "data.csv");
  await writeFile(articlePath, ARTICLE);
  await writeFile(dataPath, DATA);
  await freezeSource({ storyDir, articlePath, dataPath });
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

const beatFile = (name: string) => join(storyDir, "beats", "share", name);

describe("place names in the story's language", () => {
  it("should add the French names beside the English ones when the story is in French", async () => {
    await writeFile(join(storyDir, "STORYBOARD.md"), storyboard("fr"));
    await buildData({ storyDir, slotId: "share" });
    const contract = JSON.parse(await readFile(beatFile("data.json"), "utf8"));
    const at = contract.columns.findIndex((c: { name: string }) => c.name === "entity_fr");
    expect(contract.rows.map((r: unknown[]) => r[at])).toEqual(["Russie", "Tchéquie", "Allemagne", "Kosovo"]);
  });

  it("should keep the source's own name where the code is no country", async () => {
    await writeFile(join(storyDir, "STORYBOARD.md"), storyboard("fr"));
    await buildData({ storyDir, slotId: "share" });
    const notes = await readFile(beatFile("DATA-NOTES.md"), "utf8");
    expect(notes).toMatch(/entity_fr.*code.*1 kept as in the source/s);
  });

  it("should add nothing when the story is in English", async () => {
    await writeFile(join(storyDir, "STORYBOARD.md"), storyboard("en"));
    await buildData({ storyDir, slotId: "share" });
    const contract = JSON.parse(await readFile(beatFile("data.json"), "utf8"));
    expect(contract.columns.map((c: { name: string }) => c.name)).toEqual(["entity", "code", "share"]);
  });
});

describe("place names with no code column", () => {
  it("should translate a column of English country names when no ISO code sits beside it", () => {
    const columns = [{ name: "name", type: "text" }, { name: "country", type: "text" }, { name: "mw", type: "number" }];
    const rows = [["Kursk NPP", "Russia", 4000], ["Kyiv", "Ukraine", null], ["Bucharest", "Romania", null]];
    localizePlaces(columns, rows, "fr");
    expect(rows.map((r) => r[3])).toEqual(["Russie", "Ukraine", "Roumanie"]);
  });
});
