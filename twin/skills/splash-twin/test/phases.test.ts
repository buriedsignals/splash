// This test's whole job is to fail the moment SKILL.md's prose and where.mjs's code disagree
// about the vocabulary of phases — the class of drift that let main's SKILL.md keep promising a
// fallback the code had stopped producing.
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  readFile,
  readdir,
  mkdtemp,
  mkdir,
  writeFile,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { whereIs } from "../scripts/where.mjs";

const PHASES = [
  "intake",
  "framing",
  "storyboard",
  "production",
  "delivery",
  "done",
];

// A phase must be named AS a phase — a backtick-quoted identifier, e.g. in the phase table row —
// not merely a word that happens to occur in ordinary prose. "done" appears in "the exchange is
// done" without the prose ever documenting a `done` phase; a plain .toContain(phase) would pass on
// that SKILL.md just as happily as on one that actually names the phase.
function namedAsPhase(skill: string, phase: string): boolean {
  return new RegExp("`" + phase + "`").test(skill);
}

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "phases-drift-"));
  for (const child of ["source", "beats", "export"])
    await mkdir(join(dir, child), { recursive: true });
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

// Gate-2-complete, matching what where.mjs's missingForGate2 actually requires: a confirmed
// takeaway, all six hand-of-the-journalist fields, the two recorded verdicts (`grounding` from G1,
// `reference` from the reference loop), and a slot carrying its medium, genre, size, recorded
// reachability, and a chosen candidate drawn from its own listed candidates.
const confirmedStoryboard = `---
takeaway: "Rainfall fell by a third in ten years."
subject: "Rainfall trends in the Rhône basin"
comparison: "the last decade against the one before it"
limits: "single weather station, not basin-wide"
placement: "above the fold, article-web"
credit: "Data: MeteoSwiss"
effectiveDate: "2026-08-01"
grounding: supported
reference: "The Pudding, redraft — mid-table deviation"
slots:
  - id: 1
    medium: chart
    genre: static
    size: landscape
    reachable: yes
    chosen: trajectory
    candidates: [trajectory, comparison]
---
`;

// Drives one story directory through every transition where.mjs recognises, recording the actual
// `.phase` whereIs returns at each step. This exercises where.mjs's real runtime behaviour rather
// than scraping its source text — a regex like /phase:\s*"([a-z]+)"/g silently stops detecting
// drift the moment the file uses a single quote, a template literal, or a variable instead of a
// double-quoted literal; running the function cannot be fooled by a change of that shape.
async function driveEveryPhase(storyDir: string): Promise<Set<string>> {
  const observed = new Set<string>();

  observed.add((await whereIs(storyDir)).phase); // intake: nothing frozen yet

  await writeFile(join(storyDir, "source", "article.md"), "text");
  await writeFile(join(storyDir, "source", "profile.json"), "{}");
  observed.add((await whereIs(storyDir)).phase); // framing: source frozen, no STORYBOARD.md yet

  await writeFile(join(storyDir, "STORYBOARD.md"), "---\nslots: []\n---\n");
  observed.add((await whereIs(storyDir)).phase); // storyboard: file exists, takeaway unconfirmed

  await writeFile(join(storyDir, "STORYBOARD.md"), confirmedStoryboard);
  observed.add((await whereIs(storyDir)).phase); // production: takeaway confirmed, nothing rendered

  await mkdir(join(storyDir, "beats", "1-rainfall", "renders"), {
    recursive: true,
  });
  await writeFile(
    join(storyDir, "beats", "1-rainfall", "renders", "still.png"),
    "x",
  );
  observed.add((await whereIs(storyDir)).phase); // delivery: a beat has rendered, nothing exported

  await writeFile(join(storyDir, "export", "rainfall.png"), "x");
  observed.add((await whereIs(storyDir)).phase); // done: something has been exported

  return observed;
}

describe("the orchestrator's prose and its code agree", () => {
  it("should name, as a phase, every phase whereIs actually returns while driven through a real story", async () => {
    const skill = await readFile(
      new URL("../SKILL.md", import.meta.url),
      "utf8",
    );
    const observed = await driveEveryPhase(dir);

    expect(observed.size).toBeGreaterThan(0);
    for (const phase of observed) {
      expect(PHASES).toContain(phase); // the fixture stays inside the documented vocabulary too
      expect(namedAsPhase(skill, phase)).toBe(true);
    }
  });

  it("should exercise, and the prose should name, every one of the six documented phases — not a subset", async () => {
    const observed = await driveEveryPhase(dir);
    expect(observed).toEqual(new Set(PHASES));
  });

  it("should carry the anti-improvisation rule verbatim", async () => {
    const skill = await readFile(
      new URL("../SKILL.md", import.meta.url),
      "utf8",
    );
    expect(skill).toContain("never designed around");
  });

  it("should dispatch to at least one craft-skill id, and never to one that does not exist on disk", async () => {
    const skill = await readFile(
      new URL("../SKILL.md", import.meta.url),
      "utf8",
    );
    const present = await readdir(new URL("../../", import.meta.url));
    const named = [...skill.matchAll(/`(twin-[a-z-]+)`/g)].map((m) => m[1]);

    // A SKILL.md that names no id at all would make the loop below pass vacuously — the
    // responsibility this test guards ("dispatch to the craft skill") requires at least one
    // real dispatch target to actually be named, not merely the absence of a bad one.
    expect(named.length).toBeGreaterThan(0);
    for (const id of named) expect(present).toContain(id);
  });
});
