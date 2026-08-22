/**
 * THE COMMITTED SKILL STORE IS A SECOND INVENTORY, AND THIS IS THE THING THAT KEEPS IT HONEST.
 *
 * `installer/place-skills.mjs` states the contract in its own header, and states the rule this file
 * exists to enforce:
 *
 *     THE SHARED SKILL STORE. Goose, Codex and Gemini all discover flat skill directories under
 *     `~/.agents/skills/`, so Splash projects exactly one symlink per shipped skill there:
 *     `~/.agents/skills/<id> → <root>/skills/<id>` … Placement is by symlink. `skillIds` discovers
 *     directories containing `SKILL.md`; THE INSTALLER NEVER MAINTAINS A SECOND HARD-CODED
 *     INVENTORY.
 *
 * `main` also committed that projection INTO the repository — fifteen symlinks under
 * `.agents/skills/`, so the checkout is itself a discoverable agent workspace. That is consistent
 * with the contract, and it is also, precisely, a second inventory: fifteen entries maintained by
 * hand where the installer derives its own list by looking for `SKILL.md`.
 *
 * Measured when this file was written: the two agree, 15 and 15. Nothing made them agree, and
 * nothing would have said so if they stopped. A sixteenth skill enters the installer's list the
 * moment it has a `SKILL.md`, and enters `.agents/skills/` only if somebody remembers.
 *
 * That is this branch's own theme — a population typed rather than derived measures nothing — in
 * the one place the project had already written the rule down and then not applied it to itself.
 *
 * WHAT THIS DOES NOT CHECK. Whether the symlink mechanism is the right one: it is the documented
 * contract (`README.md`: "projects flat skill links from that live checkout … there is no
 * post-commit skill installer or copied skill runtime"), and a symlink resolving into a live
 * checkout is why `#shared/*` works through it. That question was asked and answered by the
 * installer's own header; this file only holds the projection to the inventory it claims to be.
 */
import { describe, it, expect } from "bun:test";
import { existsSync, readdirSync, readlinkSync, statSync } from "node:fs";
import { join } from "node:path";
import { skillIds } from "../../../installer/place-skills.mjs";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const STORE = join(ROOT, ".agents", "skills");

describe("the committed .agents/skills store is the installer's own inventory, not a second one", () => {
  it("should carry exactly the skills `skillIds` discovers, no more and no fewer", () => {
    const discovered = skillIds(ROOT);
    const committed = readdirSync(STORE).sort();
    expect(committed).toEqual(discovered);
  });

  it("should place every one of them as a symlink, the way the installer does", () => {
    const notLinks = readdirSync(STORE).filter(
      (name) => !statSync(join(STORE, name), { throwIfNoEntry: false })?.isDirectory
        ? false
        : !readlinkSafely(join(STORE, name)),
    );
    // A directory copied in place of a link is the "copied skill runtime" the README says does not
    // exist; it would also go stale the moment the skill it copies changes.
    expect(notLinks).toEqual([]);
  });

  it("should point every link at the skill of the same name, and resolve", () => {
    const wrong: string[] = [];
    for (const name of readdirSync(STORE)) {
      const link = join(STORE, name);
      const target = readlinkSafely(link);
      if (target !== `../../skills/${name}`) wrong.push(`${name} -> ${target ?? "(not a symlink)"}`);
      else if (!existsSync(link)) wrong.push(`${name} -> ${target} (broken)`);
    }
    expect(wrong).toEqual([]);
  });
});

function readlinkSafely(path: string): string | null {
  try {
    return readlinkSync(path);
  } catch {
    return null;
  }
}
