import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { formatPublicationFormatGate } from "../scripts/format-gate.mjs";
import { checkStoryboard, mutateStoryboard, parseStoryboard } from "../scripts/storyboard.mjs";
import { whereIs } from "../../splash/scripts/where.mjs";
import { HOST_ACCEPTANCE } from "./fixtures/publication-format-host-acceptance.mjs";

const PRE_FORMAT = `---
takeaway: "Every sampled country increased adoption while the 2025 gap remained wide."
subject: "Ten European countries"
comparison: "2021 against 2025"
limits: "A fictional ten-country sample, not a European census."
placement: "after the third paragraph"
credit: "Source: Splash Test Desk synthetic dataset"
effectiveDate: "2026-07-15"
grounding: supported
language: en
slots:
  - id: 1
    proves: "Every sampled country increased adoption while the 2025 gap remained wide."
    medium: chart
---

The confirmed framing, before the publication-format decision.
`;

const OPTIONS = [
  { format: "static", reachable: true },
  { format: "web", reachable: true },
  { format: "video", reachable: true },
  { format: "scrolly", reachable: true },
];

let storyDir: string;
let storyboardPath: string;

async function fixtureManifest(root: string, paths: string[]) {
  return Object.fromEntries(
    await Promise.all(
      paths.map(async (relative) => {
        const bytes = await readFile(join(root, relative));
        return [relative, createHash("sha256").update(bytes).digest("hex")];
      }),
    ),
  );
}

function insertionDiff(before: string, after: string) {
  const beforeLines = before.split("\n");
  const afterLines = after.split("\n");
  let start = 0;
  while (beforeLines[start] === afterLines[start]) start += 1;
  let suffix = 0;
  while (
    beforeLines[beforeLines.length - 1 - suffix] === afterLines[afterLines.length - 1 - suffix]
  ) suffix += 1;
  const inserted = afterLines.slice(start, afterLines.length - suffix);
  return [
    ...beforeLines.slice(Math.max(0, start - 2), start).map((line) => ` ${line}`),
    ...inserted.map((line) => `+${line}`),
    ` ${beforeLines[start]}`,
  ].join("\n");
}

beforeEach(async () => {
  storyDir = await mkdtemp(join(tmpdir(), "publication-format-gate-"));
  storyboardPath = join(storyDir, "STORYBOARD.md");
  await mkdir(join(storyDir, "source"));
  await mkdir(join(storyDir, "beats"));
  await mkdir(join(storyDir, "export"));
  await writeFile(join(storyDir, "source", "article.md"), "Heat-pump article");
  await writeFile(join(storyDir, "source", "profile.json"), "{}");
  await writeFile(
    join(storyDir, "source", "context.md"),
    "Prefer a full-width web treatment with a static fallback.",
  );
  await writeFile(storyboardPath, PRE_FORMAT);
});

afterEach(async () => {
  await rm(storyDir, { recursive: true, force: true });
});

