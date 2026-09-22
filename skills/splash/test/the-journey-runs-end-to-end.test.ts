/**
 * THE ONE TEST THAT WALKS THE JOURNALIST'S OWN PATH.
 *
 * This repository has ~4,800 fast tests and ~170 rendering ones, and before this file not a single
 * test chained one phase to the next: `freezeSource` was exercised alone, the gate contract alone,
 * `buildData` alone, `renderStill` alone. Measured 2026-09-23 — `freezeSource` appeared in two test
 * files and neither of them rendered anything.
 *
 * Every defect the 2026-09-22 end-to-end run found lived BETWEEN two steps, which is exactly the
 * space no unit test occupies: a story created in a root that cannot resolve `#shared`, a preflight
 * reporting valid keys as missing, a gate refusing the journalist's own honest answer, a render
 * shipping clipped text. Four of them, and the suite could not have seen one.
 *
 * So this walks it: a root, a frozen article and table, a closed storyboard, the analyst's data
 * contract, the palette, a render, and the human gate at the end. Small on purpose — ten lines of
 * article and five rows of data — because what is under test is the SEAMS, not the corpus.
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createElement } from "react";
import { createStory } from "../scripts/new-story.mjs";
import { whereIs } from "../scripts/where.mjs";
import { freezeSource } from "../../intake/scripts/freeze.mjs";
import { buildData } from "../../analyst/scripts/build-data.mjs";
import { formatPalette } from "../../palette/scripts/palette.mjs";
import {
  renderStill,
  readPalette,
  FONT_FAMILY,
} from "../../chart-beat/scripts/render-still.mjs";

const TEMPLATE = join(import.meta.dirname, "..", "assets", "root-template");

const ARTICLE = `---
source: A newsroom
url: https://example.org/a-story
byline: A reporter
published: 2026-09-01
---

# Three towns carry the outage

Of the five towns on the valley line, three account for almost every hour of lost supply
recorded in 2024. The other two barely register.

"It is always the same three," says the network's own engineer.
`;

// Five rows, one entity column, one period column, one measure — the smallest table the profiler
// can say anything true about, and enough for a bar chart to have a shape.
const DATA = `town,year,outage_hours
Alder,2024,412
Birch,2024,388
Cedar,2024,301
Dale,2024,22
Elm,2024,9
`;

/** A root as the installer leaves one. `createStory` refuses anything less, by design. */
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

/** Gate 2, closed — the journalist's answers, written the way the exchange writes them. */
const STORYBOARD = `---
takeaway: "Three of the five valley towns carried 1101 of the 1132 outage hours recorded in 2024."
subject: "Alder, Birch and Cedar"
comparison: "Dale and Elm, the two towns that barely register"
limits: "Recorded hours are what the network logged; an outage nobody reported is not in this table."
placement: "After the paragraph naming the three towns, which already gives their names but no figures."
credit: "The network operator"
effectiveDate: "2026-09-23"
grounding: unverifiable
language: en
slots:
  - id: three-towns-carry-the-outage
    proves: "Three towns hold almost every recorded outage hour; the other two are a rounding error."
    medium: chart
    format: static
    size: landscape
    reachable: yes
    intent: "rank or compare one value per category"
    candidates: ["Bar and column", "Lollipop", "Pictogram"]
    interaction: none
    chosen: "Bar and column"
    producer: custom
---

# Storyboard — three towns carry the outage

One slot. The article names the towns; the chart carries the disproportion.
`;

