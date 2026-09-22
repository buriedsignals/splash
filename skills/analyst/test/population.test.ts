/**
 * O2 — THE ONE CONSEQUENTIAL EDITORIAL DECISION THAT NO FILE RECORDED.
 *
 * Every other decision in this chain is written down and gated: the medium, the format, the size,
 * the intent, the treatment, the producer, the palette, the takeaway's own shape. Which ROWS a beat
 * draws was not. The analyst carried every frozen row and said so — "Exclusions: None. All 10630
 * frozen rows are carried" — so a beat proving one thing about twenty-seven countries in one year
 * received two hundred and fourteen countries across fifty-two years, and the choice of which
 * twenty-seven to draw was made inside a hand-written component, recorded nowhere. Draw the wrong
 * twenty-seven and no gate, no file and no test could tell.
 *
 * The ruling (owner, 2026-09-23) was: it belongs on the SLOT, beside the other answers. So the slot
 * names its population, and the analyst FILTERS the contract to it — which is what makes the record
 * load-bearing rather than decorative. A component cannot draw a row that is not in `data.json`.
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createStory } from "../../splash/scripts/new-story.mjs";
import { freezeSource } from "../../intake/scripts/freeze.mjs";
import { buildData } from "../scripts/build-data.mjs";

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

# Three towns carry the outage

Three of the five towns on the valley line account for almost every hour of lost supply in 2024.
`;

// Two periods, five towns — so a population that names one period and three towns has something
// real to exclude, and a test can count what was left out.
const DATA = `town,year,outage_hours
Alder,2023,110
Birch,2023,98
Cedar,2023,74
Dale,2023,12
Elm,2023,6
Alder,2024,412
Birch,2024,388
Cedar,2024,301
Dale,2024,22
Elm,2024,9
`;

function storyboard(populationBlock: string) {
  return `---
takeaway: "Three of the five valley towns carried 1101 of the 1132 outage hours recorded in 2024."
subject: "Alder, Birch and Cedar"
comparison: "Dale and Elm, the two towns that barely register"
limits: "Recorded hours are what the network logged."
placement: "After the paragraph naming the three towns."
credit: "The network operator"
effectiveDate: "2026-09-23"
grounding: unverifiable
language: en
slots:
  - id: three-towns
    proves: "Three towns hold almost every recorded outage hour."
    medium: chart
    format: static
    size: landscape
    reachable: yes
    intent: "rank or compare one value per category"
    candidates: ["Bar and column", "Lollipop"]
    interaction: none
    chosen: "Bar and column"
    producer: custom
${populationBlock}---

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
  root = await mkdtemp(join(tmpdir(), "splash-population-"));
  await provisionRoot(root);
  const made = await createStory({
    root,
    title: "Three towns carry the outage",
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

const beatFile = (name: string) => join(storyDir, "beats", "three-towns", name);

describe("the population a slot records", () => {
  it("carries only the rows the slot names, and says what it left out", async () => {
    await writeFile(
      join(storyDir, "STORYBOARD.md"),
      storyboard(
        "    populationKey: town\n    populationPeriod: 2024\n    population: [Alder, Birch, Cedar]\n",
      ),
    );

    await buildData({ storyDir, slotId: "three-towns" });
    const contract = JSON.parse(await readFile(beatFile("data.json"), "utf8"));

    expect(contract.rows).toHaveLength(3);
    expect(contract.rows.map((r: (string | number)[]) => r[0]).sort()).toEqual([
      "Alder",
      "Birch",
      "Cedar",
    ]);
    expect(contract.rows.every((r: (string | number)[]) => r[1] === 2024)).toBe(
      true,
    );

    const notes = await readFile(beatFile("DATA-NOTES.md"), "utf8");
    expect(notes).toContain("7 of 10 frozen rows");
    expect(notes).toContain("the population recorded on the slot");
    expect(notes).not.toContain("Exclusions\n\n- None.");
  });

  it("refuses a population naming a value the frozen table does not hold", async () => {
    await writeFile(
      join(storyDir, "STORYBOARD.md"),
      storyboard(
        "    populationKey: town\n    populationPeriod: 2024\n    population: [Alder, Birch, Willow]\n",
      ),
    );

    // A typo in a recorded population must fail loud. Silently drawing two towns where the slot
    // named three is the exact failure this field exists to make impossible.
    await expect(
      buildData({ storyDir, slotId: "three-towns" }),
    ).rejects.toThrow(/Willow/);
    expect(await Bun.file(beatFile("data.json")).exists()).toBe(false);
  });

  it("refuses a population keyed on a column the table does not have", async () => {
    await writeFile(
      join(storyDir, "STORYBOARD.md"),
      storyboard("    populationKey: commune\n    population: [Alder]\n"),
    );
    await expect(
      buildData({ storyDir, slotId: "three-towns" }),
    ).rejects.toThrow(/commune/);
  });

  it("carries everything when no population is recorded, and says that is what happened", async () => {
    await writeFile(join(storyDir, "STORYBOARD.md"), storyboard(""));
    await buildData({ storyDir, slotId: "three-towns" });

    const contract = JSON.parse(await readFile(beatFile("data.json"), "utf8"));
    expect(contract.rows).toHaveLength(10);

    // The absence is a state the journalist can see, not a silence.
    const notes = await readFile(beatFile("DATA-NOTES.md"), "utf8");
    expect(notes).toContain("no population is recorded on the slot");
  });
});

/**
 * O7 — THE CONTRACT A STORY BEAT CANNOT BE SCAFFOLDED FROM.
 *
 * `scaffold-static-beat.mjs` scans the worked example it adapts for the files that example's own
 * runner reads, and refuses when they are not beside the beat. That rule is right: copying a runner
 * whose data is missing produces a beat that cannot run. But every chart worked example reads
 * `data.csv`, and the analyst wrote only `data.json`, so no story beat could be scaffolded — and
 * the scaffold is the only thing that writes `BRIEF.md`, without which `OUTPUT-REVIEW.json` cannot
 * bind and gate G3 can never close. The run of 2026-09-23 got past it only by writing the brief
 * by hand.
 *
 * So the contract carries both forms of the same rows: `data.json` typed, with its meta, and
 * `data.csv` as every runner in the corpus expects to read it. They cannot drift — one call writes
 * both from one list of rows.
 */
