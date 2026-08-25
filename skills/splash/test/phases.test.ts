// This test's whole job is to fail the moment SKILL.md's prose and where.mjs's code disagree
// about the vocabulary of phases — the class of drift that let main's SKILL.md keep promising a
// fallback the code had stopped producing.
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { createHash } from "node:crypto";
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
import { invokeResolvedOwner } from "../scripts/orchestration.mjs";
import { approveCurrentOutput } from "../../deliver/test/output-review-fixture";
import type { BoundReviewFixture } from "../../deliver/test/output-review-fixture";
import {
  publishStagedDelivery,
  replacementArtifacts,
} from "../../deliver/scripts/delivery-replacement.mjs";

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
language: en
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

function sha256(bytes: Buffer | string): string {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

async function analyseBound(storyDir: string, beat: string) {
  const hashes = {
    storyboard: sha256(await readFile(join(storyDir, "STORYBOARD.md"))),
    profile: sha256(await readFile(join(storyDir, "source", "profile.json"))),
    sourceData: sha256(await readFile(join(storyDir, "source", "data.csv"))),
  };
  await writeFile(
    join(storyDir, "beats", beat, "data.json"),
    JSON.stringify({ schemaVersion: 1, meta: { hashes } }),
  );
}

async function deliverBound(
  storyDir: string,
  beat: string,
  review: BoundReviewFixture,
) {
  const exportDir = join(storyDir, "export", beat);
  const operationId = `delivery-${review.id}`;
  const { stagingDir } = replacementArtifacts(exportDir, operationId);
  await mkdir(stagingDir, { recursive: true });
  await writeFile(join(stagingDir, "rainfall.png"), "x");
  await writeFile(
    join(stagingDir, "HANDOVER.md"),
    "# What you have, and where it goes",
  );
  await publishStagedDelivery({
    stagingDir,
    exportDir,
    manifest: {
      operationId,
      reviewId: review.id,
      planVersion: review.planVersion,
      draftDigest: review.draftDigest,
      findingIds: review.findingIds,
      feedbackDigest: review.feedbackDigest,
      form: "owned-file",
      format: "static",
    },
  });
}


// Drives one story directory through every transition where.mjs recognises, recording the actual
// `.phase` whereIs returns at each step. This exercises where.mjs's real runtime behaviour rather
// than scraping its source text — a regex like /phase:\s*"([a-z]+)"/g silently stops detecting
// drift the moment the file uses a single quote, a template literal, or a variable instead of a
// double-quoted literal; running the function cannot be fooled by a change of that shape.
async function driveEveryPhase(storyDir: string): Promise<Set<string>> {
  const observed = new Set<string>();

  observed.add((await whereIs(storyDir)).phase); // intake: nothing frozen yet

  await writeFile(join(storyDir, "source", "article.md"), "text");
  await writeFile(join(storyDir, "source", "data.csv"), "col\n1");
  await writeFile(join(storyDir, "source", "profile.json"), "{}");
  observed.add((await whereIs(storyDir)).phase); // framing: source frozen, no STORYBOARD.md yet

  await writeFile(join(storyDir, "STORYBOARD.md"), "---\nslots: []\n---\n");
  observed.add((await whereIs(storyDir)).phase); // storyboard: file exists, takeaway unconfirmed

  await writeFile(join(storyDir, "STORYBOARD.md"), confirmedStoryboard);
  observed.add((await whereIs(storyDir)).phase); // production: takeaway confirmed, nothing rendered

  await mkdir(join(storyDir, "beats", "1-rainfall", "renders"), {
    recursive: true,
  });
  await analyseBound(storyDir, "1-rainfall");
  await writeFile(
    join(storyDir, "beats", "1-rainfall", "renders", "still.png"),
    "x",
  );
  observed.add((await whereIs(storyDir)).phase); // production: rendered, not yet approved

  const review = await approveCurrentOutput(
    join(storyDir, "beats", "1-rainfall"),
  );
  observed.add((await whereIs(storyDir)).phase); // delivery: approved, nothing exported

  // Delivery is per beat, into `export/<beat>/` — the shape `deliver`'s `exportDirFor` writes,
  // and the shape `whereIs` reads. A story is not done merely because files exist.
  await mkdir(join(storyDir, "export", "1-rainfall"), { recursive: true });
  await writeFile(join(storyDir, "export", "1-rainfall", "rainfall.png"), "x");
  observed.add((await whereIs(storyDir)).phase); // still delivery: no bound manifest or hand-over

  await deliverBound(storyDir, "1-rainfall", review);
  observed.add((await whereIs(storyDir)).phase); // done: manifest binds review and delivered bytes

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

  it("returns one owner and keeps intake, analysis, and delivery on existing skills", async () => {
    expect(await whereIs(dir)).toMatchObject({
      phase: "intake",
      status: "ready",
      owner: { kind: "skill", id: "intake" },
      missing: ["source/article.md", "source/data.csv", "source/profile.json"],
      attempts: 0,
      resume: expect.stringMatching(/intake|source/i),
    });

    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "data.csv"), "col\n1");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    await writeFile(join(dir, "STORYBOARD.md"), confirmedStoryboard);
    expect(await whereIs(dir)).toMatchObject({
      phase: "production",
      owner: { kind: "skill", id: "analyst" },
    });

    await mkdir(join(dir, "beats", "1-rainfall", "renders"), {
      recursive: true,
    });
    await analyseBound(dir, "1-rainfall");
    await writeFile(
      join(dir, "beats", "1-rainfall", "renders", "still.png"),
      "x",
    );
    await approveCurrentOutput(join(dir, "beats", "1-rainfall"));
    expect(await whereIs(dir)).toMatchObject({
      phase: "delivery",
      owner: { kind: "skill", id: "deliver" },
    });
  });

  it("returns only the exact deeply immutable six-field resolver result", async () => {
    const resolved = await whereIs(dir);
    const snapshot = JSON.parse(JSON.stringify(resolved));

    expect(Reflect.ownKeys(resolved)).toEqual([
      "phase",
      "status",
      "owner",
      "missing",
      "attempts",
      "resume",
    ]);
    expect([
      Object.isFrozen(resolved),
      Object.isFrozen(resolved.owner),
      Object.isFrozen(resolved.missing),
    ]).toEqual([true, true, true]);

    Reflect.set(resolved, "phase", "delivery");
    Reflect.set(resolved, "status", "blocked");
    Reflect.set(resolved, "owner", { kind: "skill", id: "deliver" });
    Reflect.set(resolved, "missing", []);
    Reflect.set(resolved, "attempts", 3);
    Reflect.set(resolved, "resume", "Forged resume.");
    Reflect.set(resolved.owner, "id", "deliver");
    Reflect.set(resolved.missing, 0, "forged requirement");

    expect(resolved).toEqual(snapshot);
  });

  it("does not expose a low-level resolver-result issuer", async () => {
    // Dynamic import is intentional: this test observes the module's public export boundary.
    const orchestration = await import(
      "../scripts/orchestration.mjs?public-surface"
    );

    expect("createResolverResult" in orchestration).toBe(false);
  });

  it("re-resolves filesystem state at invocation and dispatches only the current owner", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "data.csv"), "col\n1");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    const stale = await whereIs(dir);
    expect(stale.owner).toEqual({ kind: "persona", id: "editor" });

    await writeFile(join(dir, "STORYBOARD.md"), confirmedStoryboard);
    const current = await whereIs(dir);
    expect(current.owner).toEqual({ kind: "skill", id: "analyst" });

    const calls: Array<{ id: string; phase: string; owner: unknown }> = [];
    const outcome = await invokeResolvedOwner(dir, {
      skill: async (id: string, resolved: typeof current) => {
        calls.push({ id, phase: resolved.phase, owner: resolved.owner });
        return "analysis returned";
      },
    });

    expect({ calls, outcome }).toEqual({
      calls: [{ id: "analyst", phase: "production", owner: current.owner }],
      outcome: "analysis returned",
    });
  });

  it("resolves, invokes one owner, stops at the human gate, and resolves again", async () => {
    await writeFile(join(dir, "source", "article.md"), "text");
    await writeFile(join(dir, "source", "data.csv"), "col\n1");
    await writeFile(join(dir, "source", "profile.json"), "{}");
    const before = await whereIs(dir);
    expect(before).toMatchObject({
      phase: "framing",
      status: "ready",
      owner: { kind: "persona", id: "editor" },
      missing: ["a confirmed takeaway"],
    });

    const calls: string[] = [];
    const outcome = await invokeResolvedOwner(dir, {
      persona: async (id: string) => {
        calls.push(id);
        return "proposal returned to journalist";
      },
    });
    const after = await whereIs(dir);

    expect({
      calls,
      outcome,
      after,
    }).toEqual({
      calls: ["editor"],
      outcome: "proposal returned to journalist",
      after: before,
    });
  });

  it("exposes exactly the editor and designer personas", async () => {
    const personaFiles = (
      await readdir(new URL("../../../agents/", import.meta.url), {
        withFileTypes: true,
      })
    )
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => entry.name)
      .sort();
    expect(personaFiles).toEqual(["designer.md", "editor.md"]);
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
