/**
 * D1 — THE THIRD STATE, PROVEN WITH GIT ITSELF RATHER THAN WITH A CONVENTION.
 *
 * The finding, measured on a real world choropleth and measured BOTH ways: `materialise` substituted
 * the newsroom's MapTiler key into `export/<beat>/<page>.html`, which is inside the repository.
 *
 *   · With the delivered file as delivered, `splash/test/no-key-in-the-repository.test.ts` went red
 *     naming it.
 *   · With the placeholder put back by hand, `map-web/test/the-handover-agrees-about-the-key.test.ts`
 *     went red on the same file, because the hand-over said the page carried a key and it did not.
 *
 * The report concluded that "clean tree" and "no key in the repository" could not both hold and that
 * NO THIRD STATE EXISTS. It does, and the key guard's own header points at it: it scans what a
 * `git add -A` would commit, and "`--exclude-standard` means anything genuinely ignored … is still
 * out of scope, and the distinction the guard draws is between committable and not". So the delivery
 * writes two files — the RECORD with the placeholder, committable and committed; the DELIVERY with
 * the key, in a directory that ignores its own whole contents.
 *
 * WHY THIS FILE DRIVES REAL GIT. "It is ignored" is a claim about a tool, and the only honest way to
 * make it is to ask the tool. A `.gitignore` holding `*` inside an untracked directory is a rule
 * that people reason about wrongly in both directions — some believe git never reads a `.gitignore`
 * in an untracked directory, others that a directory cannot ignore the file doing the ignoring — so
 * a unit test over strings would prove the wrong thing confidently. Every assertion below is a real
 * `git status --porcelain` / `git ls-files` in a real repository built for the case.
 *
 * AND IT MUTATES ITSELF. The last case deletes the ignore file and requires the keyed page to become
 * committable. Without that, a `keyed/` directory that git happened not to notice for some other
 * reason — or an assertion reading an empty listing — would pass exactly as loudly.
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, writeFile, rm, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  materialise,
  exportDirFor,
  KEYED_DELIVERY_DIR,
} from "../scripts/deliver.mjs";
import {
  approveCurrentOutput,
  TEST_FINDING_IDS,
  TEST_PLAN_VERSION,
} from "./output-review-fixture";

// A live-shaped key: 20 URL-safe alphanumerics, the length of the one this tree's own `.env` holds,
// so the value-independent style-URL scan in `no-key-in-the-repository.test.ts` would see it.
const LIVE_KEY = "aB3dE6gH9jK2mN5pQ8rT";
const PLACEHOLDER = "__MAPTILER" + "_KEY__";
const MAP_PAGE = `<!doctype html><title>Map</title><script>fetch("https://api.maptiler.com/maps/basic/style.json?key=${PLACEHOLDER}")</script>`;

const handover = {
  language: "en",
  placement: "after the paragraph on reported deaths, article web, full width",
  alt: "A world map of what each country reported",
  credit: "Source: World Health Organization, as of 2026-08-23",
  caveat: "reported, not measured",
};

let repo: string;
let storiesRoot: string;
let beatDir: string;
let exportDir: string;

function git(...args: string[]): string {
  return execFileSync("git", args, { cwd: repo, encoding: "utf8" });
}

/** Every path a `git add -A` in this repository would sweep up: tracked, plus untracked and not
 *  ignored. The same two listings `no-key-in-the-repository.test.ts` reads. */
function committable(): string[] {
  const listing = (args: string[]) =>
    git(...args)
      .split("\0")
      .filter(Boolean);
  return [
    ...listing(["ls-files", "-z", "--", "."]),
    ...listing(["ls-files", "-z", "--others", "--exclude-standard", "--", "."]),
  ].sort();
}

beforeEach(async () => {
  repo = await mkdtemp(join(tmpdir(), "keyed-delivery-"));
  git("init", "-q");
  git("config", "user.email", "test@example.invalid");
  git("config", "user.name", "Test");
  storiesRoot = join(repo, "stories");
  beatDir = join(storiesRoot, "story", "beats", "1-map");
  await mkdir(join(beatDir, "renders"), { recursive: true });
  await writeFile(join(beatDir, "renders", "map.html"), MAP_PAGE);
  await approveCurrentOutput(beatDir);
  exportDir = exportDirFor({
    storiesRoot,
    storyId: "story",
    outputId: "1-map",
  });
});

