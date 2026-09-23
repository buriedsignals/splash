/**
 * A SKILL THAT SPELLS A PATH ONLY A CHECKOUT HAS MUST SAY SO, IN THE SAME FILE.
 *
 * Every SKILL.md writes its commands as `bun skills/<skill>/scripts/…`, which is the path inside a
 * Splash checkout. An installed stories root is not a checkout — it vendors `shared/` and the
 * Engine projects the skills into its own namespaced store — so that path resolves to nothing.
 *
 * Measured 2026-09-23, three times independently, by three workers taking three different export
 * families through the path a new user takes. Each one's FIRST command failed the same way:
 *
 *   bun skills/map-beat/scripts/scaffold-map-video-beat.mjs …
 *   error: Module not found "skills/map-beat/scripts/scaffold-map-video-beat.mjs"
 *
 * The code had already been fixed to resolve its own root; the instructions the journalist reads
 * before running anything had not. Nothing named the projected path, so each worker had to find it
 * by reading the Engine's own source.
 *
 * The fix is one block per skill rather than 28 rewritten command lines, because the commands
 * should keep reading the way the catalogue is laid out. This holds the block's presence, not its
 * prose — a skill may reword it, and may not drop it while still shipping such a command.
 */
import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const SKILLS = join(import.meta.dirname, "..", "..");

/** `{ name, text }` for every shipped SKILL.md. */
function skillDocs(): { name: string; text: string }[] {
  return readdirSync(SKILLS, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => ({ name: e.name, path: join(SKILLS, e.name, "SKILL.md") }))
    .filter(({ path }) => existsSync(path))
    .map(({ name, path }) => ({ name, text: readFileSync(path, "utf8") }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** A command a reader is meant to type, spelled against a checkout's own layout. */
const CHECKOUT_COMMAND = /\bbun (?:test |run )?skills\//;

describe("the first command a reader runs", () => {
  it("finds the skill docs at all, so this file cannot pass by looking at nothing", () => {
    expect(skillDocs().length).toBeGreaterThanOrEqual(10);
  });

  it("is never spelled against a checkout without the file saying where else it lives", () => {
    const silent = skillDocs()
      .filter(({ text }) => CHECKOUT_COMMAND.test(text))
      .filter(({ text }) => !/Where these commands live/.test(text))
      .map(({ name }) => name);
    expect(silent).toEqual([]);
  });

  it("names the Engine's own projection, which is the path nothing else in the tree gives", () => {
    const vague = skillDocs()
      .filter(({ text }) => /Where these commands live/.test(text))
      .filter(({ text }) => !/\.agents\/skills\/splash/.test(text))
      .map(({ name }) => name);
    expect(vague).toEqual([]);
  });
});