describe("the G2b assistant turn", () => {
  it("recommends from context, presents every publication format, then stops before later movements", async () => {
    const before = await readFile(storyboardPath, "utf8");
    const assistantTurn = formatPublicationFormatGate({
      recommended: "web",
      rationale:
        "the article calls for a full-width web treatment and exact country values can remain available on interaction.",
      options: OPTIONS,
    });

    expect(assistantTurn).toContain("Recommended: **Interactive web**");
    for (const label of ["Static / print", "Interactive web", "Video", "Scrollytelling"]) {
      expect(assistantTurn).toContain(`**${label}:**`);
    }
    expect(assistantTurn).toContain("hover, tap, and keyboard focus");
    expect(assistantTurn).toContain("broadcast or social video");
    expect(assistantTurn).toContain("article's scroll sequence");
    expect(assistantTurn.endsWith("Which should I produce first?")).toBe(true);

    // A transcript-level guard: this assistant message cannot contain any later storyboard
    // movement. Adding reference research, palette work, or a treatment recommendation here makes
    // this conformance case fail even if a later test eventually writes a valid final schema.
    expect(assistantTurn).not.toMatch(/reference loop|palette|slope|dumbbell|candidate/i);

    // Reading the source preference and rendering the recommendation is not confirmation.
    expect(await readFile(storyboardPath, "utf8")).toBe(before);
    const parsed = parseStoryboard(before);
    expect(parsed.meta.slots[0]).toMatchObject({ id: "1", medium: "chart" });
    expect(parsed.meta.slots[0].proves).toContain("Every sampled country");
    expect(parsed.meta.slots[0].format).toBeUndefined();
    expect(parsed.meta.slots[0].reachable).toBeUndefined();
    expect(parsed.meta.slots[0].chosen).toBeUndefined();
    expect(await readdir(join(storyDir, "beats"))).toEqual([]);
  });

  it("pins the complete fresh-host turn, manifests, reply, and resumed state", async () => {
    expect(HOST_ACCEPTANCE.host).toBe("Codex");
    expect(HOST_ACCEPTANCE.recordedAt).toBe("2026-08-14");
    expect(PRE_FORMAT).toBe(HOST_ACCEPTANCE.storyboardBefore);
    expect(HOST_ACCEPTANCE.journalistReply).toBe("Interactive web.");

    const manifestPaths = Object.keys(HOST_ACCEPTANCE.manifestBefore);
    expect(await fixtureManifest(storyDir, manifestPaths)).toEqual(HOST_ACCEPTANCE.manifestBefore);
    expect(await whereIs(storyDir)).toMatchObject(HOST_ACCEPTANCE.whereBefore);

    const completeHostTurn = formatPublicationFormatGate({
      recommended: "web",
      rationale:
        "the article calls for a full-width web treatment and exact country values can remain available on interaction.",
      options: OPTIONS,
    });
    expect(completeHostTurn).toBe(HOST_ACCEPTANCE.assistantTurn);
    expect(completeHostTurn).not.toMatch(/reference loop|palette|slope|dumbbell|candidate/i);
    expect(await fixtureManifest(storyDir, manifestPaths)).toEqual(HOST_ACCEPTANCE.manifestBefore);

    await mutateStoryboard(storyboardPath, {
      slot: { id: 1, fields: { format: "web", reachable: "yes" } },
    });

    expect(await readFile(storyboardPath, "utf8")).toBe(HOST_ACCEPTANCE.storyboardAfter);
    expect(insertionDiff(HOST_ACCEPTANCE.storyboardBefore, HOST_ACCEPTANCE.storyboardAfter)).toBe(
      HOST_ACCEPTANCE.storyboardDiff,
    );
    expect(await fixtureManifest(storyDir, manifestPaths)).toEqual(HOST_ACCEPTANCE.manifestAfter);
    expect(await whereIs(storyDir)).toMatchObject(HOST_ACCEPTANCE.whereAfter);
    expect(parseStoryboard(await readFile(storyboardPath, "utf8")).meta.slots[0].size).toBeUndefined();
    for (const directory of HOST_ACCEPTANCE.emptyDirectories) {
      expect(await readdir(join(storyDir, directory))).toEqual([]);
    }
  });

  it("names an unreachable format and the concrete reason instead of silently omitting it", () => {
    const assistantTurn = formatPublicationFormatGate({
      recommended: "static",
      rationale: "the image evidence is already a fixed frame.",
      options: [
        { format: "static", reachable: true },
        { format: "web", reachable: false, why: "image beats have no web producer" },
        { format: "video", reachable: false, why: "image beats have no video producer" },
        { format: "scrolly", reachable: true },
      ],
    });
    expect(assistantTurn).toContain("Interactive web:** unavailable — image beats have no web producer");
    expect(assistantTurn).toContain("Video:** unavailable — image beats have no video producer");
  });

  it("pins the high-salience end-turn rule in both orchestration skills", async () => {
    const splash = await readFile(join(import.meta.dirname, "..", "..", "splash", "SKILL.md"), "utf8");
    const storyboard = await readFile(join(import.meta.dirname, "..", "SKILL.md"), "utf8");
    for (const text of [splash, storyboard]) {
      expect(text).toMatch(/G2b/);
      expect(text).toMatch(/end (?:the|your) turn/i);
      expect(text).toMatch(/silence/i);
    }
  });
});

describe("active fixture migration", () => {
  it("keeps the delivered heat-pump story valid under the provisional-slot schema", async () => {
    const activeStory = join(
      import.meta.dirname,
      "..",
      "..",
      "..",
      "stories",
      "heat-pump-adoption-across-europe",
    );
    const parsed = parseStoryboard(await readFile(join(activeStory, "STORYBOARD.md"), "utf8"));
    expect(parsed.meta.slots[0].proves).toContain("Every sampled country increased adoption");
    expect(checkStoryboard(parsed.meta)).toEqual([]);
    expect(await whereIs(activeStory)).toEqual({ phase: "done", missing: [] });
  });
});