afterEach(async () => {
  await rm(repo, { recursive: true, force: true });
});

async function deliver() {
  await materialise({
    form: "owned-file",
    format: "web",
    storiesRoot,
    storyId: "story",
    outputId: "1-map",
    env: { MAPTILER_KEY: LIVE_KEY },
    handover,
    planVersion: TEST_PLAN_VERSION,
    findingIds: TEST_FINDING_IDS,
  });
}

describe("a keyed delivery, and the repository it is written inside", () => {
  it("writes the key into a page git cannot commit, and the placeholder into the one it can", async () => {
    await deliver();
    const keyedPage = join(exportDir, KEYED_DELIVERY_DIR, "map.html");
    const record = join(exportDir, "map.html");

    // Both files are really there, and they really differ.
    expect(await readFile(keyedPage, "utf8")).toContain(`key=${LIVE_KEY}`);
    expect(await readFile(record, "utf8")).toContain(`key=${PLACEHOLDER}`);
    expect(await readFile(record, "utf8")).not.toContain(LIVE_KEY);

    // And git can see exactly one of them.
    const paths = committable();
    expect(paths).toContain("stories/story/export/1-map/map.html");
    expect(paths.filter((path) => path.includes(KEYED_DELIVERY_DIR))).toEqual(
      [],
    );
  });

  it("leaves nothing keyed in a `git add -A`, checked by adding everything and reading the index", async () => {
    await deliver();
    // The strongest form of the claim: do the thing the rule is about, then look.
    git("add", "-A");
    const staged = git("diff", "--cached", "--name-only")
      .split("\n")
      .filter(Boolean);
    expect(staged.some((path) => path.endsWith("export/1-map/map.html"))).toBe(
      true,
    );
    expect(staged.filter((path) => path.includes(KEYED_DELIVERY_DIR))).toEqual(
      [],
    );
    // No staged file carries the key. This is `no-key-in-the-repository`'s own question, asked of
    // a delivery that succeeded rather than of one that was undone by hand.
    for (const path of staged)
      expect(await readFile(join(repo, path), "utf8")).not.toContain(LIVE_KEY);
  });

  it("leaves the tree clean after the delivery, which is the other half nothing could satisfy", async () => {
    await deliver();
    git("add", "-A");
    git("commit", "-q", "-m", "the delivery");
    // "Clean tree" and "no key in the repository" now hold at the same time. Before, each one cost
    // the other.
    expect(git("status", "--porcelain").trim()).toBe("");
    expect(existsSync(join(exportDir, KEYED_DELIVERY_DIR, "map.html"))).toBe(
      true,
    );
  });

  it("says in the hand-over which copy carries the key, and never says the key", async () => {
    await deliver();
    const written = await readFile(join(exportDir, "HANDOVER.md"), "utf8");
    expect(written).toContain(`\`${KEYED_DELIVERY_DIR}/map.html\``);
    expect(written).toContain("the copy to publish");
    expect(written).toContain("It does not carry a key");
    expect(written).toContain(PLACEHOLDER);
    // The hand-over is committed beside the record. It attests to the SUBSTITUTION; it may not
    // restate what was substituted.
    expect(written).not.toContain(LIVE_KEY);
    git("add", "-A");
    expect(git("diff", "--cached", "--name-only")).toContain("HANDOVER.md");
  });

  // THE MUTATION, IN THE TEST ITSELF. Everything above passes trivially if git were ignoring the
  // directory for some reason of its own, or if the listings were empty. Take the one file that
  // does the work away, and the keyed page must become exactly the leak this closes.
  it("becomes committable again the moment its own ignore file is removed", async () => {
    await deliver();
    await rm(join(exportDir, KEYED_DELIVERY_DIR, ".gitignore"));
    const paths = committable();
    expect(paths).toContain(
      `stories/story/export/1-map/${KEYED_DELIVERY_DIR}/map.html`,
    );
    expect(
      await readFile(join(exportDir, KEYED_DELIVERY_DIR, "map.html"), "utf8"),
    ).toContain(`key=${LIVE_KEY}`);
  });
});
