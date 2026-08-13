import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  mutateStoryboard,
  parseStoryboard,
  writeStoryboardAtomic,
} from "../scripts/storyboard.mjs";

const LEGACY = `---
takeaway: "A quoted takeaway stays quoted."
unknownField: 'keep: this exactly'
slots:
  - id: 1
    proves: "The first claim."
    medium: chart
    genre: web
    note: 'unknown slot field'
  - id: 2
    proves: "The second claim."
    medium: map
    format: static
    genre: static
---

This prose is the journalist's.

It must stay byte-for-byte identical.
`;

let dir: string;
let path: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "storyboard-writer-"));
  path = join(dir, "STORYBOARD.md");
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("the canonical storyboard persistence boundary", () => {
  it("normalizes legacy fields in memory without changing the source text", async () => {
    await writeFile(path, LEGACY);
    const parsed = parseStoryboard(await readFile(path, "utf8"));

    expect(parsed.legacy).toBe(true);
    expect(parsed.meta.slots.map((slot: any) => slot.format)).toEqual(["web", "static"]);
    expect(parsed.meta.slots.some((slot: any) => "genre" in slot)).toBe(false);
    expect(await readFile(path, "utf8")).toBe(LEGACY);
  });

  it("upgrades every legacy key on the next explicit mutation while preserving everything else", async () => {
    await writeFile(path, LEGACY);
    const prose = parseStoryboard(LEGACY).prose;

    await mutateStoryboard(path, {
      slot: { id: 1, fields: { reachable: "yes" } },
    });

    const written = await readFile(path, "utf8");
    expect(written).not.toMatch(/^\s+genre:/m);
    expect(written.match(/^\s+format:/gm)).toHaveLength(2);
    expect(written).toContain("unknownField: 'keep: this exactly'");
    expect(written).toContain("    note: 'unknown slot field'");
    expect(written).toContain('takeaway: "A quoted takeaway stays quoted."');
    expect(written.indexOf("  - id: 1")).toBeLessThan(written.indexOf("  - id: 2"));
    expect(parseStoryboard(written).prose).toBe(prose);
    expect(parseStoryboard(written).legacy).toBe(false);
    expect(parseStoryboard(written).meta.slots[0].reachable).toBe("yes");
  });

  it("leaves the last complete file intact when replacement is interrupted before rename", async () => {
    await writeFile(path, LEGACY);

    await expect(
      mutateStoryboard(
        path,
        { slot: { id: 1, fields: { format: "static" } } },
        { beforeRename: () => { throw new Error("injected interruption"); } },
      ),
    ).rejects.toThrow("injected interruption");

    expect(await readFile(path, "utf8")).toBe(LEGACY);
    expect((await readdir(dir)).filter((name) => name.endsWith(".tmp"))).toEqual([]);
  });

  it("routes a complete new write through the same canonical atomic boundary", async () => {
    await writeStoryboardAtomic(path, LEGACY);
    const written = await readFile(path, "utf8");
    expect(written).not.toMatch(/^\s+genre:/m);
    expect(parseStoryboard(written).legacy).toBe(false);
  });

  it("preserves the list marker when a dual-equal slot begins with the legacy field", async () => {
    const legacyFirst = `---
slots:
  - genre: web
    id: 1
    proves: "The list item survives canonical cleanup."
    medium: chart
    format: web
---

Keep this prose exactly.
`;

    await writeStoryboardAtomic(path, legacyFirst);

    const written = await readFile(path, "utf8");
    expect(written).toContain("  - format: web\n");
    expect(written.match(/^\s+(?:-\s+)?format:/gm)).toHaveLength(1);
    expect(written).not.toMatch(/^\s+(?:-\s+)?genre:/m);
    expect(parseStoryboard(written).meta.slots).toEqual([
      {
        format: "web",
        id: "1",
        proves: "The list item survives canonical cleanup.",
        medium: "chart",
      },
    ]);
    expect(parseStoryboard(written).prose).toBe("\nKeep this prose exactly.\n");
  });

  it("rejects the legacy name on mutation APIs", async () => {
    await writeFile(path, LEGACY);
    await expect(
      mutateStoryboard(path, { slot: { id: 1, fields: { genre: "web" } } }),
    ).rejects.toThrow(/accepted only while reading/);
  });
});

describe("legacy conflict handling", () => {
  it("accepts canonical-only, legacy-only, and matching dual fields", () => {
    const canonical = LEGACY.replace("    genre: web\n", "    format: web\n").replace(
      "    genre: static\n",
      "",
    );
    const legacy = LEGACY.replace("    format: static\n", "").replace("    genre: static\n", "");

    expect(parseStoryboard(canonical).legacy).toBe(false);
    expect(parseStoryboard(legacy).legacy).toBe(true);
    expect(parseStoryboard(LEGACY).legacy).toBe(true);
  });

  it("fails closed on conflicting canonical and legacy values", () => {
    const conflict = LEGACY.replace("    genre: static", "    genre: video");
    expect(() => parseStoryboard(conflict)).toThrow(
      'slot 2: conflicting publication format fields: format is "static" but legacy genre is "video"',
    );
  });
});