let root: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "splash-journey-"));
  await provisionRoot(root);
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("the journalist's journey, seam by seam", () => {
  it("carries one story from a frozen article to a drawn PNG", async () => {
    // ① The workspace. A root that cannot render is refused here rather than mid-render.
    const { dir: storyDir } = await createStory({
      root,
      title: "Three towns carry the outage",
    });

    const before = await whereIs(storyDir);
    expect(before.phase).toBe("intake");
    expect(before.owner).toMatchObject({ id: "intake" });

    // ② Intake freezes what the journalist brought, and profiles it. Nothing is asked.
    const articlePath = join(root, "article.md");
    const dataPath = join(root, "data.csv");
    await writeFile(articlePath, ARTICLE);
    await writeFile(dataPath, DATA);
    const { profile } = await freezeSource({ storyDir, articlePath, dataPath });
    expect(profile.rowCount).toBe(5);
    expect(profile.columns.map((c: { name: string }) => c.name)).toEqual([
      "town",
      "year",
      "outage_hours",
    ]);

    // The profiler's own refusals travel with the data: a period column is a sequence, and the
    // sum of a period is not a measure of anything.
    const year = profile.columns.find(
      (c: { name: string }) => c.name === "year",
    );
    expect(year.sum).toBeNull();

    const framing = await whereIs(storyDir);
    expect(framing.phase).toBe("framing");
    expect(framing.missing).toContain("a confirmed takeaway");

    // ③ The editorial gates, closed into the file rather than into a conversation.
    await writeFile(join(storyDir, "STORYBOARD.md"), STORYBOARD);
    await writeFile(
      join(storyDir, "SUBJECTS.md"),
      "---\nsubjects: []\n---\n\n# Every angle the survey found\n\nThere was nothing else.\n",
    );

    const production = await whereIs(storyDir);
    expect(production.phase).toBe("production");

    // ④ The analyst turns the frozen table into this beat's own data contract.
    const { wrote } = await buildData({
      storyDir,
      slotId: "three-towns-carry-the-outage",
    });
    expect(wrote.some((p: string) => p.endsWith("data.json"))).toBe(true);
    expect(wrote.some((p: string) => p.endsWith("DATA-NOTES.md"))).toBe(true);

    const beatDir = join(storyDir, "beats", "three-towns-carry-the-outage");
    const contract = JSON.parse(
      await readFile(join(beatDir, "data.json"), "utf8"),
    );
    expect(contract.rows).toHaveLength(5);

    // ⑤ The colours are a recorded decision, and the renderer refuses to invent one.
    await expect(async () => readPalette(beatDir, { stopAt: root })).toThrow();
    await writeFile(
      join(storyDir, "PALETTE.md"),
      formatPalette({
        ground: "#FFFFFF",
        accent: "#0B7A75",
        accents: ["#0B7A75"],
        origin: "newsroom",
      }),
    );
    const palette = readPalette(beatDir, { stopAt: root });
    expect(palette).toMatchObject({ ground: "#FFFFFF", accent: "#0B7A75" });

    // ⑥ The render. A bar per town, the three that carry it in the accent — the smallest drawing
    // that has a subject, a comparison and a source line, which is what the doctrine asks of one.
    const rows: { town: string; hours: number }[] = contract.rows.map(
      (r: (string | number)[]) => ({ town: String(r[0]), hours: Number(r[2]) }),
    );
    const widest = Math.max(...rows.map((r) => r.hours));
    const element = createElement(
      "svg",
      {
        width: 900,
        height: 560,
        viewBox: "0 0 900 560",
        xmlns: "http://www.w3.org/2000/svg",
      },
      createElement("rect", {
        x: 0,
        y: 0,
        width: 900,
        height: 560,
        fill: palette.ground,
      }),
      createElement(
        "text",
        {
          x: 40,
          y: 70,
          fill: "#111111",
          fontSize: 30,
          fontWeight: 700,
          fontFamily: FONT_FAMILY,
        },
        "Three towns carry the outage",
      ),
      ...rows.map((row, i) =>
        createElement("rect", {
          key: row.town,
          x: 40,
          y: 120 + i * 70,
          width: Math.round((row.hours / widest) * 700),
          height: 44,
          fill: i < 3 ? palette.accent : "#B8C2C2",
        }),
      ),
      createElement(
        "text",
        {
          x: 40,
          y: 520,
          fill: "#555555",
          fontSize: 16,
          fontFamily: FONT_FAMILY,
        },
        "The network operator, as of 23 September 2026",
      ),
    );

    const { pngPath, svgPath } = await renderStill({
      element,
      width: 900,
      height: 560,
      outDir: join(beatDir, "renders"),
      name: "still",
    });

    // ⑦ A PNG that exists is not a PNG that drew anything. This is the assertion the run of
    // 2026-09-22 was missing: it had to be a person opening the file.
    const png = await Bun.file(pngPath).arrayBuffer();
    expect(png.byteLength).toBeGreaterThan(2000);
    const drawn = await readFile(svgPath, "utf8");
    expect(drawn).toContain(palette.accent);
    expect(drawn).toContain("Three towns carry the outage");
    expect((drawn.match(/<rect/g) ?? []).length).toBe(6); // the ground and five towns
  }, 120_000);
});