describe("ordered persisted state across the format reply", () => {
  it("reports the pending publication-format decision directly", async () => {
    expect(await whereIs(storyDir)).toMatchObject({
      phase: "storyboard",
      gate: "G2b",
      awaiting: "format",
      slotId: "1",
    });
  });

  for (const format of ["web", "scrolly"]) {
    it(`records ${format} with no size and advances to the reference loop`, async () => {
      await mutateStoryboard(storyboardPath, {
        slot: { id: 1, fields: { format, reachable: "yes" } },
      });
      const written = await readFile(storyboardPath, "utf8");
      expect(parseStoryboard(written).meta.slots[0]).toMatchObject({
        format,
        reachable: "yes",
      });
      expect(parseStoryboard(written).meta.slots[0].size).toBeUndefined();
      expect(await whereIs(storyDir)).toMatchObject({
        phase: "storyboard",
        gate: "G2-reference",
        awaiting: "reference",
      });
    });
  }

  for (const format of ["static", "video"]) {
    it(`records ${format} and advances to G2c awaiting size`, async () => {
      await mutateStoryboard(storyboardPath, {
        slot: { id: 1, fields: { format, reachable: "yes" } },
      });
      expect(await whereIs(storyDir)).toMatchObject({
        phase: "storyboard",
        gate: "G2c",
        awaiting: "size",
        slotId: "1",
      });
    });
  }

  it("finishes each slot's G2a → G2b → G2c sequence before moving to the next", async () => {
    const twoSlots = PRE_FORMAT.replace(
      "    medium: chart\n---",
      `    medium: chart
    format: web
    reachable: yes
  - id: 2
    proves: "Norway and Sweden remain far above the United Kingdom and Spain."
---`,
    );
    await writeFile(storyboardPath, twoSlots);
    expect(await whereIs(storyDir)).toMatchObject({ gate: "G2a", awaiting: "medium", slotId: "2" });

    await mutateStoryboard(storyboardPath, { slot: { id: 2, fields: { medium: "chart" } } });
    expect(await whereIs(storyDir)).toMatchObject({ gate: "G2b", awaiting: "format", slotId: "2" });

    await mutateStoryboard(storyboardPath, {
      slot: { id: 2, fields: { format: "static", reachable: "yes" } },
    });
    expect(await whereIs(storyDir)).toMatchObject({ gate: "G2c", awaiting: "size", slotId: "2" });

    await mutateStoryboard(storyboardPath, { slot: { id: 2, fields: { size: "landscape" } } });
    expect(await whereIs(storyDir)).toMatchObject({ gate: "G2-reference", awaiting: "reference" });
    expect(parseStoryboard(await readFile(storyboardPath, "utf8")).meta.slots.map((s: any) => s.id)).toEqual([
      "1",
      "2",
    ]);
  });
});

describe("the two independent persisted-state readers", () => {
  const canonical = PRE_FORMAT.replace(
    "    medium: chart\n---",
    "    medium: chart\n    format: web\n    reachable: yes\n---",
  );

  it("agrees on canonical-only, legacy-only, and matching dual fields", async () => {
    const fixtures = [
      { text: canonical, legacy: false },
      { text: canonical.replace("    format: web", "    genre: web"), legacy: true },
      { text: canonical.replace("    format: web", "    format: web\n    genre: web"), legacy: true },
    ];

    for (const fixture of fixtures) {
      await writeFile(storyboardPath, fixture.text);
      const parsed = parseStoryboard(fixture.text);
      const state = await whereIs(storyDir);
      expect(parsed.meta.slots[0].format).toBe("web");
      expect(parsed.meta.slots[0].genre).toBeUndefined();
      expect(parsed.legacy).toBe(fixture.legacy);
      expect(Boolean((state as any).legacy)).toBe(fixture.legacy);
      expect(state).toMatchObject({ gate: "G2-reference", awaiting: "reference" });
    }
  });

  it("fails closed with the same specific error on a conflicting dual field", async () => {
    const conflict = canonical.replace("    format: web", "    format: web\n    genre: video");
    const message =
      'slot 1: conflicting publication format fields: format is "web" but legacy genre is "video"';
    expect(() => parseStoryboard(conflict)).toThrow(message);
    await writeFile(storyboardPath, conflict);
    await expect(whereIs(storyDir)).rejects.toThrow(message);
  });
});