describe("the two forms of the contract", () => {
  it("writes the carried rows as a CSV beside the JSON, so a scaffold can adapt any worked example", async () => {
    await writeFile(
      join(storyDir, "STORYBOARD.md"),
      storyboard(
        "    populationKey: town\n    populationPeriod: 2024\n    population: [Alder, Birch, Cedar]\n",
      ),
    );
    const { wrote } = await buildData({ storyDir, slotId: "three-towns" });
    expect(wrote.some((p: string) => p.endsWith("data.csv"))).toBe(true);

    const csv = await readFile(beatFile("data.csv"), "utf8");
    const lines = csv.trim().split("\n");
    expect(lines[0]).toBe("town,year,outage_hours");
    // The population is applied once, to both forms: three towns, one period.
    expect(lines).toHaveLength(4);
    expect(lines[1]).toBe("Alder,2024,412");

    const contract = JSON.parse(await readFile(beatFile("data.json"), "utf8"));
    expect(contract.rows).toHaveLength(lines.length - 1);
  });

  it("writes a blank for a null, because an empty cell is what a missing reading looks like in a CSV", async () => {
    await writeFile(join(storyDir, "STORYBOARD.md"), storyboard(""));
    await buildData({ storyDir, slotId: "three-towns" });
    const csv = await readFile(beatFile("data.csv"), "utf8");
    expect(csv).not.toContain("null");
  });
});
