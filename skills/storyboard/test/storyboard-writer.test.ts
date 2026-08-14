import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { randomUUID } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { hostname, tmpdir } from "node:os";
import { join } from "node:path";
import {
  mutateStoryboard,
  mutateStoryboardRevisioned,
  parseStoryboard,
  storyboardRevision,
  writeStoryboardAtomic,
} from "../scripts/storyboard.mjs";
import { acquireTargetLock } from "../scripts/target-lock.mjs";

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
  dir = await realpath(await mkdtemp(join(tmpdir(), "storyboard-writer-")));
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
    expect(parsed.meta.slots.map((slot: any) => slot.format)).toEqual([
      "web",
      "static",
    ]);
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
    expect(written.indexOf("  - id: 1")).toBeLessThan(
      written.indexOf("  - id: 2"),
    );
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
        {
          beforeRename: () => {
            throw new Error("injected interruption");
          },
        },
      ),
    ).rejects.toThrow("injected interruption");

    expect(await readFile(path, "utf8")).toBe(LEGACY);
    expect(
      (await readdir(dir)).filter((name) => name.endsWith(".tmp")),
    ).toEqual([]);
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

  it("clears producer fields whenever treatment is reopened", async () => {
    const withProducer = LEGACY.replace(
      "    note: 'unknown slot field'",
      "    chosen: slope\n    producer: datawrapper\n    datawrapperType: d3-lines\n    note: 'unknown slot field'",
    );
    await writeFile(path, withProducer);
    await mutateStoryboard(path, { slot: { id: 1, fields: { chosen: null } } });
    const slot = parseStoryboard(await readFile(path, "utf8")).meta.slots[0];
    expect(slot.chosen).toBeUndefined();
    expect(slot.producer).toBeUndefined();
    expect(slot.datawrapperType).toBeUndefined();
  });
});

describe("legacy conflict handling", () => {
  it("accepts canonical-only, legacy-only, and matching dual fields", () => {
    const canonical = LEGACY.replace(
      "    genre: web\n",
      "    format: web\n",
    ).replace("    genre: static\n", "");
    const legacy = LEGACY.replace("    format: static\n", "").replace(
      "    genre: static\n",
      "",
    );

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

describe("revision-checked graphical confirmations", () => {
  it("holds one adjacent lock across the final revision check and atomic replacement", async () => {
    await writeFile(path, LEGACY);
    const expectedRevision = storyboardRevision(LEGACY);
    const result = await mutateStoryboardRevisioned(
      path,
      { slot: { id: 1, fields: { format: "static", reachable: "yes" } } },
      { expectedRevision },
    );
    expect(result.revision).toBe(
      storyboardRevision(await readFile(path, "utf8")),
    );
    expect(result.meta.slots[0]).toMatchObject({
      format: "static",
      reachable: "yes",
    });
    await expect(
      mutateStoryboardRevisioned(
        path,
        { slot: { id: 1, fields: { format: "web", reachable: "yes" } } },
        { expectedRevision },
      ),
    ).rejects.toMatchObject({ code: "REVISION_CONFLICT" });
    expect(
      parseStoryboard(await readFile(path, "utf8")).meta.slots[0].format,
    ).toBe("static");
  });

  it("never steals a live lock and reclaims only a proved abandoned same-host owner", async () => {
    await writeFile(path, LEGACY);
    const live = await acquireTargetLock(path);
    await expect(
      acquireTargetLock(path, { timeoutMs: 0 }),
    ).rejects.toMatchObject({ code: "LOCKED" });
    await live.release();

    const lockPath = `${path}.lock`;
    await mkdir(lockPath, { mode: 0o700 });
    await writeFile(
      join(lockPath, "owner.json"),
      `${JSON.stringify({
        schemaVersion: "splash-target-lock/v1",
        token: randomUUID(),
        host: hostname(),
        pid: 424242,
        createdAt: Date.now(),
      })}\n`,
      { mode: 0o600 },
    );
    const reclaimed = await acquireTargetLock(path, {
      timeoutMs: 0,
      kill(pid: number) {
        if (pid === 424242)
          throw Object.assign(new Error("gone"), { code: "ESRCH" });
        return process.kill(pid, 0);
      },
    });
    await reclaimed.release();
  });

  it("allows one winner across two separately started writers from the same revision", async () => {
    await writeFile(path, LEGACY);
    const expectedRevision = storyboardRevision(LEGACY);
    const childPath = join(import.meta.dirname, "revision-writer-child.mjs");
    const children = ["static", "web"].map((format) =>
      Bun.spawn(
        [
          process.execPath,
          "--no-env-file",
          childPath,
          path,
          expectedRevision,
          format,
        ],
        { stdin: "pipe", stdout: "pipe", stderr: "pipe" },
      ),
    );
    const readers = children.map((child) => child.stdout.getReader());
    for (const reader of readers) {
      const ready = await reader.read();
      expect(new TextDecoder().decode(ready.value)).toContain(
        '"status":"ready"',
      );
    }
    for (const child of children) {
      child.stdin.write("go\n");
      child.stdin.end();
    }
    const exits = await Promise.all(children.map((child) => child.exited));
    expect(exits.filter((code) => code === 0)).toHaveLength(1);
    expect(exits.filter((code) => code !== 0)).toHaveLength(1);
    const written = parseStoryboard(await readFile(path, "utf8"));
    expect(["static", "web"]).toContain(written.meta.slots[0].format);
  });
});
