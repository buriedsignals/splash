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
// A test-only cross-skill import, permitted for the one purpose `test/` is excluded from
// `no-cross-skill-imports.test.ts` for. G3 closes into TWO files and G4 into three, and this drive
// has to close them the way a real run does or it never reaches the phases past `production`.
import { approveCurrentOutput } from "../../deliver/test/output-review-fixture";

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
// `reference` from the reference loop), and a slot carrying its medium, format, size, recorded
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
    proves: "Rainfall fell by a third in ten years."
    medium: chart
    format: static
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
  observed.add((await whereIs(storyDir)).phase); // production: rendered, not yet approved

  await writeFile(
    join(storyDir, "beats", "1-rainfall", "APPROVED.md"),
    "the journalist looked at it and said yes",
  );
  observed.add((await whereIs(storyDir)).phase); // still production: nothing binds that yes

  // G3's second file, and `deliver` has always demanded it: OUTPUT-REVIEW.json binds the approval
  // to the exact render, plan version, finding IDs and a passing QA run. Round-four finding 7 is
  // this gate reporting `delivery` without it, on a beat `materialise` refused outright.
  await approveCurrentOutput(join(storyDir, "beats", "1-rainfall"));
  observed.add((await whereIs(storyDir)).phase); // delivery: approved and bound, nothing exported

  // Delivery is per beat, into `export/<beat>/` — the shape `deliver`'s `exportDirFor` writes,
  // and the shape `whereIs` reads. A story is done when every approved beat has one.
  await mkdir(join(storyDir, "export", "1-rainfall"), { recursive: true });
  await writeFile(join(storyDir, "export", "1-rainfall", "rainfall.png"), "x");
  observed.add((await whereIs(storyDir)).phase); // still delivery: nothing hands the files over

  // G4 closes into `export/<beat>/HANDOVER.md`, the way G3 closes into `APPROVED.md`.
  await writeFile(
    join(storyDir, "export", "1-rainfall", "HANDOVER.md"),
    "# What you have, and where it goes",
  );
  observed.add((await whereIs(storyDir)).phase); // still delivery: the closing offer is unasked

  // The delivery turn ends by putting both halves of the closing offer to the journalist —
  // the same beat in another format, and the article's other subjects — and recording what they
  // said. `materialise` writes both receipts as `pending` so an offer nobody made is visible.
  await writeFile(join(storyDir, "export", "1-rainfall", ".another-format"), "declined\n");
  await writeFile(join(storyDir, "export", "1-rainfall", ".other-subjects"), "declined\n");
  observed.add((await whereIs(storyDir)).phase); // done: handed over, and both questions answered

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
    // The craft skills are read FROM DISK rather than matched by a name pattern. An earlier
    // version hunted for a `twin-` prefix; the rename to the product's own names left it matching
    // nothing, and only its anti-vacuity assertion below kept it from passing silently. A guard
    // that recognises its subject by a prefix stops recognising it the day the prefix changes.
    const present = (await readdir(new URL("../../", import.meta.url))).filter(
      (name) => !name.startsWith("."),
    );
    const backticked = [...skill.matchAll(/`([a-z][a-z-]{2,})`/g)].map(
      (m) => m[1],
    );

    // The positive half: at least one directory that really exists beside this skill is named.
    const named = backticked.filter((id) => present.includes(id));

    // The negative half: a token SHAPED like a craft-skill id but absent from disk is a stale
    // dispatch target. The shapes are the two the tree actually uses — a medium-and-format pair
    // (`chart-beat`, `map-web`, `chart-video`) — plus anything already known to be a sibling.
    const claimed = backticked.filter((id) =>
      /^(chart|map|image|dw)-(beat|web|video)$/.test(id),
    );
    for (const id of claimed) expect(present).toContain(id);

    // A SKILL.md that names no id at all would make the loop below pass vacuously — the
    // responsibility this test guards ("dispatch to the craft skill") requires at least one
    // real dispatch target to actually be named, not merely the absence of a bad one.
    expect(named.length).toBeGreaterThan(0);
    for (const id of named) expect(present).toContain(id);
  });
});
